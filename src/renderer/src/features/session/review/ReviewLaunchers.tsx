import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'

/** Small disabled-keycap chips, like opencode's keybind badges. */
function KeyChips(props: { keys: string[] }): JSX.Element {
  return (
    <span class="flex shrink-0 items-center gap-1" aria-hidden="true">
      <For each={props.keys}>
        {(key) => (
          <span class="rounded-[4px] border border-line/70 bg-surface px-1.5 py-0.5 text-[10px] font-medium tracking-[0.04px] text-foreground-muted">
            {key}
          </span>
        )}
      </For>
    </span>
  )
}

export interface ReviewLaunchersProps {
  /** Total files changed, when the count is known; hidden while loading. */
  filesChanged: number | undefined
  onOpenReview: () => void
}

/**
 * The launcher list of a New tab: one row per available panel. Yoke currently
 * offers the Review panel, mirroring opencode's Review launcher row.
 */
export function ReviewLaunchers(props: ReviewLaunchersProps): JSX.Element {
  return (
    <div class="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3 pt-6 pb-8">
      <button
        type="button"
        class="flex h-12 shrink-0 items-center gap-3 rounded-lg bg-surface-mute px-4 text-left transition-colors hover:bg-surface-mute/70"
        onClick={props.onOpenReview}
      >
        <HugeiconsIcon icon={FileDiffIcon} size={15} class="shrink-0 text-foreground-muted" />
        <span class="shrink-0 text-[13.5px] font-medium text-foreground">Review</span>
        <Show when={props.filesChanged !== undefined}>
          <span class="truncate text-[12.5px] text-foreground-muted">
            {props.filesChanged === 0
              ? 'No changes'
              : `${props.filesChanged} ${props.filesChanged === 1 ? 'file' : 'files'} changed`}
          </span>
        </Show>

        <span class="ml-auto">
          <KeyChips keys={['CTRL', 'ALT', 'R']} />
        </span>
      </button>

      <p class="px-1 pt-2 text-[12px] text-foreground-muted/70">
        More panels land here as Yoke grows — review is the first one.
      </p>
    </div>
  )
}
