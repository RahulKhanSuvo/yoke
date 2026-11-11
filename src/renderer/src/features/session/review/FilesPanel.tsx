import { createEffect, createMemo, createResource, createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ChevronRightIcon from '@hugeicons/core-free-icons/ChevronRightIcon'
import File01Icon from '@hugeicons/core-free-icons/File01Icon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import XIcon from '@hugeicons/core-free-icons/XIcon'
import type { FilePreview, FileTreeNode } from '@shared/files'

export interface FilesPanelProps {
  /** The session's project root. */
  directory: string
}

/**
 * The side panel's Files tab, like opencode's file browser: a lazily loaded
 * project tree on the left and a read-only preview of the selected file.
 */
export function FilesPanel(props: FilesPanelProps): JSX.Element {
  const [filter, setFilter] = createSignal('')
  const [selectedFile, setSelectedFile] = createSignal<string>()
  /** Children of expanded folders, keyed by their project-relative path. */
  const [children, setChildren] = createSignal<Record<string, FileTreeNode[]>>({})
  /** Folder paths the user opened. */
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set())

  const [root] = createResource(
    () => props.directory,
    (directory) => window.api.files.tree(directory, '')
  )

  const loadFolder = async (folderPath: string) => {
    if (children()[folderPath]) return

    const entries = await window.api.files.tree(props.directory, folderPath)

    setChildren((previous) => ({ ...previous, [folderPath]: entries }))
  }

  const toggleFolder = (node: FileTreeNode) => {
    const wasOpen = expanded().has(node.path)

    setExpanded((previous) => {
      const next = new Set(previous)

      if (wasOpen) next.delete(node.path)
      else next.add(node.path)

      return next
    })

    if (!wasOpen) void loadFolder(node.path)
  }

  const [preview] = createResource(
    () => {
      const file = selectedFile()

      return file ? { directory: props.directory, file } : undefined
    },
    (source) => window.api.files.read(source.directory, source.file)
  )

  // The root may fail or the directory may be empty; both show an empty tree.
  createEffect(() => {
    const rows = root()

    if (rows && children()[''] === undefined) setChildren((previous) => ({ ...previous, '': rows }))
  })

  const needle = () => filter().trim().toLowerCase()

  /** Depth-first rows of the loaded tree, filtered by the query when active. */
  const rows = createMemo<Array<{ node: FileTreeNode; depth: number; folderOpen?: boolean }>>(() => {
    const out: Array<{ node: FileTreeNode; depth: number; folderOpen?: boolean }> = []
    const match = (node: FileTreeNode): boolean =>
      !needle() || node.path.toLowerCase().includes(needle())

    const walk = (folderPath: string, depth: number) => {
      for (const node of children()[folderPath] ?? []) {
        const isOpen = expanded().has(node.path)

        if (match(node)) out.push({ node, depth, folderOpen: isOpen })

        if (node.type === 'directory' && (isOpen || needle())) walk(node.path, depth + 1)
      }
    }

    walk('', 0)

    return out
  })

  return (
    <div class="flex min-h-0 flex-1">
      <div class="flex w-[220px] shrink-0 flex-col border-r border-line">
        <div class="shrink-0 p-2">
          <label class="flex h-7 items-center gap-1.5 rounded-[5px] bg-surface-mute/70 px-2 text-foreground-muted transition-colors focus-within:bg-surface-mute">
            <HugeiconsIcon icon={Search01Icon} size={13} class="shrink-0" />
            <input
              value={filter()}
              placeholder="Search files"
              aria-label="Search files"
              class="min-w-0 flex-1 border-0 bg-transparent text-[12px] tracking-[-0.02px] text-foreground outline-0 placeholder:text-foreground-muted/60"
              onInput={(event) => setFilter(event.currentTarget.value)}
            />
            <Show when={filter()}>
              <button
                type="button"
                aria-label="Clear search"
                class="text-foreground-muted hover:text-foreground"
                onClick={() => setFilter('')}
              >
                <HugeiconsIcon icon={XIcon} size={12} />
              </button>
            </Show>
          </label>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
          <Show
            when={rows().length > 0}
            fallback={
              <p class="px-2 py-4 text-center text-[12px] text-foreground-muted">
                {root.loading ? 'Loading…' : 'No files match'}
              </p>
            }
          >
            <For each={rows()}>
              {(row) => (
                <button
                  type="button"
                  class="group/row flex w-full items-center gap-1 rounded-[5px] py-1 pr-1 text-left text-[12.5px] transition-colors"
                  classList={{
                    'bg-surface-mute text-foreground': selectedFile() === row.node.path,
                    'text-foreground-secondary hover:bg-foreground/[0.03]':
                      selectedFile() !== row.node.path
                  }}
                  style={{ 'padding-left': `${row.depth * 12 + 4}px` }}
                  title={row.node.path}
                  onClick={() =>
                    row.node.type === 'directory'
                      ? toggleFolder(row.node)
                      : setSelectedFile(row.node.path)
                  }
                >
                  <Show
                    when={row.node.type === 'directory'}
                    fallback={
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={13}
                        class="shrink-0 text-foreground-muted/70"
                      />
                    }
                  >
                    <HugeiconsIcon
                      icon={ChevronRightIcon}
                      size={11}
                      class={`shrink-0 text-foreground-muted/70 transition-transform duration-150 ${
                        row.folderOpen ? 'rotate-90' : ''
                      }`}
                    />
                    <HugeiconsIcon
                      icon={Folder01Icon}
                      size={13}
                      class="shrink-0 text-foreground-muted"
                    />
                  </Show>
                  <span class="min-w-0 truncate">{row.node.name}</span>
                </button>
              )}
            </For>
          </Show>
        </div>
      </div>

      <FilePreviewView preview={preview() ?? undefined} loading={preview.loading} />
    </div>
  )
}

/** The read-only preview beside the tree, with a line-number gutter. */
function FilePreviewView(props: { preview: FilePreview | undefined; loading: boolean }): JSX.Element {
  const lines = () => (props.preview?.content ?? '').split('\n')

  // `files:read` returns null for missing files; treat it like no selection.
  const shown = () => props.preview ?? undefined

  return (
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-line px-2">
        <Show
          when={props.preview?.path}
          fallback={<span class="text-[12px] text-foreground-muted">No file selected</span>}
        >
          {(path) => (
            <span class="min-w-0 flex-1 truncate font-mono text-[11.5px] text-foreground" title={path()}>
              {path()}
            </span>
          )}
        </Show>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <Show
          when={shown()}
          fallback={
            <div class="flex h-full items-center justify-center pb-12 text-[12px] text-foreground-muted">
              {props.loading ? 'Loading…' : 'Select a file to preview it'}
            </div>
          }
        >
          {(file) => (
            <Show
              when={file().content}
              fallback={
                <div class="flex h-full items-center justify-center pb-12 text-[12px] text-foreground-muted">
                  {file().truncated ? 'File too large to preview' : 'Binary file — no preview'}
                </div>
              }
            >
              <div class="min-w-max pb-8 font-mono text-[11.5px] leading-[18px] text-foreground">
                <For each={lines()}>
                  {(line, index) => (
                    <div class="flex">
                      <span class="sticky left-0 z-10 w-10 shrink-0 select-none border-r border-line/40 bg-surface pr-1.5 text-right text-[10px] text-foreground-muted/60">
                        {index() + 1}
                      </span>
                      <span class="whitespace-pre pr-6">{line || ' '}</span>
                    </div>
                  )}
                </For>
                <Show when={file().truncated}>
                  <div class="bg-surface-mute/60 px-3 py-1.5 text-[10.5px] text-foreground-muted">
                    Preview truncated — this file is too large to show in full.
                  </div>
                </Show>
              </div>
            </Show>
          )}
        </Show>
      </div>
    </div>
  )
}
