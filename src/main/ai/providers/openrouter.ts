import { createOpenAI } from '@ai-sdk/openai'

export function createOpenRouterModel(apiKey: string, modelId: string) {
  const provider = createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    name: 'openrouter',
  })

  return provider(modelId)
}
