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

/** Stable color for each change marker, matching opencode's state colors. */
export function statusColor(status: ReviewFileStatus): string {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'text-diff-add-num'
    case 'deleted':
    case 'conflicted':
      return 'text-diff-del-num'
    case 'renamed':
      return 'text-info-foreground'
    default:
      return 'text-warning-foreground'
  }
}

/** The `+N −M` change counters, styled like opencode's DiffChanges. */
export function DiffStats(props: {
  additions: number
  deletions: number
  class?: string
}): JSX.Element {
  return (
    <Show when={props.additions > 0 || props.deletions > 0}>
      <span
        class={`flex shrink-0 items-center gap-2 text-[11px] font-normal leading-none tracking-[0.05px] tabular-nums ${props.class ?? ''}`}
        aria-label={`${props.additions} additions, ${props.deletions} deletions`}
      >
        <span class="text-diff-add-num">+{props.additions}</span>
        <span class="text-diff-del-num">-{props.deletions}</span>
      </span>
    </Show>
  )
}

/** A hue per file family, like the colored file-type icons in editors. */
const EXT_HUES: Record<string, string> = {
  ts: 'text-[#3178c6] bg-[#3178c6]/10',
  tsx: 'text-[#3178c6] bg-[#3178c6]/10',
  js: 'text-[#b8860b] bg-[#b8860b]/10',
  jsx: 'text-[#b8860b] bg-[#b8860b]/10',
  mjs: 'text-[#b8860b] bg-[#b8860b]/10',
  cjs: 'text-[#b8860b] bg-[#b8860b]/10',
  json: 'text-[#b8860b] bg-[#b8860b]/10',
  md: 'text-[#519aba] bg-[#519aba]/10',
  mdx: 'text-[#519aba] bg-[#519aba]/10',
  css: 'text-[#519aba] bg-[#519aba]/10',
  scss: 'text-[#f55385] bg-[#f55385]/10',
  html: 'text-[#e37933] bg-[#e37933]/10',
  py: 'text-[#3572a5] bg-[#3572a5]/10',
  rs: 'text-[#dea584] bg-[#dea584]/10',
  go: 'text-[#00add8] bg-[#00add8]/10',
  sh: 'text-[#89e051] bg-[#89e051]/10',
  yml: 'text-[#cb171e] bg-[#cb171e]/10',
  yaml: 'text-[#cb171e] bg-[#cb171e]/10',
  toml: 'text-[#9c4221] bg-[#9c4221]/10',
  lock: 'text-foreground-muted bg-surface-mute'
}

/** Tiny rounded file-type badge — the "TS"-style square in the diff header. */
export function FileExtBadge(props: { path: string; class?: string }): JSX.Element {
  const ext = (): string => props.path.split('.').pop()?.toLowerCase() ?? ''
  const hue = (): string => EXT_HUES[ext()] ?? 'text-foreground-muted bg-surface-mute'

  return (
    <span
      class={`flex size-4 shrink-0 items-center justify-center rounded-[3px] text-[8px] font-bold leading-none uppercase ${hue()} ${props.class ?? ''}`}
      aria-hidden="true"
    >
      {ext().slice(0, 3) || 'file'}
    </span>
  )
}
