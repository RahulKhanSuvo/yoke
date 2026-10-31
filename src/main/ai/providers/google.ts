import { createGoogleGenerativeAI } from '@ai-sdk/google'

export function createGoogleModel(apiKey: string, modelId: string) {
  const provider = createGoogleGenerativeAI({ apiKey })

  return provider(modelId)
}
