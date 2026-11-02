import { Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import StopIcon from '@hugeicons/core-free-icons/StopIcon'
import { AgentPicker } from '@renderer/features/ai/AgentPicker'
import { ModelPicker } from '@renderer/features/ai/ModelPicker'

export interface ChatComposerProps {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  busy?: boolean
  disabled?: boolean
  onCancel?: () => void
  autofocus?: boolean
}

/**
 * Prompt box shared by the landing and session screens. Grows with the text and
 * submits on Enter (Shift+Enter inserts a newline).
 */
export function ChatComposer(props: ChatComposerProps): JSX.Element {
  const canSend = () => props.value.trim().length > 0 && !props.busy && !props.disabled

  const submit = () => {
    if (!props.value.trim() || props.disabled) return
    props.onSubmit()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()

      if (!props.busy) submit()
    }
  }

  return (
    <div class="flex flex-col rounded-xl border border-line bg-surface p-3 shadow-sm transition focus-within:border-neutral-300 focus-within:shadow-md">
      <textarea
        rows={1}
        value={props.value}
        autofocus={props.autofocus ?? true}
        placeholder="Ask anything, / for commands, @ for context..."
        class="field-sizing-content max-h-56 w-full resize-none bg-transparent text-[14px] leading-relaxed text-foreground outline-none placeholder:text-neutral-400"
        onInput={(event) => props.onValueChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <div class="mt-3 flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-1">
          <button
            type="button"
            aria-label="Add attachment"
            class="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
          </button>

          <AgentPicker />
          <ModelPicker />
        </div>

        <Show
          when={props.busy}
          fallback={
            <button
              type="button"
              aria-label="Send"
              disabled={!canSend()}
              class="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors"
              classList={{
                'bg-neutral-900 text-white hover:bg-neutral-700': canSend(),
                'bg-neutral-200 text-neutral-500': !canSend()
              }}
              onClick={submit}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
            </button>
          }
        >
          <button
            type="button"
            aria-label="Stop"
            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-700"
            onClick={props.onCancel}
          >
            <HugeiconsIcon icon={StopIcon} size={13} />
          </button>
        </Show>
      </div>
    </div>
  )
}
