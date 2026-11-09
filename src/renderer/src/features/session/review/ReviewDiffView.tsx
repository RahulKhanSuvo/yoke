import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'
import type { ReviewFileDiff } from '@shared/review'
import type { ReviewDiffLine } from './review-diff'

export interface ReviewDiffViewProps {
  value: ReviewFileDiff | undefined
  loading: boolean
  lines: ReviewDiffLine[]
}

/** The scrollable unified diff body under the preview toolbar. */
export function ReviewDiffView(props: ReviewDiffViewProps): JSX.Element {
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
          <div class="min-w-max pb-8 font-mono text-[11.5px] leading-[18px] text-foreground">
            <For each={props.lines}>{(line) => <DiffRow line={line} />}</For>
            <Show when={props.value?.truncated}>
              <div class="bg-surface-mute/60 px-3 py-1.5 text-[10.5px] text-foreground-muted">
                Diff truncated — this file is too large to show in full.
              </div>
            </Show>
          </div>
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

/** One rendered diff line: two line-number gutters plus the code. */
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
