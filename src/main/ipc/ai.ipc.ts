import { ipcMain, type WebContents } from 'electron'

import { PROVIDERS, findModel, isProviderId } from '../ai/catalog'
import { credentialService } from '../ai/credential.service'
import { runAgent } from '../ai/agent-loop'
import { toModelMessages } from '../ai/history'
import { isAgentId } from '../../shared/agents'
import type {
  ChatSendRequest,
  ChatStreamChunk,
  ChatStreamDone,
  ChatStreamError,
  ChatStreamPart,
  MessagePart,
  ProviderStatus
} from '../../shared/ai'
import {
  appendSessionMessage,
  getSession,
  getSessionMessages,
  updateSession
} from '../services/session.service'

const activeRequests = new Map<string, AbortController>()

function send(webContents: WebContents, channel: string, payload: unknown): void {
  if (!webContents.isDestroyed()) webContents.send(channel, payload)
}

function sessionTitle(prompt: string): string {
  const title = prompt.replace(/\s+/g, ' ').trim()

  return title.length > 60 ? `${title.slice(0, 57)}…` : title
}

export function registerAIHandlers() {
  ipcMain.handle('ai:providers:list', async (): Promise<ProviderStatus[]> => {
    return Promise.all(
      PROVIDERS.map(async (provider) => {
        let configured = false

        try {
          configured = Boolean(await credentialService.get(provider.id))
        } catch {
          // A locked or unavailable keychain means no key can be used right now.
        }

        return { ...provider, configured }
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
      !findModel(providerId, modelId) ||
      !isAgentId(agentId) ||
      typeof prompt !== 'string' ||
      !prompt.trim() ||
      prompt.length > 100_000
    ) {
      throw new Error('Invalid chat request')
    }

    if (activeRequests.has(requestId)) {
      throw new Error('Request already exists')
    }

    const session = await getSession(sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    const controller = new AbortController()
    activeRequests.set(requestId, controller)

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
          signal: controller.signal
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

      await updateSession(sessionId, { status: 'idle' })

      send(event.sender, 'ai:stream:done', {
        requestId,
        messageId: message.id,
        text: result.text,
        parts: result.parts
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
      activeRequests.delete(requestId)
    }
  })

  ipcMain.handle('ai:chat:cancel', (_event, requestId: unknown) => {
    if (typeof requestId !== 'string') return

    activeRequests.get(requestId)?.abort()
  })
}
