import { ipcMain, dialog, BrowserWindow, type WebContents } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

import { PROVIDERS, findModel, isProviderId } from '../ai/catalog'
import { credentialService } from '../ai/credential.service'
import { fetchProviderChatModels, fetchProviderModels } from '../ai/models-live'
import { runAgent } from '../ai/agent-loop'
import { isThinkingLevel } from '../../shared/ai'
import { getAllAppState } from '../services/app-state.service'
import { toModelMessages } from '../ai/history'
import { getApprovalGate } from '../ai/approval.service'
import { isAgentId } from '../../shared/agents'
import type {
  ApprovalResponse,
  ChatSendRequest,
  ChatStreamChunk,
  ChatStreamDone,
  ChatStreamError,
  ChatStreamPart,
  MessagePart,
  ProviderId,
  ProviderStatus
} from '../../shared/ai'
import {
  appendSessionMessage,
  addSessionUsage,
  getSession,
  getSessionMessages,
  updateSession
} from '../services/session.service'

const activeRequests = new Map<string, AbortController>()
/** The approval gate handling each in-flight chat request. */
const requestGates = new Map<string, ReturnType<typeof getApprovalGate>>()

/** Largest attachment we will read into the prompt, in bytes. */
const MAX_ATTACHMENT_BYTES = 2_000_000

/**
 * Attachments are sandboxed like tool paths: they must exist inside the
 * session's project directory, or they are dropped rather than failing the
 * whole send.
 */
function validateAttachments(value: unknown, directory: string): string[] {
  if (!Array.isArray(value)) return []

  const root = path.resolve(directory)

  return value
    .filter(
      (item): item is string =>
        typeof item === 'string' &&
        item.length > 0 &&
        item.length < 4_096 &&
        item.startsWith(root + path.sep)
    )
    .map((item) => path.resolve(item))
    .filter((item) => {
      try {
        return fs.statSync(item).isFile() && fs.statSync(item).size <= MAX_ATTACHMENT_BYTES
      } catch {
        return false
      }
    })
    .slice(0, 10)
}

/** The renderer's persisted model pick, read straight from SQLite. */
function readStoredModelPick(): { providerId: string; modelId: string } | undefined {
  try {
    const parsed = JSON.parse(getAllAppState()['yoke.ai.selected-model'] ?? '') as Partial<{
      providerId: string
      modelId: string
    }>

    if (typeof parsed.providerId !== 'string' || typeof parsed.modelId !== 'string')
      return undefined

    return { providerId: parsed.providerId, modelId: parsed.modelId }
  } catch {
    return undefined
  }
}

function isApprovalResponse(value: unknown): value is ApprovalResponse {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.requestId === 'string' &&
    typeof candidate.approvalId === 'string' &&
    (candidate.decision === 'allow' ||
      candidate.decision === 'allow-session' ||
      candidate.decision === 'deny')
  )
}

function send(webContents: WebContents, channel: string, payload: unknown): void {
  if (!webContents.isDestroyed()) webContents.send(channel, payload)
}

function sessionTitle(prompt: string): string {
  const title = prompt.replace(/\s+/g, ' ').trim()

  return title.length > 60 ? `${title.slice(0, 57)}…` : title
}

export function registerAIHandlers() {
  ipcMain.handle('ai:providers:list', async (): Promise<ProviderStatus[]> => {
    // The user's stored pick stays selectable even when a newer family
    // release curates it out of the default list.
    const storedPick = readStoredModelPick()

    return Promise.all(
      PROVIDERS.map(async (provider) => {
        let configured = false

        try {
          configured = Boolean(await credentialService.get(provider.id))
        } catch {
          // A locked or unavailable keychain means no key can be used right now.
        }

        if (!configured) return { ...provider, configured: false }

        // With a key stored, the registry reports which models exist — the
        // catalog is only the offline fallback.
        try {
          const apiKey = await credentialService.get(provider.id)
          const models = apiKey ? await fetchProviderModels(provider.id, apiKey) : undefined

          if (models && storedPick && storedPick.providerId === provider.id) {
            const present = models.some((model) => model.id === storedPick.modelId)

            if (!present) {
              const chat = await fetchProviderChatModels(provider.id, apiKey ?? '')
              const pick = chat?.find((model) => model.id === storedPick.modelId)

              if (pick) models.push(pick)
            }
          }

          return { ...provider, configured: true, ...(models ? { models } : {}) }
        } catch {
          return { ...provider, configured: true }
        }
      })
    )
  })

  ipcMain.handle(
    'ai:credentials:save',
    async (_event, providerId: unknown, apiKey: unknown): Promise<{ success: true }> => {
      if (!isProviderId(providerId) || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('Invalid provider credentials')
      }

      if (apiKey.length > 512) {
        throw new Error('API key is too long')
      }

      await credentialService.save(providerId, apiKey.trim())

      return { success: true }
    }
  )

  ipcMain.handle(
    'ai:credentials:remove',
    async (_event, providerId: unknown): Promise<{ success: true }> => {
      if (!isProviderId(providerId)) {
        throw new Error('Invalid provider')
      }

      await credentialService.remove(providerId)

      return { success: true }
    }
  )

  /** The composer's "Images and files" picker, like opencode's Ctrl+U. */
  ipcMain.handle('ai:attachments:pick', async (event): Promise<string[]> => {
    const window = BrowserWindow.fromWebContents(event.sender)

    if (!window) return []

    const result = await dialog.showOpenDialog(window, {
      title: 'Attach images and files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images and files',
          extensions: [
            'png',
            'jpg',
            'jpeg',
            'gif',
            'webp',
            'txt',
            'md',
            'json',
            'csv',
            'log',
            'ts',
            'tsx',
            'js',
            'jsx',
            'py',
            'go',
            'rs',
            'java',
            'css',
            'html',
            'yml',
            'yaml',
            'toml',
            'sh'
          ]
        }
      ]
    })

    return result.canceled ? [] : result.filePaths
  })

  /**
   * A model is sendable when the static catalog knows it or the registry lists
   * it as a chat model for that provider — the picker offers live registry
   * models, so validation must accept them too.
   */
  async function isModelAvailable(providerId: ProviderId, modelId: string): Promise<boolean> {
    if (findModel(providerId, modelId)) return true

    try {
      const apiKey = await credentialService.get(providerId)

      if (!apiKey) return false

      const chat = await fetchProviderChatModels(providerId, apiKey)

      return chat?.some((model) => model.id === modelId) ?? false
    } catch {
      return false
    }
  }

  ipcMain.handle('ai:chat:send', async (event, request: ChatSendRequest) => {
    const { requestId, sessionId, providerId, modelId, agentId, prompt } = request ?? {}

    if (
      typeof requestId !== 'string' ||
      !requestId ||
      requestId.length > 100 ||
      typeof sessionId !== 'string' ||
      !sessionId ||
      !isProviderId(providerId) ||
      typeof modelId !== 'string' ||
      !(await isModelAvailable(providerId, modelId)) ||
      !isAgentId(agentId) ||
      typeof prompt !== 'string' ||
      !prompt.trim() ||
      prompt.length > 100_000
    ) {
      throw new Error('Invalid chat request')
    }

    const thinking = isThinkingLevel(request?.thinking) ? request.thinking : 'default'

    if (activeRequests.has(requestId)) {
      throw new Error('Request already exists')
    }

    const session = await getSession(sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    const attachments = validateAttachments(request?.attachments, session.directory)

    const controller = new AbortController()
    activeRequests.set(requestId, controller)

    const approvalGate = getApprovalGate(sessionId)
    requestGates.set(requestId, approvalGate)
    // Tools only see the command; this turn's sender and id stay bound here.
    const approval = {
      request: (command: string) => approvalGate.request(event.sender, requestId, command)
    }

    // Persist the user's turn before calling the provider, so the transcript survives errors.
    await appendSessionMessage(sessionId, 'user', { text: prompt.trim() })

    if (!session.title || session.title === 'New session') {
      await updateSession(sessionId, { title: sessionTitle(prompt) })
    }

    await updateSession(sessionId, { status: 'busy' })

    let text = ''
    let liveParts: MessagePart[] = []
    let activeText: Extract<MessagePart, { type: 'text' }> | undefined

    try {
      // Rebuild model history from what is actually stored, including tool results.
      const history = toModelMessages(await getSessionMessages(sessionId))

      const result = await runAgent(
        {
          providerId,
          modelId,
          agentId,
          directory: session.directory,
          messages: history,
          thinking,
          attachments,
          signal: controller.signal,
          approval
        },
        {
          onText: (delta) => {
            text += delta

            if (!activeText) {
              activeText = { type: 'text', text: '' }
              liveParts = [...liveParts, activeText]
            }

            activeText.text += delta

            send(event.sender, 'ai:stream:chunk', {
              requestId,
              text: delta
            } satisfies ChatStreamChunk)
          },
          onPart: (part) => {
            if (part.type === 'tool') {
              activeText = undefined

              const index = liveParts.findIndex(
                (item) => item.type === 'tool' && item.toolCallId === part.toolCallId
              )

              liveParts = index >= 0 ? liveParts.with(index, part) : [...liveParts, part]
            }

            send(event.sender, 'ai:stream:part', {
              requestId,
              part
            } satisfies ChatStreamPart)
          }
        }
      )

      const message = await appendSessionMessage(sessionId, 'assistant', {
        text: result.text,
        parts: result.parts
      })

      if (result.usage.inputTokens || result.usage.outputTokens || result.usage.reasoningTokens) {
        await addSessionUsage(sessionId, result.usage)
      }

      await updateSession(sessionId, { status: 'idle' })

      send(event.sender, 'ai:stream:done', {
        requestId,
        messageId: message.id,
        text: result.text,
        parts: result.parts,
        tokens: result.usage
      } satisfies ChatStreamDone)

      return { success: true, messageId: message.id }
    } catch (error) {
      const aborted = controller.signal.aborted
      const message = error instanceof Error ? error.message : 'AI request failed'

      // Keep whatever the model produced before the failure/cancel.
      if (text || liveParts.length > 0) {
        await appendSessionMessage(sessionId, 'assistant', { text, parts: liveParts })
      }

      await updateSession(sessionId, { status: 'idle' })

      if (aborted) {
        send(event.sender, 'ai:stream:error', {
          requestId,
          message: 'Request cancelled'
        } satisfies ChatStreamError)

        return { success: false }
      }

      send(event.sender, 'ai:stream:error', {
        requestId,
        message
      } satisfies ChatStreamError)

      return { success: false }
    } finally {
      approvalGate.cancelAll()
      requestGates.delete(requestId)
      activeRequests.delete(requestId)
    }
  })

  ipcMain.handle('ai:chat:cancel', (_event, requestId: unknown) => {
    if (typeof requestId !== 'string') return

    // Deny any approval the agent is waiting on so the turn unwinds cleanly.
    requestGates.get(requestId)?.cancelAll()
    activeRequests.get(requestId)?.abort()
  })

  // The renderer answers an approval dialog raised by the bash tool.
  ipcMain.handle('ai:approval:respond', (_event, response: unknown) => {
    if (!isApprovalResponse(response)) throw new Error('Invalid approval response')

    requestGates.get(response.requestId)?.respond(response)
  })
}
