import { createAnthropic } from '@ai-sdk/anthropic'

export function createAnthropicModel(apiKey: string, modelId: string) {
  const provider = createAnthropic({ apiKey })

  return provider(modelId)
}
