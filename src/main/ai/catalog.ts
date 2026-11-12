import type { ModelInfo, ProviderId, ProviderInfo } from '../../shared/ai'

export type { ModelInfo, ProviderId, ProviderInfo } from '../../shared/ai'

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    popular: true,
    name: 'Anthropic',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200_000,
        reasoning: true
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextWindow: 200_000,
        reasoning: true
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        contextWindow: 200_000,
        reasoning: true
      },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200_000 }
    ]
  },
  {
    id: 'openai',
    popular: true,
    name: 'OpenAI',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1_047_576 },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', contextWindow: 1_047_576 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128_000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128_000 },
      { id: 'o3-mini', name: 'o3-mini', contextWindow: 200_000, reasoning: true }
    ]
  },
  {
    id: 'openrouter',
    popular: true,
    name: 'OpenRouter',
    apiKeyUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', contextWindow: 128_000 },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet (OpenRouter)',
        contextWindow: 200_000
      },
      {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro (OpenRouter)',
        contextWindow: 1_048_576,
        reasoning: true
      }
    ]
  },
  {
    id: 'google',
    popular: true,
    name: 'Google Gemini',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1_048_576, reasoning: true },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1_048_576,
        reasoning: true
      },
      {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash Lite',
        contextWindow: 1_048_576,
        reasoning: true
      },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1_048_576 }
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
