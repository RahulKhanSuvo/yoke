import { createEffect, createMemo, createSignal, For, onMount, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ComputerTerminal01Icon from '@hugeicons/core-free-icons/ComputerTerminal01Icon'
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon'
import File01Icon from '@hugeicons/core-free-icons/File01Icon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import GlobeIcon from '@hugeicons/core-free-icons/GlobeIcon'
import BubbleChatIcon from '@hugeicons/core-free-icons/BubbleChatIcon'
import ClipboardListIcon from '@hugeicons/core-free-icons/ClipboardListIcon'
import CircleIcon from '@hugeicons/core-free-icons/CircleIcon'
import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon'
import RemoveCircleIcon from '@hugeicons/core-free-icons/RemoveCircleIcon'
import AiViewIcon from '@hugeicons/core-free-icons/AiViewIcon'
import AiSparklesIcon from '@hugeicons/core-free-icons/AiSparklesIcon'
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import ChevronDownIcon from '@hugeicons/core-free-icons/ChevronDownIcon'
import ChevronUpIcon from '@hugeicons/core-free-icons/ChevronUpIcon'
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import { FileExtBadge } from '@renderer/features/session/review/review-status'
import { codeLang, highlightLine, type CodeSpan } from './code-highlight'
import { diffCounts, lineDiff } from './code-diff'
import type { MessagePart, ToolName } from '@shared/ai'

export interface ToolCallCardProps {
  part: Extract<MessagePart, { type: 'tool' }>
}

interface ToolMeta {
  label: string
  icon: typeof ComputerTerminal01Icon
}

const TOOL_META: Record<ToolName, ToolMeta> = {
  bash: { label: 'Shell', icon: ComputerTerminal01Icon },
  read: { label: 'Read', icon: AiViewIcon },
  write: { label: 'Write', icon: File01Icon },
  edit: { label: 'Edit', icon: PencilEdit02Icon },
  grep: { label: 'Grep', icon: Search01Icon },
  glob: { label: 'Glob', icon: AiSparklesIcon },
  list: { label: 'List', icon: Folder01Icon },
  webfetch: { label: 'Fetch', icon: GlobeIcon },
  todowrite: { label: 'Todo', icon: ClipboardListIcon },
  todoread: { label: 'Todo', icon: ClipboardListIcon },
  question: { label: 'Question', icon: BubbleChatIcon }
}

/** The one-line hint opencode shows next to a tool name. */
export function toolSummary(part: Extract<MessagePart, { type: 'tool' }>): string {
  const input = (part.input && typeof part.input === 'object' ? part.input : {}) as Record<
    string,
    unknown
  >
  const path = typeof input.path === 'string' ? input.path : undefined

  switch (part.name) {
    case 'bash':
      return typeof input.command === 'string' ? input.command : 'Run command'
    case 'edit':
    case 'write':
    case 'read': {
      if (!path) return 'File'

      const args: string[] = []

      if (part.name === 'read') {
        if (typeof input.offset === 'number') args.push(`offset=${input.offset}`)
        if (typeof input.limit === 'number') args.push(`limit=${input.limit}`)
      }

      const name = path.split('/').pop() ?? path

      return args.length ? `${name} ${args.join(' ')}` : name
    }
    case 'grep':
      return typeof input.pattern === 'string'
        ? `${input.pattern}${path ? ` in ${path}` : ''}`
        : 'Search'
    case 'glob':
      return typeof input.pattern === 'string' ? input.pattern : 'Find files'
    case 'list':
      return path ?? '.'
    case 'webfetch':
      return typeof input.url === 'string' ? (input.url as string) : 'Fetch URL'
    case 'todowrite':
    case 'todoread':
      return 'Tasks'
    case 'question': {
      const text = typeof input.question === 'string' ? input.question : undefined

      return text ? text : 'Ask user'
    }
    default:
      return ''
  }
}

export function toolLabel(name: ToolName): string {
  return TOOL_META[name]?.label ?? name
}

/**
 * opencode-style tool rendering: file tools (read/write/edit) render as a
 * single collapsible file card — badge, path, change stats, grabber — with
 * highlighted, numbered code and the review diff's line washes. Everything
 * else stays a compact trigger row with expandable output.
 */
export function ToolCallCard(props: ToolCallCardProps): JSX.Element {
  const input = () =>
    (props.part.input && typeof props.part.input === 'object' ? props.part.input : {}) as Record<
      string,
      unknown
    >
  const isFileTool = () => ['read', 'write', 'edit'].includes(props.part.name)
  const isTodoTool = () => props.part.name === 'todowrite' || props.part.name === 'todoread'
  const hasDetails = () =>
    Boolean(props.part.output || props.part.error) ||
    props.part.name === 'edit' ||
    props.part.name === 'write'

  return (
    <Show
      when={isTodoTool()}
      fallback={
        <Show
          when={isFileTool() && hasDetails()}
          fallback={<RowTool part={props.part} input={input()} />}
        >
          <FileCard part={props.part} input={input()} />
        </Show>
      }
    >
      <TodoCard part={props.part} />
    </Show>
  )
}

interface ChecklistItem {
  content: string
  status: string
}

/** Pulls the todo list from todowrite input or todoread output. */
function parseTodos(part: Extract<MessagePart, { type: 'tool' }>): ChecklistItem[] {
  const statuses = ['pending', 'in_progress', 'completed', 'cancelled']

  const fromInput = (): ChecklistItem[] => {
    const input = part.input && typeof part.input === 'object' ? part.input : {}
    const todos = (input as { todos?: unknown }).todos

    if (!Array.isArray(todos)) return []

    return todos
      .filter(
        (item): item is ChecklistItem =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as ChecklistItem).content === 'string' &&
          statuses.includes((item as ChecklistItem).status)
      )
      .map((item) => ({ content: item.content, status: item.status }))
  }

  const fromOutput = (): ChecklistItem[] => {
    if (!part.output || typeof part.output !== 'string' || part.output === 'No todos yet') {
      return []
    }

    return part.output.split('\n').map((row) => {
      let status = 'pending'

      if (row.startsWith('[•]')) status = 'in_progress'
      else if (row.startsWith('[x]')) status = 'completed'
      else if (row.startsWith('[-]')) status = 'cancelled'

      return { content: row.replace(/^\[.\] /, ''), status }
    })
  }

  return part.name === 'todowrite' ? fromInput() : fromOutput()
}

/** opencode's task list card: checkbox rows instead of raw output. */
function TodoCard(props: { part: Extract<MessagePart, { type: 'tool' }> }): JSX.Element {
  const todos = createMemo(() => parseTodos(props.part))
  const done = createMemo(() => todos().filter((todo) => todo.status === 'completed').length)

  return (
    <Show when={todos().length > 0} fallback={<RowTool part={props.part} input={{}} />}>
      <div class="my-1 rounded-md border border-line/70 bg-surface-soft px-2.5 py-2">
        <div class="mb-1 flex items-center gap-2 text-[11px] text-foreground-muted">
          <HugeiconsIcon icon={ClipboardListIcon} size={12} />
          <span>
            Tasks {done()}/{todos().length}
          </span>
        </div>

        <ul class="flex flex-col gap-1">
          <For each={todos()}>
            {(todo) => (
              <li class="flex items-center gap-2 text-[12.5px] leading-normal">
                <HugeiconsIcon
                  icon={
                    todo.status === 'completed'
                      ? CheckmarkCircle02Icon
                      : todo.status === 'in_progress'
                        ? Loading03Icon
                        : todo.status === 'cancelled'
                          ? RemoveCircleIcon
                          : CircleIcon
                  }
                  size={13}
                  classList={{
                    'text-green-600': todo.status === 'completed',
                    'text-primary': todo.status === 'in_progress',
                    'text-foreground-muted/50':
                      todo.status === 'pending' || todo.status === 'cancelled'
                  }}
                />

                <span
                  classList={{
                    'text-foreground-muted line-through':
                      todo.status === 'completed' || todo.status === 'cancelled',
                    'text-foreground': todo.status !== 'completed' && todo.status !== 'cancelled',
                    'font-[500] text-primary': todo.status === 'in_progress'
                  }}
                >
                  {todo.content}
                </span>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  )
}

/** Compact trigger row with expandable plain output — bash, grep, glob, list. */
function RowTool(props: {
  part: Extract<MessagePart, { type: 'tool' }>
  input: Record<string, unknown>
}): JSX.Element {
  const [open, setOpen] = createSignal(props.part.status === 'error')
  const [userToggled, setUserToggled] = createSignal(false)

  // Failed tools reveal their error; everything else stays compact until asked.
  createEffect(() => {
    if (userToggled()) return

    if (props.part.status === 'error') setOpen(true)
  })

  const meta = () => TOOL_META[props.part.name] ?? { label: props.part.name, icon: AiSparklesIcon }
  const summary = createMemo(() => toolSummary(props.part))
  const hasDetails = () => Boolean(props.part.output || props.part.error)

  const text = createMemo(() => {
    if (props.part.name === 'bash') {
      return `$ ${String(props.input.command ?? '')}${props.part.output ? `\n${props.part.output}` : ''}`
    }

    return props.part.output ?? props.part.error ?? 'No output'
  })

  return (
    <div class="flex w-full min-w-0 flex-col">
      <button
        type="button"
        onClick={() => {
          if (!hasDetails()) return
          setUserToggled(true)
          setOpen(!open())
        }}
        aria-expanded={hasDetails() ? open() : undefined}
        class="group/tool flex h-7 w-full min-w-0 items-center gap-2 text-left text-[13px] leading-[1.4]"
        classList={{ 'cursor-pointer': hasDetails(), 'cursor-default': !hasDetails() }}
      >
        <HugeiconsIcon icon={meta().icon} size={14} class="shrink-0 text-foreground-muted/70" />

        <span class="shrink-0 font-[530] tracking-[-0.04px] text-foreground">{meta().label}</span>

        <Show when={summary()}>
          <span class="min-w-0 truncate tracking-[-0.04px] text-foreground-muted">{summary()}</span>
        </Show>

        <Show when={hasDetails()}>
          <HugeiconsIcon
            icon={open() ? ArrowDown01Icon : ArrowRight01Icon}
            size={13}
            class="ml-auto shrink-0 text-foreground-muted/60"
          />
        </Show>
      </button>

      <Show when={open() && hasDetails()}>
        <div class="group/output mt-1 mb-1 ms-5 overflow-hidden rounded-md border border-line/70 bg-surface-soft">
          <div class="max-h-96 overflow-auto">
            <pre class="px-3 py-2 font-mono text-[12px] leading-[1.55] whitespace-pre-wrap wrap-break-word text-foreground-secondary">
              {text()}
            </pre>
          </div>
        </div>
      </Show>
    </div>
  )
}

/** Splits read-tool output (`12: text`) into gutter numbers and code lines. */
function parseReadOutput(output: string): Array<{ line: number | undefined; text: string }> {
  return output.split('\n').map((row) => {
    const match = /^(\d+): ?/.exec(row)

    if (!match) return { line: undefined, text: row }

    return { line: Number(match[1]), text: row.slice(match[0].length) }
  })
}

/** The collapsible file card opencode shows for read/write/edit. */
function FileCard(props: {
  part: Extract<MessagePart, { type: 'tool' }>
  input: Record<string, unknown>
}): JSX.Element {
  const [bodyOpen, setBodyOpen] = createSignal(props.part.status === 'error')
  const [copied, setCopied] = createSignal(false)

  // A new turn replaces this card, so local state restarts with it.
  createEffect(() => {
    if (props.part.status === 'error') setBodyOpen(true)
  })

  const path = () =>
    typeof props.input.path === 'string' ? (props.input.path as string) : undefined
  const fileName = () => path()?.split('/').pop()
  const directory = () => {
    const value = path()

    if (!value || !value.includes('/')) return undefined

    return value.slice(0, value.lastIndexOf('/'))
  }
  const lang = () => codeLang(fileName() ?? '')

  const editLines = createMemo(() =>
    props.part.name === 'edit'
      ? lineDiff(
          typeof props.input.oldString === 'string' ? (props.input.oldString as string) : '',
          typeof props.input.newString === 'string' ? (props.input.newString as string) : ''
        )
      : []
  )
  const editStats = createMemo(() => diffCounts(editLines()))

  /** The edit tool reports where the replacement starts, so rows get real line numbers. */
  const editMeta = createMemo(() => {
    if (props.part.name !== 'edit' || !props.part.output) return undefined

    try {
      const parsed = JSON.parse(props.part.output) as { line?: number }

      return typeof parsed?.line === 'number' ? parsed : undefined
    } catch {
      return undefined
    }
  })

  const numberedEditRows = createMemo(() => {
    const start = Math.max(1, editMeta()?.line ?? 1)
    let oldNum = start
    let newNum = start

    return editLines().map((line) => {
      if (line.kind === 'del') return { ...line, num: oldNum++ }
      if (line.kind === 'add') return { ...line, num: newNum++ }

      const num = oldNum
      oldNum++
      newNum++

      return { ...line, num }
    })
  })

  const readRows = createMemo(() =>
    props.part.name === 'read' && props.part.output ? parseReadOutput(props.part.output) : []
  )
  const writeLines = createMemo(() =>
    props.part.name === 'write' && typeof props.input.content === 'string'
      ? (props.input.content as string).split('\n')
      : []
  )

  const copyText = createMemo(() => {
    switch (props.part.name) {
      case 'read':
        return props.part.output ?? ''
      case 'write':
        return typeof props.input.content === 'string' ? (props.input.content as string) : ''
      case 'edit':
        return typeof props.input.newString === 'string' ? (props.input.newString as string) : ''
      default:
        return ''
    }
  })

  const copy = async () => {
    if (!copyText()) return

    try {
      await navigator.clipboard.writeText(copyText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard failures.
    }
  }

  const errorText = () => (props.part.status === 'error' ? (props.part.error ?? '') : '')

  return (
    <div class="group/output relative mt-1 mb-1 overflow-hidden rounded-lg border border-line/70 bg-surface-soft">
      {/* Card header: badge, path, change stats, copy, collapse grabber. */}
      <button
        type="button"
        aria-expanded={bodyOpen()}
        class="flex h-9 w-full shrink-0 cursor-pointer items-center gap-2 bg-surface px-2.5 text-left"
        onClick={() => setBodyOpen(!bodyOpen())}
      >
        <Show when={fileName()}>
          <FileExtBadge path={fileName()!} />
          <span class="min-w-0 truncate text-[12.5px] tracking-[-0.04px]" title={path()}>
            <span class="text-foreground-muted">{directory() ? `${directory()}/` : ''}</span>
            <span class="font-medium text-foreground-secondary">{fileName()}</span>
          </span>
        </Show>

        <Show when={props.part.name === 'edit'}>
          <span class="ml-auto flex shrink-0 items-center gap-2 text-[11.5px] tabular-nums">
            <span class="text-diff-add-num">+{editStats().additions}</span>
            <span class="text-diff-del-num">-{editStats().deletions}</span>
          </span>
        </Show>

        <Show when={props.part.name === 'write'}>
          <span class="ml-auto shrink-0 text-[11.5px] tabular-nums text-diff-add-num">
            +{writeLines().length}
          </span>
        </Show>

        <span class="ml-auto flex shrink-0 items-center gap-0.5" aria-hidden="true">
          <HugeiconsIcon icon={ChevronUpIcon} size={10} class="text-foreground-muted/60" />
          <HugeiconsIcon icon={ChevronDownIcon} size={10} class="-mt-1 text-foreground-muted/60" />
        </span>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          void copy()
        }}
        title={copied() ? 'Copied' : 'Copy contents'}
        aria-label={copied() ? 'Copied' : 'Copy contents'}
        class="absolute top-0 right-9 flex h-9 w-7 items-center justify-center rounded-md text-foreground-muted opacity-0 transition group-hover/output:opacity-100 hover:text-foreground"
      >
        <HugeiconsIcon
          icon={copied() ? CheckmarkCircle02Icon : Copy01Icon}
          size={12}
          classList={{ 'text-green-600': copied() }}
        />
      </button>

      <Show when={bodyOpen()}>
        <CardBody
          part={props.part}
          errorText={errorText()}
          lang={lang()}
          readRows={readRows()}
          writeLines={writeLines()}
          editRows={numberedEditRows()}
        />
      </Show>
    </div>
  )
}

/** The scrollable card body with the floating "more" affordance. */
function CardBody(props: {
  part: Extract<MessagePart, { type: 'tool' }>
  errorText: string
  lang: ReturnType<typeof codeLang>
  readRows: Array<{ line: number | undefined; text: string }>
  writeLines: string[]
  editRows: Array<{
    kind: 'context' | 'add' | 'del'
    text: string
    num: number
    words?: Array<{ text: string; changed: boolean }>
  }>
}): JSX.Element {
  let bodyRef: HTMLDivElement | undefined
  const [more, setMore] = createSignal(false)

  const updateMore = (): void => {
    const el = bodyRef

    if (!el) {
      setMore(false)

      return
    }

    setMore(
      el.scrollHeight > el.clientHeight + 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 12
    )
  }

  onMount(updateMore)

  // Content streams in while the turn runs, so re-check whenever it grows.
  createEffect(() => {
    void props.readRows.length
    void props.writeLines.length
    void props.editRows.length
    void props.errorText
    queueMicrotask(updateMore)
  })

  return (
    <div class="relative">
      <div ref={bodyRef} class="max-h-96 overflow-auto" onScroll={updateMore}>
        <Show when={props.part.name === 'read' && props.readRows.length > 0}>
          <div class="min-w-max border-t border-line/40 py-1 font-mono text-[12px] leading-[20px]">
            <For each={props.readRows}>
              {(row) => (
                <div class="flex bg-surface-soft">
                  <span class="sticky left-0 z-10 flex w-11 shrink-0 select-none items-center justify-end bg-surface-soft pr-2 text-[11px] tabular-nums text-foreground-muted/50">
                    {row.line ?? ''}
                  </span>
                  <span class="whitespace-pre pl-2 pr-4">
                    <Highlighted text={row.text} lang={props.lang} />
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={props.part.name === 'edit' && props.editRows.length > 0}>
          <div class="min-w-max border-t border-line/40 py-1 font-mono text-[12px] leading-[20px]">
            <For each={props.editRows}>
              {(row) => (
                <div
                  class="relative flex"
                  classList={{
                    'bg-diff-del-bg': row.kind === 'del',
                    'bg-diff-add-bg': row.kind === 'add',
                    'bg-surface-soft': row.kind === 'context'
                  }}
                >
                  <Show when={row.kind !== 'context'}>
                    <span
                      class="absolute top-0 left-0 h-full w-0.5"
                      classList={{
                        'bg-diff-del-bar': row.kind === 'del',
                        'bg-diff-add-bar': row.kind === 'add'
                      }}
                    />
                  </Show>
                  <span
                    class="sticky left-0 z-10 flex w-11 shrink-0 select-none items-center justify-end pr-2 text-[11px] tabular-nums"
                    classList={{
                      'bg-diff-del-bg text-diff-del-num': row.kind === 'del',
                      'bg-diff-add-bg text-diff-add-num': row.kind === 'add',
                      'bg-surface-soft text-foreground-muted/50': row.kind === 'context'
                    }}
                  >
                    {row.num}
                  </span>
                  <span class="whitespace-pre pl-2 pr-4">
                    <Show
                      when={row.words}
                      fallback={<Highlighted text={row.text} lang={props.lang} />}
                    >
                      {(words) => (
                        <For each={words()}>
                          {(word) => (
                            <span
                              classList={{
                                'bg-diff-word-del': word.changed && row.kind === 'del',
                                'bg-diff-word-add rounded-[2px]': word.changed && row.kind === 'add'
                              }}
                            >
                              <Highlighted text={word.text} lang={props.lang} />
                            </span>
                          )}
                        </For>
                      )}
                    </Show>
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={props.part.name === 'write' && props.writeLines.length > 0}>
          <div class="min-w-max border-t border-line/40 py-1 font-mono text-[12px] leading-[20px]">
            <For each={props.writeLines}>
              {(text, index) => (
                <div class="relative flex bg-diff-add-bg">
                  <span class="absolute top-0 left-0 h-full w-0.5 bg-diff-add-bar" />
                  <span class="sticky left-0 z-10 flex w-11 shrink-0 select-none items-center justify-end bg-diff-add-bg pr-2 text-[11px] tabular-nums text-diff-add-num">
                    {index() + 1}
                  </span>
                  <span class="whitespace-pre pl-2 pr-4">
                    <Highlighted text={text} lang={props.lang} />
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={props.errorText}>
          <pre class="border-t border-danger/20 bg-danger/5 px-3 py-2 font-mono text-[12px] leading-[1.55] whitespace-pre-wrap wrap-break-word text-danger">
            {props.errorText}
          </pre>
        </Show>
      </div>

      {/* opencode's floating "more" button when the body scrolls. */}
      <Show when={more()}>
        <button
          type="button"
          aria-label="Scroll for more"
          class="absolute bottom-2 left-1/2 z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-foreground-muted shadow-sm transition hover:text-foreground"
          onClick={() => {
            const el = bodyRef

            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
          }}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
        </button>
      </Show>
    </div>
  )
}

/** One highlighted source line. */
function Highlighted(props: { text: string; lang: ReturnType<typeof codeLang> }): JSX.Element {
  const spans = createMemo<CodeSpan[]>(() => highlightLine(props.text, props.lang))

  return (
    <For each={spans()}>
      {(span) => (
        <Show when={span.cls} fallback={<>{span.text}</>}>
          <span class={span.cls}>{span.text}</span>
        </Show>
      )}
    </For>
  )
}
