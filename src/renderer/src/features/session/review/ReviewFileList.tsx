import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import XIcon from '@hugeicons/core-free-icons/XIcon'
import type { ReviewFileEntry } from '@shared/review'
import { DiffStats, FileExtBadge, STATUS_LETTER, statusColor } from './review-status'

export interface ReviewFileListProps {
  /** Changed files, already filtered by the caller when a query is active. */
  files: ReviewFileEntry[]
  selected: string | undefined
  onSelect: (path: string) => void
  query: string
  onQuery: (value: string) => void
}

/** The Review pane's inner sidebar: a filter field above the changed-file rows. */
export function ReviewFileList(props: ReviewFileListProps): JSX.Element {
  return (
    <div class="flex w-[200px] shrink-0 flex-col border-r border-line">
      <div class="shrink-0 p-2">
        <label class="flex h-7 items-center gap-1.5 rounded-[5px] bg-surface-mute/70 px-2 text-foreground-muted transition-colors focus-within:bg-surface-mute">
          <HugeiconsIcon icon={Search01Icon} size={13} class="shrink-0" />
          <input
            value={props.query}
            placeholder="Filter files"
            aria-label="Filter files"
            class="min-w-0 flex-1 border-0 bg-transparent text-[12px] tracking-[-0.02px] text-foreground outline-0 placeholder:text-foreground-muted/60"
            onInput={(event) => props.onQuery(event.currentTarget.value)}
          />
          <Show when={props.query}>
            <button
              type="button"
              class="grid size-3.5 shrink-0 place-items-center rounded text-foreground-muted transition hover:text-foreground"
              aria-label="Clear filter"
              onClick={() => props.onQuery('')}
            >
              <HugeiconsIcon icon={XIcon} size={10} />
            </button>
          </Show>
        </label>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        <Show
          when={props.files.length > 0}
          fallback={
            <p class="px-2 py-1.5 text-[12px] text-foreground-muted/70">No matching files</p>
          }
        >
          <For each={props.files}>
            {(file) => (
              <FileRow
                file={file}
                active={file.path === props.selected}
                onSelect={() => props.onSelect(file.path)}
              />
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

/** One changed file: status letter, muted directory, file name, and counts. */
function FileRow(props: {
  file: ReviewFileEntry
  active: boolean
  onSelect: () => void
}): JSX.Element {
  const directory = () => {
    const index = props.file.path.lastIndexOf('/')

    return index === -1 ? '' : props.file.path.slice(0, index + 1)
  }

  const name = () => props.file.path.slice(props.file.path.lastIndexOf('/') + 1)

  return (
    <button
      type="button"
      title={props.file.path}
      class="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-[5px] px-1.5 text-left text-[12px] tracking-[-0.02px] transition-colors"
      classList={{
        'bg-surface-mute text-foreground': props.active,
        'text-foreground-secondary hover:bg-foreground/[0.04]': !props.active
      }}
      onClick={props.onSelect}
    >
      <span
        class={`w-3 shrink-0 text-center text-[10px] font-semibold ${statusColor(props.file.status)}`}
        aria-hidden="true"
      >
        {STATUS_LETTER[props.file.status]}
      </span>
      <FileExtBadge path={props.file.path} class="size-3.5 rounded-[2px] text-[7.5px]" />
      <span class="min-w-0 flex-1 truncate">
        <span class="text-foreground-muted/60">{directory()}</span>
        {name()}
      </span>
      <DiffStats additions={props.file.additions} deletions={props.file.deletions} />
    </button>
  )
}
