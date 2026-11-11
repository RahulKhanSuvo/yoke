import { For, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import type { IconSvgElement } from '@hugeicons/solid-js'

export interface SegmentedOption<T extends string> {
  value: T
  icon: IconSvgElement
  label: string
}

export interface SegmentedControlProps<T extends string> {
  value: T
  options: Array<SegmentedOption<T>>
  onChange: (value: T) => void
  class?: string
}

/** A compact icon toggle group, like opencode's segmented controls. */
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>): JSX.Element {
  return (
    <div
      role="radiogroup"
      class={`flex items-center rounded-[7px] border border-line bg-surface-soft p-0.5 ${props.class ?? ''}`}
    >
      <For each={props.options}>
        {(option) => (
          <button
            type="button"
            role="radio"
            aria-checked={props.value === option.value}
            aria-label={option.label}
            title={option.label}
            class="flex size-6 items-center justify-center rounded-[5px] text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none"
            classList={{ 'bg-surface text-foreground shadow-xs': props.value === option.value }}
            onClick={() => props.onChange(option.value)}
          >
            <HugeiconsIcon icon={option.icon} size={13} />
          </button>
        )}
      </For>
    </div>
  )
}
