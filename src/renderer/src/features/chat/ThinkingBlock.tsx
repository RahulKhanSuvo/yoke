import { createSignal, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import AiBrain01Icon from '@hugeicons/core-free-icons/AiBrain01Icon'
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'

export interface ThinkingBlockProps {
  content: string
  active?: boolean
}

/**
 * A compact reasoning row, matching opencode's "Thought" line. Collapsed by
 * default; the text expands underneath in muted body type.
 */
export function ThinkingBlock(props: ThinkingBlockProps): JSX.Element {
  const [open, setOpen] = createSignal(false)

  return (
    <div class="flex w-full min-w-0 flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open())}
        aria-expanded={open()}
        class="flex h-7 w-full min-w-0 items-center gap-2 text-left text-[13px] leading-[1.4]"
      >
        <HugeiconsIcon icon={AiBrain01Icon} size={14} class="shrink-0 text-foreground-muted/70" />

        <span
          classList={{
            'font-[530] tracking-[-0.04px] text-foreground': true,
            'shimmer-text': props.active
          }}
        >
          {props.active ? 'Thinking' : 'Thought'}
        </span>

        <HugeiconsIcon
          icon={open() ? ArrowDown01Icon : ArrowRight01Icon}
          size={13}
          class="ml-auto shrink-0 text-foreground-muted/60"
        />
      </button>

      <Show when={open()}>
        <div class="mt-1 mb-1 ms-5 whitespace-pre-wrap wrap-break-word text-[13px] leading-[1.55] text-foreground-muted">
          {props.content}
        </div>
      </Show>
    </div>
  )
}
