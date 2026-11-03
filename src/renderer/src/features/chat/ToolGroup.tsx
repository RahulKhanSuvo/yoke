import { createEffect, createMemo, createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import GlassesIcon from '@hugeicons/core-free-icons/GlassesIcon'
import type { MessagePart } from '@shared/ai'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCallCard, toolLabel } from './ToolCallCard'

export interface ToolGroupProps {
  parts: MessagePart[]
  busy?: boolean
}

type ContextPart = Extract<MessagePart, { type: 'reasoning' | 'tool' }>

/**
 * Groups consecutive reasoning and tool parts under one "Used N …" row, the
 * way opencode collapses a turn's work. The group opens while the turn is
 * running so live tools are visible, then folds to a single line.
 */
export function ToolGroup(props: ToolGroupProps): JSX.Element {
  const [open, setOpen] = createSignal(Boolean(props.busy))
  const [userToggled, setUserToggled] = createSignal(false)

  createEffect(() => {
    if (userToggled()) return

    setOpen(Boolean(props.busy))
  })

  const contextParts = createMemo(() => props.parts as ContextPart[])
  const tools = createMemo(() => contextParts().filter((part) => part.type === 'tool'))
  const thoughts = createMemo(() => contextParts().filter((part) => part.type === 'reasoning'))
  const thinking = createMemo(() => Boolean(props.busy) && tools().length === 0 && thoughts().length > 0)

  const title = createMemo(() => {
    const names = [...new Set(tools().map((part) => toolLabel(part.name)))]

    return names.length > 0 ? formatList(names) : 'Thought'
  })

  const count = createMemo(() => tools().length || thoughts().length)

  const toggle = () => {
    setUserToggled(true)
    setOpen(!open())
  }

  return (
    <div class="flex w-full min-w-0 flex-col">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open()}
        class="relative flex h-7 w-full min-w-0 items-center gap-1 text-left text-[13px] leading-[1.4] tracking-[-0.04px]"
      >
        <HugeiconsIcon
          icon={GlassesIcon}
          size={14}
          class="pointer-events-none absolute -start-5 top-1/2 -translate-y-1/2 text-foreground-muted/60"
        />

        <span class="shrink-0 font-[440] text-foreground-muted">Used</span>
        <span class="shrink-0 font-[440] text-foreground tabular-nums">{count()}</span>
        <span
          classList={{
            'min-w-0 truncate font-[440] text-foreground': true,
            'shimmer-text': thinking()
          }}
        >
          {title()}
        </span>
        <HugeiconsIcon
          icon={open() ? ArrowDown01Icon : ArrowRight01Icon}
          size={13}
          class="shrink-0 text-foreground-muted/60"
        />
      </button>

      <Show when={open()}>
        <div class="flex flex-col gap-2 pt-1 ps-4">
          <For each={contextParts()}>
            {(part) =>
              part.type === 'reasoning' ? (
                <ThinkingBlock content={part.text} active={props.busy} />
              ) : (
                <ToolCallCard part={part} />
              )
            }
          </For>
        </div>
      </Show>
    </div>
  )
}

/** Joins tool names like opencode's list: "Shell, Read and Grep". */
function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ''

  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`
}
