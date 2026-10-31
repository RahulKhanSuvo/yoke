import { streamText } from 'ai'

import { resolveModel } from './model-resolver'
import type { ProviderId } from './catalog'

interface GenerateOptions {
  providerId: ProviderId
  modelId: string
  prompt: string
}

export async function generateText(
  options: GenerateOptions,
  onChunk: (text: string) => void,
  signal?: AbortSignal
) {
  const model = await resolveModel(options.providerId, options.modelId)

  const result = streamText({
    model,
    prompt: options.prompt,
    abortSignal: signal
  })

  for await (const chunk of result.textStream) {
    onChunk(chunk)
  }
}
