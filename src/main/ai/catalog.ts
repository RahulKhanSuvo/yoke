import type { ModelInfo, ProviderId, ProviderInfo } from '../../shared/ai'

export type { ModelInfo, ProviderId, ProviderInfo } from '../../shared/ai'

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    popular: true,
    name: 'Anthropic',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
    ]
  },
  {
    id: 'openai',
    popular: true,
    name: 'OpenAI',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3-mini', name: 'o3-mini' }
    ]
  },
  {
    id: 'google',
    popular: true,
    name: 'Google Gemini',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
    ]
  }
]

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && PROVIDERS.some((provider) => provider.id === value)
}

export function findProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((provider) => provider.id === id)
}

export function findModel(providerId: ProviderId, modelId: string): ModelInfo | undefined {
  return findProvider(providerId)?.models.find((model) => model.id === modelId)
}
