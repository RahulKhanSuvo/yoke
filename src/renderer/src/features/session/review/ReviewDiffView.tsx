import { createEffect, createMemo, createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'
import ChevronRightIcon from '@hugeicons/core-free-icons/ChevronRightIcon'
import type { ReviewFileDiff } from '@shared/review'
import {
  collapseContext,
  toSplitRows,
  type ReviewDiffGap,
  type ReviewDiffLine,
  type ReviewSplitRow
} from './review-diff'

export type ReviewDiffStyle = 'unified' | 'split'

export interface ReviewDiffViewProps {
  value: ReviewFileDiff | undefined
  loading: boolean
  lines: ReviewDiffLine[]
  /** How to lay the diff out: one column or side by side. */
  style: ReviewDiffStyle
  /** True while unchanged context lines hide behind expandable gap rows. */
  collapsed: boolean
}

type DisplayRow = ReviewDiffLine | ReviewSplitRow | ReviewDiffGap

const isGap = (row: DisplayRow): row is ReviewDiffGap =>
  (row as ReviewDiffGap).type === 'gap'

/** The scrollable diff body under the preview toolbar. */
export function ReviewDiffView(props: ReviewDiffViewProps): JSX.Element {
  const splitRows = createMemo(() => toSplitRows(props.lines))
  const displayRows = createMemo<DisplayRow[]>(() =>
    props.style === 'split'
      ? props.collapsed
        ? collapseContext(splitRows())
        : splitRows()
      : props.collapsed
        ? collapseContext(props.lines)
        : [...props.lines]
  )

  return (
    <Show
      when={props.value?.binary}
      fallback={
        <Show
          when={props.lines.length > 0}
          fallback={
            <div class="flex h-full items-center justify-center pb-12 text-[12px] text-foreground-muted">
              {props.loading ? 'Loading diff…' : 'No text changes'}
            </div>
          }
        >
          <Show when={props.style === 'split'} fallback={<UnifiedBody {...props} rows={displayRows()} />}>
            <SplitBody {...props} rows={displayRows()} />
          </Show>
        </Show>
      }
    >
      <div class="flex h-full flex-col items-center justify-center gap-2 pb-12 text-center">
        <HugeiconsIcon icon={FileDiffIcon} size={22} class="text-foreground-muted/50" />
        <div class="text-[12.5px] text-foreground-muted">Binary file — diff not shown</div>
      </div>
    </Show>
  )
}

interface BodyProps {
  value: ReviewFileDiff | undefined
  rows: DisplayRow[]
}

/** Renders gap rows as expandable "N unchanged lines" entries, in place. */
function WithGaps(props: {
  rows: DisplayRow[]
  render: (row: ReviewDiffLine | ReviewSplitRow, index: number) => JSX.Element
}): JSX.Element {
  const [expanded, setExpanded] = createSignal<Set<number>>(new Set())

  // A new diff, layout, or collapse state invalidates remembered expansions.
  createEffect(() => {
    void props.rows
    setExpanded(new Set<number>())
  })

  const expand = (index: number) => {
    setExpanded((previous) => new Set<number>(previous).add(index))
  }

  return (
    <For each={props.rows}>
      {(row, index) =>
        isGap(row) ? (
          <Show
            when={!expanded().has(index())}
            fallback={
              <For each={row.hidden}>{(inner) => props.render(inner, index())}</For>
            }
          >
            <button
              type="button"
              class="flex w-full items-center gap-1.5 px-3 py-0.5 text-left text-[10.5px] text-foreground-muted transition-colors hover:bg-surface-mute hover:text-foreground"
              onClick={() => expand(index())}
            >
              <HugeiconsIcon icon={ChevronRightIcon} size={10} />
              <span class="shrink-0">{row.count} unchanged lines</span>
            </button>
          </Show>
        ) : (
          props.render(row as ReviewDiffLine | ReviewSplitRow, index())
        )
      }
    </For>
  )
}

/** The single-column layout with horizontal scrolling, as before. */
function UnifiedBody(props: BodyProps): JSX.Element {
  return (
    <div class="min-w-max pb-8 font-mono text-[11.5px] leading-[18px] text-foreground">
      <WithGaps rows={props.rows} render={(row) => <DiffRow line={row as ReviewDiffLine} />} />
      <Show when={props.value?.truncated}>
        <div class="bg-surface-mute/60 px-3 py-1.5 text-[10.5px] text-foreground-muted">
          Diff truncated — this file is too large to show in full.
        </div>
      </Show>
    </div>
  )
}

/** The opencode-style side-by-side layout with paired old/new cells. */
function SplitBody(props: BodyProps): JSX.Element {
  return (
    <div class="pb-8 font-mono text-[11.5px] leading-[18px] text-foreground">
      <WithGaps rows={props.rows} render={(row) => <SplitRow row={row as ReviewSplitRow} />} />
      <Show when={props.value?.truncated}>
        <div class="bg-surface-mute/60 px-3 py-1.5 text-[10.5px] text-foreground-muted">
          Diff truncated — this file is too large to show in full.
        </div>
      </Show>
    </div>
  )
}

function SplitRow(props: { row: ReviewSplitRow }): JSX.Element {
  const row = props.row

  if (row.type === 'hunk') {
    return (
      <div class="bg-surface-mute/70 px-3 py-0.5 text-[10.5px] text-foreground-muted">{row.text}</div>
    )
  }

  if (row.type === 'meta') {
    return (
      <div class="flex bg-surface text-[10.5px] text-foreground-muted/70">
        <span class="w-1/2 whitespace-pre px-2 italic">{row.text}</span>
        <span class="w-1/2" />
      </div>
    )
  }

  return (
    <div class="flex min-w-0">
      <SplitCell cell={row.old} side="old" />
      <SplitCell cell={row.new} side="new" />
    </div>
  )
}

function SplitCell(props: {
  cell: { kind: string; text: string; line?: number } | undefined
  side: 'old' | 'new'
}): JSX.Element {
  const kind = () => props.cell?.kind
  const background = () =>
    kind() === 'del' ? 'bg-error/70' : kind() === 'add' ? 'bg-success/70' : 'bg-surface'

  return (
    <div
      class={`flex min-w-0 basis-1/2 ${props.side === 'old' ? 'border-r border-line/40' : ''} ${background()}`}
    >
      <span class="w-10 shrink-0 select-none border-r border-line/40 pr-1.5 text-right text-[10px] text-foreground-muted/60">
        {props.cell?.line ?? ''}
      </span>
      <span
        class="w-4 shrink-0 select-none text-center"
        classList={{
          'text-success-foreground': kind() === 'add',
          'text-danger': kind() === 'del',
          'text-foreground-muted/40': kind() === 'context' || !kind()
        }}
        aria-hidden="true"
      >
        {kind() === 'del' ? '−' : kind() === 'add' ? '+' : ' '}
      </span>
      <span class="min-w-0 flex-1 whitespace-pre-wrap break-all pr-2">
        {props.cell?.text || ' '}
      </span>
    </div>
  )
}

/** One rendered unified line: two line-number gutters plus the code. */
function DiffRow(props: { line: ReviewDiffLine }): JSX.Element {
  const line = props.line

  if (line.kind === 'hunk') {
    return (
      <div class="min-w-max bg-surface-mute/70 px-3 py-0.5 text-[10.5px] text-foreground-muted">
        {line.text}
      </div>
    )
  }

  if (line.kind === 'meta') {
    return (
      <div class="flex min-w-max bg-surface text-[10.5px] text-foreground-muted/70">
        <span class="w-[81px] shrink-0" />
        <span class="whitespace-pre px-2 italic">{line.text}</span>
      </div>
    )
  }

  const sign = line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '

  return (
    <div
      class="flex min-w-max"
      classList={{
        'bg-success/70': line.kind === 'add',
        'bg-error/70': line.kind === 'del',
        'bg-surface': line.kind === 'context'
      }}
    >
      <span class="sticky left-0 z-10 w-10 shrink-0 select-none border-r border-line/40 bg-inherit pr-1.5 text-right text-[10px] text-foreground-muted/60">
        {line.oldLine ?? ''}
      </span>
      <span class="sticky left-10 z-10 w-10 shrink-0 select-none border-r border-line/40 bg-inherit pr-1.5 text-right text-[10px] text-foreground-muted/60">
        {line.newLine ?? ''}
      </span>
      <span
        class="w-4 shrink-0 select-none text-center"
        classList={{
          'text-success-foreground': line.kind === 'add',
          'text-danger': line.kind === 'del',
          'text-foreground-muted/40': line.kind === 'context'
        }}
        aria-hidden="true"
      >
        {sign}
      </span>
      <span class="whitespace-pre pr-6">{line.text || ' '}</span>
    </div>
  )
}
