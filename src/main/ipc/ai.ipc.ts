import { ipcMain } from 'electron'

import { credentialService } from '../ai/credential.service'
import { PROVIDERS, type ProviderId } from '../ai/catalog'
import { generateText } from '../ai/ai.service'

const activeRequests = new Map<string, AbortController>()

const isProviderId = (value: unknown): value is ProviderId =>
  typeof value === 'string' && PROVIDERS.some((provider) => provider.id === value)

export function registerAIHandlers() {
  ipcMain.handle('ai:providers:list', () => PROVIDERS)

  ipcMain.handle('ai:credentials:save', async (_event, providerId: unknown, apiKey: unknown) => {
    if (!isProviderId(providerId) || typeof apiKey !== 'string') {
      throw new Error('Invalid provider credentials')
    }

    if (!apiKey.trim()) {
      throw new Error('API key cannot be empty')
    }

    await credentialService.save(providerId, apiKey.trim())

    return { success: true }
  })

  ipcMain.handle('ai:credentials:remove', async (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) {
      throw new Error('Invalid provider')
    }

    await credentialService.remove(providerId)

    return { success: true }
  })

  ipcMain.handle(
    'ai:generate',
    async (
      event,
      request: {
        requestId: string
        providerId: ProviderId
        modelId: string
        prompt: string
      }
    ) => {
      const { requestId, providerId, modelId, prompt } = request

      if (
        typeof requestId !== 'string' ||
        requestId.length > 100 ||
        !isProviderId(providerId) ||
        typeof modelId !== 'string' ||
        modelId.length > 150 ||
        typeof prompt !== 'string' ||
        !prompt.trim() ||
        prompt.length > 100_000
      ) {
        throw new Error('Invalid AI request')
      }

      if (activeRequests.has(requestId)) {
        throw new Error('Request already exists')
      }

      const controller = new AbortController()
      activeRequests.set(requestId, controller)

      try {
        await generateText(
          { providerId, modelId, prompt },
          (text) => {
            if (!event.sender.isDestroyed()) {
              event.sender.send('ai:stream:chunk', {
                requestId,
                text
              })
            }
          },
          controller.signal
        )

        if (!event.sender.isDestroyed()) {
          event.sender.send('ai:stream:complete', { requestId })
        }

        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI request failed'

        if (!event.sender.isDestroyed()) {
          event.sender.send('ai:stream:error', {
            requestId,
            message
          })
        }

        throw new Error(message)
      } finally {
        activeRequests.delete(requestId)
      }
    }
  )

  ipcMain.handle('ai:cancel', (_event, requestId: unknown) => {
    if (typeof requestId !== 'string') return

    activeRequests.get(requestId)?.abort()
  })
}
