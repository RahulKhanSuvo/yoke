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
  placeholder?: string
}

/**
 * Opencode-style prompt dock: a borderless editor over a 44px control row with
 * add, agent, and model on the left and send/stop on the right.
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
    <div class="flex w-full flex-col overflow-clip rounded-xl border border-line bg-surface shadow-xs transition-colors focus-within:border-foreground/20">
      <textarea
        rows={1}
        value={props.value}
        autofocus={props.autofocus ?? true}
        placeholder={props.placeholder ?? 'Ask anything, / for commands, @ for context…'}
        class="field-sizing-content max-h-56 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[13px] leading-[1.6] tracking-[-0.04px] text-foreground outline-none placeholder:text-foreground-muted/70"
        onInput={(event) => props.onValueChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <div class="flex h-11 shrink-0 items-center justify-between gap-2 px-2">
        <div class="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Add attachment"
            class="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition hover:bg-surface-mute hover:text-foreground"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} />
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
              class="flex size-7 shrink-0 items-center justify-center rounded-lg transition-all"
              classList={{
                'bg-foreground text-background hover:opacity-85 cursor-pointer': canSend(),
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
            class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-surface-mute text-foreground transition hover:bg-line"
            onClick={props.onCancel}
          >
            <HugeiconsIcon icon={StopIcon} size={13} />
          </button>
        </Show>
      </div>
    </div>
  )
}
