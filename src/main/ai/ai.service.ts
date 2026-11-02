import { streamText, type ModelMessage } from 'ai'

import { resolveModel } from './model-resolver'
import type { ProviderId } from '../../shared/ai'

interface StreamChatOptions {
  providerId: ProviderId
  modelId: string
  messages: ModelMessage[]
}

/** Streams an assistant reply for the given conversation history. */
export async function streamChat(
  options: StreamChatOptions,
  onChunk: (text: string) => void,
  signal?: AbortSignal
) {
  const model = await resolveModel(options.providerId, options.modelId)

  const result = streamText({
    model,
    messages: options.messages,
    abortSignal: signal
  })

  for await (const chunk of result.textStream) {
    onChunk(chunk)
  }
}
