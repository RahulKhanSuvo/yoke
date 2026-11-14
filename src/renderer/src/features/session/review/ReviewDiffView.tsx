import { createEffect, createMemo, createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
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

const isGap = (row: DisplayRow): row is ReviewDiffGap => (row as ReviewDiffGap).type === 'gap'

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
          <Show
            when={props.style === 'split'}
            fallback={<UnifiedBody {...props} rows={displayRows()} />}
          >
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
            fallback={<For each={row.hidden}>{(inner) => props.render(inner, index())}</For>}
          >
            <button
              type="button"
              class="flex w-full items-center gap-1 bg-diff-hunk-bg py-0.5 pl-3 text-left text-[11px] tracking-[-0.04px] text-foreground-muted transition-colors hover:text-foreground"
              onClick={() => expand(index())}
            >
              <span class="sticky left-0 z-10 flex h-5 w-[88px] shrink-0 items-center justify-center bg-diff-hunk-gutter">
                <HugeiconsIcon icon={ArrowRight01Icon} size={11} />
              </span>
              <span class="shrink-0">Expand {row.count} hidden lines</span>
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
    <div class="min-w-max pb-8 font-mono text-[12px] leading-6 text-foreground">
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
    <div class="pb-8 font-mono text-[12px] leading-6 text-foreground">
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
    return <HunkRow text={row.text} />
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
  const added = () => kind() === 'add'
  const removed = () => kind() === 'del'

  return (
    <div
      class="flex min-w-0 basis-1/2"
      classList={{
        'bg-diff-add-bg': added(),
        'bg-diff-del-bg': removed(),
        'bg-surface': !added() && !removed(),
        'border-r border-line/40': props.side === 'old'
      }}
    >
      <span
        class="sticky left-0 z-10 flex w-10 shrink-0 select-none items-center justify-end border-r border-line/40 pr-2 text-[11px] tabular-nums"
        classList={{
          'bg-diff-add-bg text-diff-add-num': added(),
          'bg-diff-del-bg text-diff-del-num': removed(),
          'bg-surface text-foreground-muted/50': !added() && !removed()
        }}
      >
        <Show when={added() || removed()}>
          <span
            class="absolute left-0 top-0 h-full w-0.5"
            classList={{ 'bg-diff-add-bar': added(), 'bg-diff-del-bar': removed() }}
          />
        </Show>
        {props.cell?.line ?? ''}
      </span>
      <span class="min-w-0 flex-1 whitespace-pre-wrap break-all pl-2 pr-2">
        {props.cell?.text || ' '}
      </span>
    </div>
  )
}

/** opencode's hunk separator: tinted content band with a sticky, stronger gutter cell. */
function HunkRow(props: { text: string }): JSX.Element {
  return (
    <div class="flex bg-diff-hunk-bg text-[11px] tracking-[-0.04px] text-foreground-muted">
      <span class="sticky left-0 z-10 h-6 w-[88px] shrink-0 bg-diff-hunk-gutter" />
      <span class="flex h-6 items-center whitespace-pre pl-2">{props.text}</span>
    </div>
  )
}

/** One rendered unified line: two line-number gutters plus the code. */
function DiffRow(props: { line: ReviewDiffLine }): JSX.Element {
  const line = props.line

  if (line.kind === 'hunk') {
    return <HunkRow text={line.text} />
  }

  if (line.kind === 'meta') {
    return (
      <div class="flex min-w-max bg-surface text-[10.5px] text-foreground-muted/70">
        <span class="w-[88px] shrink-0" />
        <span class="whitespace-pre px-2 italic">{line.text}</span>
      </div>
    )
  }

  const added = () => line.kind === 'add'
  const removed = () => line.kind === 'del'

  return (
    <div
      class="flex min-w-max"
      classList={{
        'bg-diff-add-bg': added(),
        'bg-diff-del-bg': removed(),
        'bg-surface': !added() && !removed()
      }}
    >
      <span
        class="sticky left-0 z-10 flex w-10 shrink-0 select-none items-center justify-end border-r border-line/40 pr-2 text-[11px] tabular-nums"
        classList={{
          'bg-diff-add-bg text-diff-add-num': added(),
          'bg-diff-del-bg text-diff-del-num': removed(),
          'bg-surface text-foreground-muted/50': !added() && !removed()
        }}
      >
        <Show when={added() || removed()}>
          <span
            class="absolute left-0 top-0 h-full w-0.5"
            classList={{ 'bg-diff-add-bar': added(), 'bg-diff-del-bar': removed() }}
          />
        </Show>
        {line.oldLine ?? ''}
      </span>
      <span
        class="sticky left-10 z-10 flex w-10 shrink-0 select-none items-center justify-end border-r border-line/40 pr-2 text-[11px] tabular-nums"
        classList={{
          'bg-diff-add-bg text-diff-add-num': added(),
          'bg-diff-del-bg text-diff-del-num': removed(),
          'bg-surface text-foreground-muted/50': !added() && !removed()
        }}
      >
        {line.newLine ?? ''}
      </span>
      <span class="whitespace-pre pl-2 pr-6">{line.text || ' '}</span>
    </div>
  )
}
