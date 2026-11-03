import type {
  AssistantContent,
  ModelMessage,
  TextPart,
  ToolCallPart,
  ToolResultPart
} from 'ai'

import type { MessagePart } from '../../shared/ai'
import type { SessionMessage } from '../services/session.service'

type AssistantParts = Extract<AssistantContent, unknown[]>
type AssistantReasoningPart = Extract<AssistantParts[number], { type: 'reasoning' }>

/**
 * Converts the persisted transcript into AI SDK messages.
 *
 * Assistant turns keep their tool calls so the model can see what it already
 * ran (and their results) on the next request.
 */
export function toModelMessages(messages: SessionMessage[]): ModelMessage[] {
  const result: ModelMessage[] = []

  for (const message of messages) {
    const data = message.data

    if (!data) continue

    if (message.type === 'user') {
      result.push({ role: 'user', content: data.text })
      continue
    }

    const parts: MessagePart[] = data.parts ?? [{ type: 'text', text: data.text }]
    const content: AssistantParts = []
    const toolResults: ToolResultPart[] = []

    for (const part of parts) {
      if (part.type === 'text') {
        if (part.text) {
          content.push({
            type: 'text',
            text: part.text,
            ...(part.providerMetadata
              ? { providerOptions: part.providerMetadata as TextPart['providerOptions'] }
              : {})
          })
        }

        continue
      }

      if (part.type === 'reasoning') {
        if (part.text) {
          content.push({
            type: 'reasoning',
            text: part.text,
            ...(part.providerMetadata
              ? { providerOptions: part.providerMetadata as AssistantReasoningPart['providerOptions'] }
              : {})
          })
        }

        continue
      }

      content.push({
        type: 'tool-call',
        toolCallId: part.toolCallId,
        toolName: part.name,
        input: part.input,
        ...(part.providerMetadata
          ? { providerOptions: part.providerMetadata as ToolCallPart['providerOptions'] }
          : {})
      })

      if (part.status === 'running') continue

      toolResults.push({
        type: 'tool-result',
        toolCallId: part.toolCallId,
        toolName: part.name,
        output:
          part.status === 'error'
            ? { type: 'error-text', value: part.error ?? 'Tool failed' }
            : { type: 'text', value: part.output ?? '' }
      })
    }

    if (content.length > 0) result.push({ role: 'assistant', content })
    if (toolResults.length > 0) result.push({ role: 'tool', content: toolResults })
  }

  return result
}
