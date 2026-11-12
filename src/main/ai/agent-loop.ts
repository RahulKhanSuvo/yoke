import { stepCountIs, streamText, type ModelMessage, type UserContent } from 'ai'
import path from 'node:path'
import fs from 'node:fs'

import type { AgentId, MessagePart, ProviderId, ThinkingLevel, ToolName } from '../../shared/ai'
import type { AgentUsage } from '../../shared/ai'

import { systemPrompt } from './agents'
import { resolveModel } from './model-resolver'
import { buildTools } from './tools'
import type { ApprovalRequester } from './approval.service'
import { findAgent } from '../../shared/agents'

const MAX_OUTPUT = 20_000

/** Anthropic thinking budget per level; max_tokens must stay above it. */
const ANTHROPIC_BUDGET = { low: 4_096, medium: 8_192, high: 16_384, max: 32_768 } as const

/** Text files are truncated when inlined into the prompt. */
const MAX_INLINE_FILE_CHARS = 50_000

const IMAGE_MEDIA: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp'
}

/**
 * Attached files become part of the user turn: images as real image parts,
 * text files inlined as fenced context, like opencode's attachments.
 */
function attachmentsToContent(
  prompt: string,
  attachments: string[],
  directory: string
): UserContent {
  const parts: UserContent = [{ type: 'text', text: prompt }]

  for (const file of attachments) {
    const mediaType = IMAGE_MEDIA[path.extname(file).slice(1).toLowerCase()]

    if (mediaType) {
      parts.push({ type: 'image', image: new Uint8Array(fs.readFileSync(file)), mediaType })
      continue
    }

    const relative = path.relative(directory, file)

    parts.push({
      type: 'text',
      text: `<file path="${relative}">\n${fs.readFileSync(file, 'utf8').slice(0, MAX_INLINE_FILE_CHARS)}\n</file>`
    })
  }

  return parts
}

/** Swaps the just-persisted prompt turn for one that carries the attachments. */
function withAttachments(
  messages: ModelMessage[],
  attachments: string[] | undefined,
  directory: string
): ModelMessage[] {
  if (!attachments?.length) return messages

  const last = messages[messages.length - 1]

  if (!last || last.role !== 'user' || typeof last.content !== 'string') return messages

  return [
    ...messages.slice(0, -1),
    { role: 'user', content: attachmentsToContent(last.content, attachments, directory) }
  ]
}

/**
 * Per-provider extended-thinking options, like opencode's reasoning variants.
 * Each level maps onto the knobs the provider actually exposes.
 */
function thinkingOptions(
  providerId: ProviderId,
  level: Exclude<ThinkingLevel, 'default'>
): NonNullable<Parameters<typeof streamText>[0]['providerOptions']> {
  switch (providerId) {
    case 'anthropic':
      return {
        anthropic: { thinking: { type: 'enabled', budgetTokens: ANTHROPIC_BUDGET[level] } }
      }
    case 'openai':
      // o-series tops out at xhigh; max clamps to it.
      return { openai: { reasoningEffort: level === 'max' ? 'xhigh' : level } }
    case 'openrouter':
      return { openrouter: { reasoningEffort: level === 'max' ? 'xhigh' : level } }
    case 'google':
      // Gemini understands minimal/low/medium/high; max clamps to high.
      return {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: level === 'max' ? 'high' : level
          }
        }
      }
  }
}

export interface AgentRunOptions {
  providerId: ProviderId
  modelId: string
  agentId: AgentId
  /** The session's project root; tools resolve every path inside it. */
  directory: string
  messages: ModelMessage[]
  /** Extended-thinking level; "default" keeps the provider's own behavior. */
  thinking?: ThinkingLevel
  /** Files and images attached through the composer, sandboxed to `directory`. */
  attachments?: string[]
  signal?: AbortSignal
  /** When set, bash commands wait for user approval before running. */
  approval?: ApprovalRequester
}

export interface AgentCallbacks {
  /** Called for every streamed text delta. */
  onText: (delta: string) => void
  /** Called when a tool call starts or finishes. */
  onPart: (part: MessagePart) => void
}

export interface AgentResult {
  text: string
  parts: MessagePart[]
  /** Provider token usage summed across every step of the loop. */
  usage: AgentUsage
}

type ToolPart = Extract<MessagePart, { type: 'tool' }>
type TextPart = Extract<MessagePart, { type: 'text' }>
type ReasoningPart = Extract<MessagePart, { type: 'reasoning' }>

function stringify(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)

  if (!text) return ''

  return text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}\n… (truncated)` : text
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Runs one assistant turn as an agent loop.
 *
 * `streamText` owns the loop: it calls the model, executes the tools the model
 * asks for, feeds the results back, and repeats until the model answers without
 * a tool call or the agent's step budget is exhausted. This function turns that
 * stream into renderer-friendly parts and returns the final transcript.
 */
export async function runAgent(
  options: AgentRunOptions,
  callbacks: AgentCallbacks
): Promise<AgentResult> {
  const agent = findAgent(options.agentId)
  const model = await resolveModel(options.providerId, options.modelId)

  const thinking =
    options.thinking !== undefined && options.thinking !== 'default' ? options.thinking : undefined

  const result = streamText({
    model,
    system: systemPrompt(agent.id, options.directory),
    messages: withAttachments(options.messages, options.attachments, options.directory),
    tools: buildTools(options.directory, agent.tools, options.approval),
    stopWhen: stepCountIs(agent.steps),
    abortSignal: options.signal,
    ...(thinking
      ? {
          providerOptions: thinkingOptions(options.providerId, thinking),
          // Anthropic needs max_tokens above the thinking budget.
          ...(options.providerId === 'anthropic'
            ? { maxOutputTokens: ANTHROPIC_BUDGET[thinking] + MAX_OUTPUT }
            : {})
        }
      : {})
  })

  const parts: MessagePart[] = []
  const toolParts = new Map<string, ToolPart>()
  const reasoningParts = new Map<string, ReasoningPart>()
  let text = ''
  let activeText: TextPart | undefined
  const usage: AgentUsage = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 }

  for await (const event of result.fullStream) {
    switch (event.type) {
      case 'reasoning-start': {
        // A thought is its own block; following text starts a new paragraph.
        activeText = undefined

        const part: ReasoningPart = {
          type: 'reasoning',
          text: '',
          ...(event.providerMetadata ? { providerMetadata: event.providerMetadata } : {})
        }

        reasoningParts.set(event.id, part)
        parts.push(part)
        callbacks.onPart({ ...part })
        break
      }

      case 'reasoning-delta': {
        const part = reasoningParts.get(event.id)

        if (!part) break

        part.text += event.text
        if (event.providerMetadata) part.providerMetadata = event.providerMetadata
        callbacks.onPart({ ...part })
        break
      }

      case 'reasoning-end': {
        const part = reasoningParts.get(event.id)

        if (!part) break

        if (event.providerMetadata) {
          part.providerMetadata = event.providerMetadata
          callbacks.onPart({ ...part })
        }

        break
      }

      case 'text-delta': {
        text += event.text
        activeText ??= pushText(parts)
        activeText.text += event.text
        if (event.providerMetadata) activeText.providerMetadata = event.providerMetadata
        callbacks.onText(event.text)
        break
      }

      case 'tool-call': {
        // Text after a tool call belongs to a new paragraph of the turn.
        activeText = undefined

        const part: ToolPart = {
          type: 'tool',
          toolCallId: event.toolCallId,
          name: event.toolName as ToolName,
          input: event.input,
          status: 'running',
          providerMetadata: event.providerMetadata
        }

        toolParts.set(event.toolCallId, part)
        parts.push(part)
        callbacks.onPart({ ...part })
        break
      }

      case 'tool-result': {
        const part = toolParts.get(event.toolCallId)

        if (!part) break

        part.status = 'completed'
        part.output = stringify(event.output)
        callbacks.onPart({ ...part })
        break
      }

      case 'tool-error': {
        const part = toolParts.get(event.toolCallId)

        if (!part) break

        part.status = 'error'
        part.error = errorMessage(event.error)
        callbacks.onPart({ ...part })
        break
      }

      case 'error': {
        throw event.error instanceof Error ? event.error : new Error(String(event.error))
      }

      case 'finish': {
        // Each assistant step reports its usage; the loop may run several.
        usage.inputTokens += event.totalUsage.inputTokens ?? 0
        usage.outputTokens += event.totalUsage.outputTokens ?? 0
        usage.reasoningTokens += event.totalUsage.outputTokenDetails?.reasoningTokens ?? 0
        break
      }
    }
  }

  return { text, parts, usage }
}

function pushText(parts: MessagePart[]): TextPart {
  const part: TextPart = { type: 'text', text: '' }

  parts.push(part)

  return part
}
