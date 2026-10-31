import type { LanguageModel } from 'ai'

import type { ProviderId } from './catalog'
import { credentialService } from './credential.service'

import { createOpenAIModel } from './providers/openai'
import { createGoogleModel } from './providers/google'
import { createAnthropicModel } from './providers/anthropic'

export async function resolveModel(
  providerId: ProviderId,
  modelId: string
): Promise<LanguageModel> {
  const apiKey = await credentialService.get(providerId)

  if (!apiKey) {
    throw new Error(`${providerId} API key is not configured`)
  }

  switch (providerId) {
    case 'openai':
      return createOpenAIModel(apiKey, modelId)

    case 'google':
      return createGoogleModel(apiKey, modelId)

    case 'anthropic':
      return createAnthropicModel(apiKey, modelId)

    default: {
      const unsupported: never = providerId
      throw new Error(`Unsupported provider: ${unsupported}`)
    }
  }
}
