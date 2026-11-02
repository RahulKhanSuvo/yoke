import {
  createEffect,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX
} from 'solid-js'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { PixelText } from '@renderer/components/ui/PixelText'
import { ChatComposer } from '@renderer/features/chat/ChatComposer'
import { ChatMessageRow, type ChatMessageView } from '@renderer/features/chat/ChatMessageRow'
import { ProjectMeta } from '@renderer/features/chat/ProjectMeta'
import { aiStore } from '@renderer/features/ai/ai-store'
import { notifyProjectsChanged } from '@renderer/features/projects/project-events'
import { closeSessionTab, openSessionTab } from '@renderer/features/session/session-tabs'
import type { MessagePart } from '@shared/ai'

export default function SessionView(): JSX.Element {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const sessionId = () => params.sessionId

  const [session, { refetch: refetchSession }] = createResource(sessionId, (id) =>
    window.api.sessions.get(id)
  )

  const [history, { refetch: refetchHistory }] = createResource(sessionId, (id) =>
    window.api.sessions.messages(id)
  )

  const [messages, setMessages] = createSignal<ChatMessageView[]>([])
  const [draft, setDraft] = createSignal('')
  const [streamingText, setStreamingText] = createSignal('')
  const [streamingParts, setStreamingParts] = createSignal<MessagePart[]>([])
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string>()

  let scrollArea: HTMLDivElement | undefined
  let activeRequestId: string | undefined
  let autoSent = false

  const hasConversation = () =>
    messages().length > 0 || busy() || streamingText().length > 0 || streamingParts().length > 0

  const resetStream = () => {
    setStreamingText('')
    setStreamingParts([])
  }

  /** Append a text delta, continuing the current text part or starting a new one. */
  const appendTextPart = (delta: string) => {
    setStreamingText((previous) => previous + delta)
    setStreamingParts((previous) => {
      const last = previous[previous.length - 1]

      if (last?.type === 'text') {
        return [...previous.slice(0, -1), { type: 'text', text: last.text + delta }]
      }

      return [...previous, { type: 'text', text: delta }]
    })
  }

  /** Create or update the tool part for a tool call. */
  const upsertToolPart = (part: MessagePart) => {
    if (part.type !== 'tool') return

    setStreamingParts((previous) => {
      const index = previous.findIndex(
        (item) => item.type === 'tool' && item.toolCallId === part.toolCallId
      )

      return index >= 0
        ? previous.map((item, position) => (position === index ? part : item))
        : [...previous, part]
    })
  }

  const scrollToBottom = () => {
    queueMicrotask(() => {
      scrollArea?.scrollTo({ top: scrollArea.scrollHeight })
    })
  }

  // Opening a session from anywhere (tree, home, URL) adds it to the sidebar tabs.
  createEffect(() => {
    const value = session()

    if (!value) return

    openSessionTab({
      id: value.id,
      title: value.title,
      projectId: value.projectId,
      projectName: value.project.name,
      directory: value.directory
    })
  })

  // A direct link to a deleted session should not leave a dead tab behind.
  createEffect(() => {
    const id = sessionId()

    if (!id || session.loading) return

    if (session() === null) {
      closeSessionTab(id)
      navigate('/')
    }
  })

  // Mirror the persisted transcript into local state whenever it is (re)loaded.
  createEffect(() => {
    const rows = history()

    if (!rows) return

    setMessages(
      rows.map((row) => ({
        id: row.id,
        role: row.type === 'user' ? 'user' : 'assistant',
        text: row.data?.text ?? '',
        parts: row.data?.parts
      }))
    )
  })

  // Reset transient state when the route moves to another session.
  createEffect(() => {
    sessionId()
    setMessages([])
    setBusy(false)
    resetStream()
    setError()
    setDraft('')
    activeRequestId = undefined
  })

  createEffect(() => {
    messages().length
    streamingText()
    streamingParts()
    busy()
    if (hasConversation()) scrollToBottom()
  })

  onMount(() => {
    const offChunk = window.api.ai.onChunk((payload) => {
      if (payload.requestId !== activeRequestId) return

      appendTextPart(payload.text)
    })

    const offPart = window.api.ai.onPart((payload) => {
      if (payload.requestId !== activeRequestId) return

      upsertToolPart(payload.part)
    })

    const offDone = window.api.ai.onDone((payload) => {
      if (payload.requestId !== activeRequestId) return

      activeRequestId = undefined
      setMessages((previous) => [
        ...previous,
        {
          id: payload.messageId,
          role: 'assistant',
          text: payload.text,
          parts: payload.parts
        }
      ])
      resetStream()
      setBusy(false)
      void refetchSession()
      // The session title and ordering may have changed; refresh the sidebar.
      notifyProjectsChanged()
    })

    const offError = window.api.ai.onError((payload) => {
      if (payload.requestId !== activeRequestId) return

      activeRequestId = undefined
      resetStream()
      setBusy(false)

      if (payload.message !== 'Request cancelled') {
        setError(payload.message)
      }

      // The main process persists partial output before reporting the error.
      void refetchHistory()
    })

    onCleanup(() => {
      offChunk()
      offPart()
      offDone()
      offError()
    })
  })

  const sendMessage = async () => {
    const prompt = draft().trim()
    const id = sessionId()
    const model = aiStore.selectedModel()

    if (!prompt || !id || busy()) return

    if (!model) {
      setError(
        aiStore.hasConfiguredProvider()
          ? 'Select a model before sending.'
          : 'Connect an AI provider in Settings before sending.'
      )

      return
    }

    setError()
    setDraft('')
    setMessages((previous) => [
      ...previous,
      { id: `local-${crypto.randomUUID()}`, role: 'user', text: prompt }
    ])
    resetStream()
    setBusy(true)

    const requestId = crypto.randomUUID()
    activeRequestId = requestId

    try {
      const result = await window.api.ai.send({
        requestId,
        sessionId: id,
        providerId: model.providerId,
        modelId: model.modelId,
        agentId: aiStore.selectedAgent().id,
        prompt
      })

      if (!result.success && activeRequestId === requestId) {
        activeRequestId = undefined
        setBusy(false)
        resetStream()
      }
    } catch (cause) {
      if (activeRequestId !== requestId) return

      activeRequestId = undefined
      setBusy(false)
      resetStream()
      setError(cause instanceof Error ? cause.message : 'Could not send the message')
      // Re-sync with the database in case the turn was rejected before being stored.
      void refetchHistory()
    }
  }

  const cancel = () => {
    if (activeRequestId) void window.api.ai.cancel(activeRequestId)
  }

  // A prompt handed over from the landing page: send it once the transcript is ready.
  createEffect(() => {
    const prompt = typeof searchParams.prompt === 'string' ? searchParams.prompt : undefined
    const rows = history()
    const providers = aiStore.providers()

    if (!prompt || autoSent || !rows || rows.length > 0 || providers === undefined) return

    autoSent = true
    setDraft(prompt)
    setSearchParams({}, { replace: true })

    queueMicrotask(() => {
      setDraft(prompt)
      void sendMessage()
    })
  })

  const composer = () => (
    <ChatComposer
      value={draft()}
      onValueChange={setDraft}
      onSubmit={() => void sendMessage()}
      busy={busy()}
      onCancel={cancel}
    />
  )

  const meta = () => (
    <Show when={session()?.project}>
      {(project) => <ProjectMeta name={project().name} path={project().rootPath} />}
    </Show>
  )

  return (
    <div class="flex h-full flex-col bg-surface-soft">
      <header class="flex h-11 shrink-0 items-center gap-2 border-b border-line/70 px-4">
        <span class="truncate text-[13px] font-medium text-neutral-800">
          {session()?.title ?? 'Session'}
        </span>
        <Show when={session()?.project}>
          {(project) => <span class="truncate text-[12px] text-neutral-400">{project().name}</span>}
        </Show>
      </header>

      <Show
        when={hasConversation()}
        fallback={
          <div class="flex flex-1 flex-col items-center justify-center gap-8 px-8">
            <PixelText text="yoke" pixel={14} class="text-neutral-200" />

            <div class="flex w-full max-w-180 flex-col gap-3">
              {composer()}
              {meta()}
              <ConnectHint />
              <Show when={error()}>
                {(message) => <p class="px-1 text-[12.5px] text-danger">{message()}</p>}
              </Show>
            </div>
          </div>
        }
      >
        <div class="flex min-h-0 flex-1 flex-col">
          <div ref={scrollArea} class="min-h-0 flex-1 overflow-y-auto">
            <div class="mx-auto flex w-full max-w-180 flex-col gap-5 px-8 py-8">
              <For each={messages()}>{(message) => <ChatMessageRow message={message} />}</For>

              <Show when={busy()}>
                <ChatMessageRow
                  message={{
                    id: 'stream',
                    role: 'assistant',
                    text: streamingText(),
                    parts: streamingParts()
                  }}
                  streaming
                />
              </Show>

              <Show when={error()}>
                {(message) => (
                  <div class="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">
                    {message()}
                  </div>
                )}
              </Show>
            </div>
          </div>

          <div class="shrink-0 px-8 pb-4">
            <div class="mx-auto flex w-full max-w-180 flex-col gap-3">
              {composer()}
              {meta()}
              <ConnectHint />
            </div>
          </div>
        </div>
      </Show>
    </div>
  )

  function ConnectHint(): JSX.Element {
    return (
      <Show when={!aiStore.providers.loading && !aiStore.hasConfiguredProvider()}>
        <button
          type="button"
          class="px-1 text-left text-[12.5px] text-neutral-500 transition hover:text-neutral-800"
          onClick={() => navigate('/settings')}
        >
          Connect an AI provider to start chatting →
        </button>
      </Show>
    )
  }
}
