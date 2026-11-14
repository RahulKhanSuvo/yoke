import { For, Show, createEffect, createSignal, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import BubbleChatIcon from '@hugeicons/core-free-icons/BubbleChatIcon'
import CheckIcon from '@hugeicons/core-free-icons/CheckIcon'
import ChevronDownIcon from '@hugeicons/core-free-icons/ChevronDownIcon'
import { Button } from '@renderer/components/ui/button'
import { makeEventListener } from '@solid-primitives/event-listener'
import type { QuestionRequest } from '@shared/ai'

export interface QuestionDialogProps {
  question: QuestionRequest | undefined
  /** Called once per shown prompt; the dock closes itself afterwards. */
  onAnswer: (answers: string[]) => void
}

/**
 * An opencode-style question dock: instead of a modal, the agent's question
 * sits above the composer while the turn waits. Number keys pick options,
 * Enter submits, Escape dismisses.
 */
export function QuestionDialog(props: QuestionDialogProps): JSX.Element {
  const [picked, setPicked] = createSignal<string[]>([])
  const [minimized, setMinimized] = createSignal(false)

  // A new question starts with a fresh selection and an expanded body.
  createEffect(() => {
    void props.question
    setPicked([])
    setMinimized(false)
  })

  const multiple = () => props.question?.multiple === true

  const pick = (label: string) => {
    setPicked((previous) =>
      multiple()
        ? previous.includes(label)
          ? previous.filter((item) => item !== label)
          : [...previous, label]
        : [label]
    )
  }

  const submit = () => {
    const answers = picked()

    if (answers.length === 0) return

    setPicked([])
    props.onAnswer(answers)
  }

  const dismiss = () => {
    setPicked([])
    props.onAnswer([])
  }

  // While the dock is up, keys act on it — the agent is paused anyway.
  makeEventListener(
    document,
    'keydown',
    (event) => {
      if (!props.question) return

      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()

        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        submit()

        return
      }

      if (/^[1-9]$/.test(event.key)) {
        const option = props.question.options[Number(event.key) - 1]

        if (option) {
          event.preventDefault()
          pick(option.label)
        }
      }
    },
    { capture: true }
  )

  return (
    <Show when={props.question}>
      {(question) => (
        <div class="rounded-lg border border-line bg-surface shadow-sm">
          {/* Header: title, minimize grabber. */}
          <div class="flex min-h-7 items-center justify-between gap-3 px-3 pt-2 pb-1">
            <span class="flex min-w-0 items-center gap-1.5 text-[13px] font-[440] text-foreground-muted">
              <HugeiconsIcon
                icon={BubbleChatIcon}
                size={13}
                class="shrink-0 text-foreground-muted/70"
              />
              <span class="truncate">{question().header?.trim() || 'Question'}</span>
            </span>

            <button
              type="button"
              aria-label={minimized() ? 'Restore question' : 'Minimize question'}
              class="flex size-5 shrink-0 items-center justify-center rounded text-foreground-muted transition hover:text-foreground"
              onClick={() => setMinimized(!minimized())}
            >
              <HugeiconsIcon
                icon={ChevronDownIcon}
                size={13}
                classList={{ 'rotate-180 transition-transform': minimized() }}
              />
            </button>
          </div>

          {/* Question text and the key hint. */}
          <div class="px-3 pb-1.5">
            <p
              class="text-[13px] leading-normal font-[530] text-foreground"
              classList={{
                'line-clamp-3': minimized()
              }}
            >
              {question().question}
            </p>

            <Show when={!minimized()}>
              <p class="mt-1 text-[11px] leading-[1.35] text-foreground-muted/60">
                {multiple()
                  ? 'Choose one or more answers, then press Enter to submit. Press 1-9 to select quickly.'
                  : 'Choose an answer, then press Enter to submit. Press 1-9 to select quickly.'}
              </p>
            </Show>
          </div>

          {/* Options: numbered keys, radio for one answer, checkbox for many. */}
          <Show when={!minimized()}>
            <div class="max-h-64 overflow-y-auto px-1.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div class="flex flex-col gap-0.5">
                <For each={question().options}>
                  {(option, index) => (
                    <button
                      type="button"
                      role={multiple() ? 'checkbox' : 'radio'}
                      aria-checked={picked().includes(option.label)}
                      class="flex w-full items-start gap-2 rounded-md px-1.5 py-2 text-left transition"
                      classList={{
                        'bg-primary/[0.07]': picked().includes(option.label),
                        'hover:bg-surface-mute/60': !picked().includes(option.label)
                      }}
                      onClick={() => pick(option.label)}
                    >
                      <span
                        class="mt-0.5 flex size-[18px] shrink-0 items-center justify-center text-[11px] leading-none font-[530] tabular-nums"
                        classList={{
                          'rounded-full bg-surface-mute text-foreground-muted shadow-[inset_0_0_0_0.5px_var(--color-line)]':
                            !multiple(),
                          'rounded-[4px] bg-transparent text-foreground-muted shadow-[inset_0_0_0_1px_var(--color-line)]':
                            multiple() && !picked().includes(option.label),
                          'bg-primary text-white': picked().includes(option.label)
                        }}
                      >
                        <Show
                          when={multiple() && picked().includes(option.label)}
                          fallback={<span>{index() + 1}</span>}
                        >
                          <HugeiconsIcon icon={CheckIcon} size={11} />
                        </Show>
                      </span>

                      <span class="min-w-0 flex-1">
                        <span class="block text-[13px] leading-[1.45] font-[530] break-words text-foreground">
                          {option.label}
                        </span>

                        <Show when={option.description}>
                          <span class="mt-0.5 block text-[13px] leading-[1.45] font-[440] break-words text-foreground-muted">
                            {option.description}
                          </span>
                        </Show>
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Footer: dismiss on the left, submit on the right. */}
          <div class="flex items-center justify-between gap-2 border-t border-line/70 px-3 py-2">
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Dismiss <span class="ml-1 text-[10.5px] text-foreground-muted/60">Esc</span>
            </Button>

            <Button size="sm" disabled={picked().length === 0} onClick={submit}>
              {multiple() && picked().length > 1 ? `Submit (${picked().length})` : 'Submit'}
              <span class="ml-1 text-[10.5px] opacity-60">↵</span>
            </Button>
          </div>
        </div>
      )}
    </Show>
  )
}
