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
 * OpenCode styled bottom prompt dock.
 * Supports auto-expansion, agent & model selector pills, and key command triggers.
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
    <div class="flex flex-col rounded-2xl border border-line bg-surface p-3 shadow-xs transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
      <textarea
        rows={1}
        value={props.value}
        autofocus={props.autofocus ?? true}
        placeholder="Plan, code, run commands... (@ for context, / for tools)"
        class="field-sizing-content max-h-56 w-full resize-none bg-transparent px-1 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-foreground-muted/60"
        onInput={(event) => props.onValueChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <div class="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-line/40">
        <div class="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Add attachment"
            class="flex size-7 items-center justify-center rounded-lg text-foreground-muted transition hover:bg-surface-mute hover:text-foreground"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} />
          </button>

          <AgentPicker />
          <ModelPicker />
        </div>

        <div class="flex items-center gap-2">
          <span class="hidden sm:inline-block text-[11px] text-foreground-muted/60 select-none">
            ↵ send
          </span>

          <Show
            when={props.busy}
            fallback={
              <button
                type="button"
                aria-label="Send"
                disabled={!canSend()}
                class="flex size-7.5 shrink-0 items-center justify-center rounded-xl transition-all"
                classList={{
                  'bg-primary text-primary-foreground hover:opacity-90 shadow-xs cursor-pointer': canSend(),
                  'bg-surface-mute text-foreground-muted/40 cursor-not-allowed': !canSend()
                }}
                onClick={submit}
              >
                <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
              </button>
            }
          >
            <button
              type="button"
              aria-label="Stop generation"
              class="flex size-7.5 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger transition-all hover:bg-danger/20 cursor-pointer"
              onClick={props.onCancel}
            >
              <HugeiconsIcon icon={StopIcon} size={14} />
            </button>
          </Show>
        </div>
      </div>
    </div>
  )
}
