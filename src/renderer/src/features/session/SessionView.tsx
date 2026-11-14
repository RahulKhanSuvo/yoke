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
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import MoreVerticalIcon from '@hugeicons/core-free-icons/MoreVerticalIcon'
import PanelRightIcon from '@hugeicons/core-free-icons/PanelRightIcon'
import { ChatComposer } from '@renderer/features/chat/ChatComposer'
import { ChatMessageRow, type ChatMessageView } from '@renderer/features/chat/ChatMessageRow'
import { ApprovalDialog } from '@renderer/features/chat/ApprovalDialog'
import { IconButton } from '@renderer/components/ui/IconButton'
import { PixelText } from '@renderer/components/ui/PixelText'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  ReviewSidePanel,
  ensureSideTab,
  reopenClosedTab
} from '@renderer/features/session/review/ReviewSidePanel'
import { UsageRing } from '@renderer/features/session/UsageRing'
import { aiStore } from '@renderer/features/ai/ai-store'
import { projectColor } from '@renderer/features/projects/project-color'
import { notifyProjectsChanged } from '@renderer/features/projects/project-events'
import { getAppState, setAppState } from '@renderer/lib/app-state'
import { useSidebar } from '@renderer/context/sidebar-state'
import { closeSessionTab, openSessionTab } from '@renderer/features/session/session-tabs'
import type { ApprovalDecision, ApprovalRequest, MessagePart } from '@shared/ai'

const REVIEW_OPEN_KEY = 'yoke.review-open'

function readReviewOpen(): boolean {
  return getAppState(REVIEW_OPEN_KEY) === 'true'
}

export default function SessionView(): JSX.Element {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sidebar = useSidebar()

  const sessionId = () => params.sessionId

  const [session, { refetch: refetchSession }] = createResource(sessionId, (id) =>
    window.api.sessions.get(id)
  )

  const [history, { refetch: refetchHistory }] = createResource(sessionId, (id) =>
    window.api.sessions.messages(id)
  )

  const [messages, setMessages] = createSignal<ChatMessageView[]>([])
  const [draft, setDraft] = createSignal('')
  /** Files and images staged through the composer's + menu, sent with the next turn. */
  const [attachments, setAttachments] = createSignal<string[]>([])
  const [streamingText, setStreamingText] = createSignal('')
  const [streamingParts, setStreamingParts] = createSignal<MessagePart[]>([])
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string>()
  /** Tokens accumulated on the session, for the header's context ring. */
  const [tokens, setTokens] = createSignal(0)
  const [reviewOpen, setReviewOpen] = createSignal(readReviewOpen())
  /** A bash command the agent is waiting for the user to approve. */
  const [pendingApproval, setPendingApproval] = createSignal<ApprovalRequest>()
  /** Bumped after a turn so the Review panel reloads the files the agent touched. */
  const [reviewRefresh, setReviewRefresh] = createSignal(0)

  createEffect(() => {
    setAppState(REVIEW_OPEN_KEY, String(reviewOpen()))
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
    setPendingApproval()
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
    const offApproval = window.api.ai.onApprovalRequest((payload) => {
      if (payload.requestId !== activeRequestId) return

      setPendingApproval(payload)
    })

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
      setPendingApproval()
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
      setPendingApproval()

      if (payload.message !== 'Request cancelled') {
        setError(payload.message)
      }

      // The main process persists partial output before reporting the error.
      void refetchHistory()
      setReviewRefresh((value) => value + 1)
    })

    onCleanup(() => {
      offApproval()
      offChunk()
      offPart()
      offDone()
      offError()
    })

    // Open the side panel straight to a tab, like opencode's panel shortcuts:
    // review.toggle (Ctrl Alt R), browser (B), terminal (T), files (F).
    makeEventListener(document, 'keydown', (event) => {
      // Reopen the most recently closed side tab, like opencode's file.tab.reopen.
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        event.key.toLowerCase() === 't'
      ) {
        const id = sessionId()

        if (!id) return

        event.preventDefault()
        reopenClosedTab(id)
        setReviewOpen(true)

        return
      }

      if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) return

      const key = event.key.toLowerCase()
      const kind =
        key === 'r'
          ? 'review'
          : key === 'b'
            ? 'browser'
            : key === 't'
              ? 'terminal'
              : key === 'f'
                ? 'files'
                : undefined

      if (!kind || event.defaultPrevented) return

      const id = sessionId()

      if (!id) return

      event.preventDefault()
      ensureSideTab(id, kind)
      setReviewOpen(true)
    })
  })

  const sendMessage = async () => {
    const prompt = draft().trim()
    const id = sessionId()
    const model = aiStore.selectedModel()

    if (!prompt && attachments().length === 0) return
    if (!id || busy()) return

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
    const attached = [...attachments()]
    setAttachments([])
    setMessages((previous) => [
      ...previous,
      {
        id: `local-${crypto.randomUUID()}`,
        role: 'user',
        text: attached.length
          ? `${prompt}${prompt ? '\n' : ''}${attached.map((file) => `[attached: ${file.split('/').pop()}]`).join(' ')}`
          : prompt
      }
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
        thinking: aiStore.thinking(),
        attachments: attached,
        prompt: prompt || 'Review the attached files.'
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

  /** Answers the approval dialog; the main process resumes or fails the tool. */
  const decideApproval = (decision: ApprovalDecision) => {
    const approval = pendingApproval()

    if (!approval) return

    setPendingApproval()
    void window.api.ai.respondApproval({
      requestId: approval.requestId,
      approvalId: approval.approvalId,
      decision
    })
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
      attachments={attachments()}
      onRemoveAttachment={(file) =>
        setAttachments((current) => current.filter((item) => item !== file))
      }
      onAttachFiles={() => {
        void window.api.ai.pickAttachments().then((files) => {
          if (files.length) setAttachments((current) => [...new Set([...current, ...files])])
        })
      }}
      onInsertPrefix={(prefix) => {
        const current = draft()

        if (current.trim() === '' || current.endsWith(' ')) setDraft(`${current}${prefix}`)
        else setDraft(`${current} ${prefix}`)
      }}
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

  const deleteCurrentSession = async (): Promise<void> => {
    const id = sessionId()

    if (!id) return

    await window.api.sessions.delete(id)
    closeSessionTab(id)
    notifyProjectsChanged()
    navigate('/')
  }

  return (
    <div class="flex h-full bg-surface">
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex h-12 shrink-0 items-center gap-2 px-4">
          {/* The floating collapsed toggle floats here, so the header keeps its room and pushes its contents along,
              like opencode's `CollapsedSidebarToggleSpace`. */}
          <div
            aria-hidden="true"
            class="h-full shrink-0 transition-[width] duration-200 ease-in-out"
            style={{ width: sidebar.collapsed() ? '30px' : '0px' }}
          />
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

          <DropdownMenu>
            <DropdownMenuTrigger
              class="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-foreground-muted transition hover:bg-surface-mute hover:text-foreground focus-visible:outline-none"
              aria-label="Session options"
            >
              <HugeiconsIcon icon={MoreVerticalIcon} size={14} />
            </DropdownMenuTrigger>

            <DropdownMenuContent class="min-w-40">
              <DropdownMenuItem
                class="text-[12.5px] text-danger"
                onSelect={() => void deleteCurrentSession()}
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} />
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

        <div class="flex min-h-0 flex-1 flex-col">
          <Show
            when={hasConversation()}
            fallback={
              <div class="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-24">
                <div class="flex w-full max-w-186 flex-col gap-3">
                  {/* The quiet wordmark over an empty session, like opencode's centered start view. */}
                  <PixelText
                    text="yoke"
                    pixel={20}
                    class="justify-center pb-6 text-foreground-muted/40"
                  />
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
      </div>

      {/* The Review pane mirrors opencode's right-side session panel. */}
      <Show when={reviewOpen() ? session()?.directory : undefined}>
        {(directory) => (
          <ReviewSidePanel
            sessionId={sessionId() ?? ''}
            directory={directory()}
            refreshKey={reviewRefresh()}
            onClose={() => setReviewOpen(false)}
          />
        )}
      </Show>

      <ApprovalDialog approval={pendingApproval()} onDecide={decideApproval} />
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
