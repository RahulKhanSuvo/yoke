import { createEffect, createMemo, createResource, createSignal, Show, type JSX } from 'solid-js'
import { makeEventListener } from '@solid-primitives/event-listener'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import PanelLeftIcon from '@hugeicons/core-free-icons/PanelLeftIcon'
import Refresh01Icon from '@hugeicons/core-free-icons/Refresh01Icon'
import { IconButton } from '@renderer/components/ui/IconButton'
import type { ReviewFileEntry, ReviewFileDiff } from '@shared/review'
import type { ReviewSidePanelProps } from './ReviewSidePanel'
import { ReviewDiffView } from './ReviewDiffView'
import { parseUnifiedDiff } from './review-diff'
import { ReviewClean, ReviewLoading, ReviewNotRepo } from './ReviewEmpty'
import { ReviewFileList } from './ReviewFileList'
import { DiffStats, STATUS_LETTER, statusColor } from './review-status'

/** A pane with no room for the 200px file list shows only the preview. */
const FILE_LIST_MIN_WIDTH = 440

export interface ReviewContentProps extends Pick<ReviewSidePanelProps, 'directory' | 'refreshKey'> {
  width: number
}

/**
 * The Review pane's body: a file list of working tree changes beside a
 * unified diff preview, mirroring opencode's Review panel.
 */
export function ReviewContent(props: ReviewContentProps): JSX.Element {
  const [fileListOpen, setFileListOpen] = createSignal(true)
  const [filter, setFilter] = createSignal('')
  const [selected, setSelected] = createSignal<string>()
  const [refreshToken, setRefreshToken] = createSignal(0)

  // The list needs room; a narrow pane falls back to preview-only with a
  // toolbar toggle, like opencode's collapsed sidebar.
  const showFileList = () => fileListOpen() && props.width >= FILE_LIST_MIN_WIDTH

  const [summary] = createResource(
    () => ({ directory: props.directory, key: props.refreshKey + refreshToken() }),
    (source) => window.api.review.summary(source.directory)
  )

  const [diff] = createResource(
    () => {
      const file = selected()

      if (!file || !summary()?.isRepo) return undefined

      return {
        directory: props.directory,
        file,
        key: props.refreshKey + refreshToken()
      }
    },
    (source) => window.api.review.file(source.directory, source.file)
  )

  // Keep a valid selection as files appear, disappear, or refresh.
  createEffect(() => {
    const files = summary()?.files

    if (!files) return

    const current = selected()

    if (current && files.some((file) => file.path === current)) return

    setSelected(files[0]?.path)
  })

  const needle = () => filter().trim().toLowerCase()

  const filtered = createMemo(() =>
    (summary()?.files ?? []).filter(
      (file) => !needle() || file.path.toLowerCase().includes(needle())
    )
  )

  const selectedEntry = createMemo(() => summary()?.files.find((file) => file.path === selected()))

  const navigationFiles = () => filtered().map((file) => file.path)
  const selectedIndex = () => navigationFiles().indexOf(selected() ?? '')

  const previousFile = () => {
    const index = selectedIndex()

    return index > 0 ? navigationFiles()[index - 1] : undefined
  }

  const nextFile = () => {
    const files = navigationFiles()

    if (files.length === 0) return undefined

    const index = selectedIndex()

    return index === -1 ? files[0] : files[index + 1]
  }

  const diffLines = createMemo(() => parseUnifiedDiff(diff()?.patch ?? ''))

  const refresh = () => setRefreshToken((value) => value + 1)

  // Arrow keys cycle through files, like opencode's review pane.
  makeEventListener(document, 'keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return

    const target = event.target

    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest('input, textarea, select'))
    ) {
      return
    }

    if (event.key === 'ArrowLeft') {
      const file = previousFile()

      if (!file) return

      event.preventDefault()
      setSelected(file)
    } else if (event.key === 'ArrowRight') {
      const file = nextFile()

      if (!file) return

      event.preventDefault()
      setSelected(file)
    }
  })

  return (
    <div class="flex min-h-0 flex-1">
      <Show when={summary()} fallback={<ReviewLoading label="Loading changes…" />}>
        {(data) => (
          <Show when={data().isRepo} fallback={<ReviewNotRepo />}>
            <Show when={data().files.length > 0} fallback={<ReviewClean />}>
              <Show when={showFileList()}>
                <div class="flex min-h-0 flex-col">
                  <div class="flex h-12 shrink-0 items-center gap-1.5 px-2">
                    <IconButton
                      label="Hide file list"
                      aria-pressed={true}
                      class="p-1 text-foreground-muted hover:bg-surface-mute hover:text-foreground"
                      onClick={() => setFileListOpen(false)}
                    >
                      <HugeiconsIcon icon={PanelLeftIcon} size={16} />
                    </IconButton>

                    <span class="min-w-0 truncate text-[13px] font-[530] tracking-[-0.04px] text-foreground">
                      Review
                    </span>
                    <DiffStats additions={data().additions} deletions={data().deletions} />

                    <IconButton
                      label="Refresh changes"
                      class="ml-auto p-1 text-foreground-muted hover:bg-surface-mute hover:text-foreground"
                      onClick={refresh}
                    >
                      <HugeiconsIcon
                        icon={Refresh01Icon}
                        size={15}
                        class={summary.loading ? 'animate-spin' : undefined}
                      />
                    </IconButton>
                  </div>

                  <ReviewFileList
                    files={filtered()}
                    selected={selected()}
                    onSelect={setSelected}
                    query={filter()}
                    onQuery={setFilter}
                  />
                </div>
              </Show>

              <Preview
                file={selectedEntry()}
                diff={diff() ?? undefined}
                loading={diff.loading}
                lines={diffLines()}
                canPrevious={!!previousFile()}
                canNext={!!nextFile()}
                showToggle={!showFileList()}
                onToggleFileList={() => setFileListOpen(true)}
                onPrevious={() => {
                  const previous = previousFile()

                  if (previous) setSelected(previous)
                }}
                onNext={() => {
                  const next = nextFile()

                  if (next) setSelected(next)
                }}
              />
            </Show>
          </Show>
        )}
      </Show>
    </div>
  )
}

/** The right side of the pane: a file toolbar above the diff view. */
interface PreviewProps {
  file: ReviewFileEntry | undefined
  diff: ReviewFileDiff | undefined
  loading: boolean
  lines: ReturnType<typeof parseUnifiedDiff>
  canPrevious: boolean
  canNext: boolean
  /** True while the file list is hidden; renders the re-show toggle. */
  showToggle: boolean
  onToggleFileList: () => void
  onPrevious: () => void
  onNext: () => void
}

function Preview(props: PreviewProps): JSX.Element {
  return (
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-line px-2">
        <Show when={props.showToggle}>
          <IconButton
            label="Show file list"
            aria-pressed={false}
            class="p-1 text-foreground-muted hover:bg-surface-mute hover:text-foreground"
            onClick={props.onToggleFileList}
          >
            <HugeiconsIcon icon={PanelLeftIcon} size={15} />
          </IconButton>
        </Show>

        <Show
          when={props.file}
          fallback={<span class="text-[12px] text-foreground-muted">No file selected</span>}
        >
          {(file) => (
            <>
              <span
                class={`w-3 shrink-0 text-center text-[10px] font-semibold ${statusColor(file().status)}`}
                aria-hidden="true"
              >
                {STATUS_LETTER[file().status]}
              </span>
              <span
                class="min-w-0 flex-1 truncate font-mono text-[11.5px] text-foreground"
                title={file().path}
              >
                {file().path}
              </span>
              <DiffStats additions={file().additions} deletions={file().deletions} />
            </>
          )}
        </Show>

        <IconButton
          label="Previous file"
          disabled={!props.canPrevious}
          class="p-1 text-foreground-muted hover:bg-surface-mute hover:text-foreground disabled:opacity-30"
          onClick={props.onPrevious}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
        </IconButton>
        <IconButton
          label="Next file"
          disabled={!props.canNext}
          class="p-1 text-foreground-muted hover:bg-surface-mute hover:text-foreground disabled:opacity-30"
          onClick={props.onNext}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </IconButton>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <ReviewDiffView value={props.diff} loading={props.loading} lines={props.lines} />
      </div>
    </div>
  )
}
