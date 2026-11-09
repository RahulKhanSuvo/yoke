import { Show, type JSX } from 'solid-js'

import type { ReviewFileStatus } from '@shared/review'

/** The single-letter change marker shown on file rows and diff headers. */
export const STATUS_LETTER: Record<ReviewFileStatus, string> = {
  added: 'A',
  untracked: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  conflicted: 'U'
}

/** Stable, light-theme color for each change marker. */
export function statusColor(status: ReviewFileStatus): string {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'text-success-foreground'
    case 'deleted':
    case 'conflicted':
      return 'text-danger'
    case 'renamed':
      return 'text-info-foreground'
    default:
      return 'text-warning-foreground'
  }
}

/** The compact `+N −M` change counters used across the Review pane. */
export function DiffStats(props: {
  additions: number
  deletions: number
  class?: string
}): JSX.Element {
  return (
    <span
      class={`flex shrink-0 items-center gap-1 text-[11px] tabular-nums ${props.class ?? ''}`}
      aria-label={`${props.additions} additions, ${props.deletions} deletions`}
    >
      <Show when={props.additions > 0}>
        <span class="text-success-foreground">+{props.additions}</span>
      </Show>
      <Show when={props.deletions > 0}>
        <span class="text-danger">−{props.deletions}</span>
      </Show>
    </span>
  )
}
