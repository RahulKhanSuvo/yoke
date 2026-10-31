import { createOpenAI } from '@ai-sdk/openai'

export function createOpenAIModel(apiKey: string, modelId: string) {
  const provider = createOpenAI({ apiKey })

  return provider(modelId)
}
