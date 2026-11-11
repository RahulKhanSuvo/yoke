import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import GlobeIcon from '@hugeicons/core-free-icons/GlobeIcon'
import TerminalIcon from '@hugeicons/core-free-icons/TerminalIcon'

/**
 * Opencode's neutral keybind chips: 14px squares, uppercase 11px labels,
 * barely elevated over the row behind them.
 */
function KeyChips(props: { keys: string[] | undefined }): JSX.Element {
  return (
    <span class="flex shrink-0 items-center gap-[2px]" aria-hidden="true">
      <For each={props.keys}>
        {(key) => (
          <span class="flex h-[14px] min-w-[14px] items-center justify-center rounded-[2px] bg-surface-mute px-1 text-[11px] font-[530] uppercase leading-none tracking-[0.05px] text-foreground-muted">
            {key}
          </span>
        )}
      </For>
    </span>
  )
}

/** One launcher row, mirroring opencode's `LauncherRow` in side-region.tsx. */
function LauncherRow(props: {
  icon: typeof FileDiffIcon
  title: string
  description?: string
  keys?: string[]
  onClick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      class="flex h-[41px] w-full items-center justify-between gap-4 rounded-[8px] border-[0.5px] border-line bg-surface-mute/40 px-3.5 text-start transition-colors hover:bg-surface-mute"
      onClick={props.onClick}
    >
      <span class="flex min-w-0 items-center gap-2 text-[13px] font-[440] tracking-[-0.04px]">
        <HugeiconsIcon icon={props.icon} size={14} class="shrink-0 text-foreground-muted" />
        <span class="shrink-0 text-foreground">{props.title}</span>
        <Show when={props.description}>
          <span class="truncate text-foreground-muted">{props.description}</span>
        </Show>
      </span>
      <Show when={props.keys && props.keys.length > 0}>
        <KeyChips keys={props.keys} />
      </Show>
    </button>
  )
}

export interface ReviewLaunchersProps {
  /** Total files changed, when the count is known; hidden while loading. */
  filesChanged: number | undefined
  onOpenReview: () => void
  onOpenFiles: () => void
  onOpenTerminal: () => void
  onOpenBrowser: () => void
}

/**
 * The New-tab view of an empty side panel: one bordered row per available
 * panel, centered like opencode's launcher list.
 */
export function ReviewLaunchers(props: ReviewLaunchersProps): JSX.Element {
  return (
    <div class="min-h-0 flex-1 overflow-y-auto px-6">
      <div class="mx-auto flex max-w-[560px] flex-col gap-3 pt-12 pb-10">
        <LauncherRow
          icon={FileDiffIcon}
          title="Review"
          description={
            props.filesChanged === undefined
              ? undefined
              : `${props.filesChanged} file${props.filesChanged === 1 ? '' : 's'} changed`
          }
          keys={['Ctrl', 'Alt', 'R']}
          onClick={props.onOpenReview}
        />
        <LauncherRow
          icon={GlobeIcon}
          title="Browser"
          description="Open a web page"
          keys={['Ctrl', 'Alt', 'B']}
          onClick={props.onOpenBrowser}
        />
        <LauncherRow
          icon={TerminalIcon}
          title="Terminal"
          description="Shell in the project"
          keys={['Ctrl', 'Alt', 'T']}
          onClick={props.onOpenTerminal}
        />
        <LauncherRow
          icon={Folder01Icon}
          title="Files"
          description="Browse project files"
          keys={['Ctrl', 'Alt', 'F']}
          onClick={props.onOpenFiles}
        />
      </div>
    </div>
  )
}
