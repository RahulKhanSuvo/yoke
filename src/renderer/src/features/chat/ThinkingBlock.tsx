import { createSignal, createEffect, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import AiSparklesIcon from '@hugeicons/core-free-icons/AiSparklesIcon'
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'

export interface ThinkingBlockProps {
  content: string
  active?: boolean
}

export function ThinkingBlock(props: ThinkingBlockProps): JSX.Element {
  const [open, setOpen] = createSignal(Boolean(props.active))

  // While active, keep open; when finished, can collapse
  createEffect(() => {
    if (props.active) {
      setOpen(true)
    }
  })

  return (
    <div class="my-2 overflow-hidden rounded-xl border border-line/70 bg-surface-soft/60">
      <button
        type="button"
        onClick={() => setOpen(!open())}
        class="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-[12.5px] transition hover:bg-surface-mute/50"
      >
        <div class="flex items-center gap-2">
          <HugeiconsIcon
            icon={AiSparklesIcon}
            size={14}
            class={`shrink-0 transition-colors ${
              props.active ? 'text-primary animate-pulse' : 'text-foreground-muted'
            }`}
          />
          <span class="font-medium text-foreground-secondary">
            {props.active ? 'Thinking…' : 'Thought process'}
          </span>
          <Show when={props.active}>
            <span class="size-1.5 animate-ping rounded-full bg-primary" />
          </Show>
        </div>

        <HugeiconsIcon
          icon={open() ? ArrowDown01Icon : ArrowRight01Icon}
          size={14}
          class="shrink-0 text-foreground-muted"
        />
      </button>

      <Show when={open()}>
        <div class="border-t border-line/60 bg-surface/50 px-3.5 py-2.5 text-[12px] leading-relaxed text-foreground-muted italic whitespace-pre-wrap">
          {props.content}
        </div>
      </Show>
    </div>
  )
}
