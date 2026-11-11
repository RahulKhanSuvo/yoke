import { ipcRenderer, type IpcRendererEvent } from 'electron'

import type {
  ApprovalResponse,
  ApprovalRequest,
  ChatSendRequest,
  ChatStreamChunk,
  ChatStreamDone,
  ChatStreamError,
  ChatStreamPart,
  ProviderId,
  ProviderStatus
} from '../../shared/ai'

/** Subscribes to a main-process event and returns an unsubscribe function. */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => listener(payload)

  ipcRenderer.on(channel, handler)

  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

export const aiApi = {
  providers: (): Promise<ProviderStatus[]> => ipcRenderer.invoke('ai:providers:list'),

  saveKey: (providerId: ProviderId, apiKey: string): Promise<{ success: true }> =>
    ipcRenderer.invoke('ai:credentials:save', providerId, apiKey),

  removeKey: (providerId: ProviderId): Promise<{ success: true }> =>
    ipcRenderer.invoke('ai:credentials:remove', providerId),

  send: (request: ChatSendRequest): Promise<{ success: boolean; messageId?: string }> =>
    ipcRenderer.invoke('ai:chat:send', request),

  cancel: (requestId: string): Promise<void> => ipcRenderer.invoke('ai:chat:cancel', requestId),

  /** Answers a bash approval dialog raised by the main process. */
  respondApproval: (response: ApprovalResponse): Promise<void> =>
    ipcRenderer.invoke('ai:approval:respond', response),

  /** Subscribe to pending tool approval requests. */
  onApprovalRequest: (listener: (payload: ApprovalRequest) => void): (() => void) =>
    subscribe('ai:approval:request', listener),

  onChunk: (listener: (payload: ChatStreamChunk) => void): (() => void) =>
    subscribe('ai:stream:chunk', listener),

  onPart: (listener: (payload: ChatStreamPart) => void): (() => void) =>
    subscribe('ai:stream:part', listener),

  onDone: (listener: (payload: ChatStreamDone) => void): (() => void) =>
    subscribe('ai:stream:done', listener),

  onError: (listener: (payload: ChatStreamError) => void): (() => void) =>
    subscribe('ai:stream:error', listener)
}
