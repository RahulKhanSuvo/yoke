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
import { makeEventListener } from '@solid-primitives/event-listener'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import PanelRightIcon from '@hugeicons/core-free-icons/PanelRightIcon'
import { ChatComposer } from '@renderer/features/chat/ChatComposer'
import { ChatMessageRow, type ChatMessageView } from '@renderer/features/chat/ChatMessageRow'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  ReviewSidePanel,
  markReviewTabOpen
} from '@renderer/features/session/review/ReviewSidePanel'
import { UsageRing } from '@renderer/features/session/UsageRing'
import { aiStore } from '@renderer/features/ai/ai-store'
import { projectColor } from '@renderer/features/projects/project-color'
import { notifyProjectsChanged } from '@renderer/features/projects/project-events'
import { closeSessionTab, openSessionTab } from '@renderer/features/session/session-tabs'
import type { MessagePart } from '@shared/ai'

const REVIEW_OPEN_KEY = 'yoke.review-open'

function readReviewOpen(): boolean {
  try {
    return localStorage.getItem(REVIEW_OPEN_KEY) === 'true'
  } catch {
    return false
  }
}

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
  /** Tokens accumulated on the session, for the header's context ring. */
  const [tokens, setTokens] = createSignal(0)
  const [reviewOpen, setReviewOpen] = createSignal(readReviewOpen())
  /** Bumped after a turn so the Review panel reloads the files the agent touched. */
  const [reviewRefresh, setReviewRefresh] = createSignal(0)

  createEffect(() => {
    try {
      localStorage.setItem(REVIEW_OPEN_KEY, String(reviewOpen()))
    } catch {
      // Persisting the panel state is best-effort.
    }
  })

  let scrollArea: HTMLDivElement | undefined
  let activeRequestId: string | undefined
  let autoSent = false

  const hasConversation = () =>
    messages().length > 0 || busy() || streamingText().length > 0 || streamingParts().length > 0

  // Track the persisted token totals; a finished turn refetches the session.
  createEffect(() => {
    const data = session()

    if (!data) return

    setTokens((data.tokens_input ?? 0) + (data.tokens_output ?? 0) + (data.tokens_reasoning ?? 0))
  })

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

  /**
   * Create or update a streamed tool or reasoning part. Tool parts are matched
   * by call id; reasoning snapshots replace the reasoning block they extend.
   */
  const upsertPart = (part: MessagePart) => {
    if (part.type === 'tool') {
      setStreamingParts((previous) => {
        const index = previous.findIndex(
          (item) => item.type === 'tool' && item.toolCallId === part.toolCallId
        )

        return index >= 0
          ? previous.map((item, position) => (position === index ? part : item))
          : [...previous, part]
      })

      return
    }

    if (part.type !== 'reasoning') return

    setStreamingParts((previous) => {
      const last = previous[previous.length - 1]

      return last?.type === 'reasoning' ? [...previous.slice(0, -1), part] : [...previous, part]
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

      upsertPart(payload.part)
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
      setTokens((previous) => {
        const usage = payload.tokens

        if (!usage) return previous

        return previous + usage.inputTokens + usage.outputTokens + usage.reasoningTokens
      })
      void refetchSession()
      // The turn may have edited files in the working tree.
      setReviewRefresh((value) => value + 1)
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
      setReviewRefresh((value) => value + 1)
    })

    onCleanup(() => {
      offChunk()
      offPart()
      offDone()
      offError()
    })

    // Open the side panel straight to the Review tab, like opencode's review.toggle.
    makeEventListener(document, 'keydown', (event) => {
      if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) return

      if (event.key.toLowerCase() !== 'r' || event.defaultPrevented) return

      event.preventDefault()
      markReviewTabOpen()
      setReviewOpen(true)
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
      placeholder={
        hasConversation()
          ? 'Add follow-up, / for commands, @ for context…'
          : 'Ask anything, / for commands, @ for context…'
      }
    />
  )

  // While the model is producing visible text, the text itself is the progress
  // signal; otherwise show opencode's "Working" row under the turn.
  const showWorking = () => {
    if (!busy()) return false

    const last = streamingParts()[streamingParts().length - 1]

    return !(last?.type === 'text' && last.text.trim())
  }

  // Consecutive prompts read as one run, like opencode: tight between bubbles,
  // roomy before the assistant's answer.
  const rowSpacing = (index: number) => {
    if (index === 0) return undefined

    const current = messages()[index]
    const previous = messages()[index - 1]

    return current?.role === 'user' && previous?.role === 'user' ? 'mt-1' : 'mt-4'
  }

  return (
    <div class="flex h-full flex-col bg-surface">
      <header class="flex h-12 shrink-0 items-center gap-2 px-4">
        <Show when={session()?.project}>
          {(project) => (
            <>
              <span
                class={`flex size-5 shrink-0 items-center justify-center rounded-[5px] ${projectColor(project().id)}`}
              >
                <HugeiconsIcon icon={Folder01Icon} size={12} />
              </span>
              <span class="min-w-0 truncate text-[13px] tracking-[-0.04px] text-foreground-muted">
                {project().name}
              </span>
              <span class="shrink-0 text-[13px] text-foreground-muted/40">/</span>
            </>
          )}
        </Show>

        <span class="min-w-0 truncate text-[13px] font-medium tracking-[-0.04px] text-foreground">
          {session()?.title ?? 'Session'}
        </span>

        <span class="ml-auto flex shrink-0 items-center gap-2 pl-3">
          <UsageRing
            tokens={tokens}
            contextWindow={() => aiStore.selectedModelInfo()?.model.contextWindow}
          />
          <IconButton
            label={reviewOpen() ? 'Hide review panel' : 'Show review panel'}
            aria-pressed={reviewOpen()}
            class="p-1 text-foreground-muted hover:bg-surface-mute hover:text-foreground"
            onClick={() => setReviewOpen((value) => !value)}
          >
            <HugeiconsIcon
              icon={PanelRightIcon}
              size={16}
              class={reviewOpen() ? 'text-foreground' : undefined}
            />
          </IconButton>
        </span>
      </header>

      <div class="flex min-h-0 flex-1">
        <div class="flex min-w-0 flex-1 flex-col">
          <Show
            when={hasConversation()}
            fallback={
              <div class="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-24">
                <div class="flex w-full max-w-186 flex-col gap-3">
                  {composer()}
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
                <div class="mx-auto flex w-full max-w-186 flex-col px-6 pt-4 pb-6">
                  <For each={messages()}>
                    {(message, index) => (
                      <div class={rowSpacing(index())}>
                        <ChatMessageRow message={message} />
                      </div>
                    )}
                  </For>

                  <Show when={busy()}>
                    <div class={messages().length > 0 ? 'mt-4' : undefined}>
                      <ChatMessageRow
                        message={{
                          id: 'stream',
                          role: 'assistant',
                          text: streamingText(),
                          parts: streamingParts()
                        }}
                        streaming
                      />
                    </div>
                  </Show>

                  <Show when={showWorking()}>
                    <div class="mt-1 flex h-9 items-center gap-2 text-[13px] font-[530] leading-[1.4] tracking-[-0.04px]">
                      <span class="shimmer-text">Working</span>
                    </div>
                  </Show>

                  <Show when={error()}>
                    {(message) => (
                      <div class="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">
                        {message()}
                      </div>
                    )}
                  </Show>
                </div>
              </div>

              <div class="shrink-0 px-3 pb-4">
                <div class="mx-auto flex w-full max-w-186 flex-col gap-3">
                  {composer()}
                  <ConnectHint />
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* The Review pane mirrors opencode's right-side session panel. */}
        <Show when={reviewOpen() ? session()?.directory : undefined}>
          {(directory) => (
            <ReviewSidePanel
              directory={directory()}
              refreshKey={reviewRefresh()}
              onClose={() => setReviewOpen(false)}
            />
          )}
        </Show>
      </div>
    </div>
  )

  function ConnectHint(): JSX.Element {
    return (
      <Show when={!aiStore.providers.loading && !aiStore.hasConfiguredProvider()}>
        <button
          type="button"
          class="px-1 text-left text-[12.5px] text-foreground-muted transition hover:text-foreground"
          onClick={() => navigate('/settings')}
        >
          Connect an AI provider to start chatting →
        </button>
      </Show>
    )
  }
}
