import { createMemo, createSignal, createEffect, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ComputerTerminal01Icon from '@hugeicons/core-free-icons/ComputerTerminal01Icon'
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon'
import File01Icon from '@hugeicons/core-free-icons/File01Icon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import AiViewIcon from '@hugeicons/core-free-icons/AiViewIcon'
import AiSparklesIcon from '@hugeicons/core-free-icons/AiSparklesIcon'
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import type { MessagePart, ToolName } from '@shared/ai'

export interface ToolCallCardProps {
  part: Extract<MessagePart, { type: 'tool' }>
}

interface ToolMeta {
  label: string
  icon: any
  color: string
}

const TOOL_META: Record<ToolName, ToolMeta> = {
  bash: { label: 'Terminal', icon: ComputerTerminal01Icon, color: 'text-amber-500 bg-amber-500/10' },
  edit: { label: 'Edit File', icon: PencilEdit02Icon, color: 'text-blue-500 bg-blue-500/10' },
  write: { label: 'Write File', icon: File01Icon, color: 'text-emerald-500 bg-emerald-500/10' },
  read: { label: 'Read File', icon: AiViewIcon, color: 'text-indigo-500 bg-indigo-500/10' },
  grep: { label: 'Grep Search', icon: Search01Icon, color: 'text-purple-500 bg-purple-500/10' },
  glob: { label: 'Find Files', icon: AiSparklesIcon, color: 'text-cyan-500 bg-cyan-500/10' },
  list: { label: 'Directory', icon: Folder01Icon, color: 'text-teal-500 bg-teal-500/10' }
}

export function ToolCallCard(props: ToolCallCardProps): JSX.Element {
  // Auto-collapse behavior: open while running; collapses when completed;
  // stays open on error. User can toggle anytime.
  const [open, setOpen] = createSignal(props.part.status === 'running')
  const [userToggled, setUserToggled] = createSignal(false)
  const [copied, setCopied] = createSignal(false)

  createEffect(() => {
    const status = props.part.status
    if (!userToggled()) {
      if (status === 'running') {
        setOpen(true)
      } else if (status === 'completed') {
        setOpen(false)
      } else if (status === 'error') {
        setOpen(true)
      }
    }
  })

  const toggle = () => {
    setUserToggled(true)
    setOpen(!open())
  }

  const meta = () => TOOL_META[props.part.name] ?? {
    label: props.part.name,
    icon: ComputerTerminal01Icon,
    color: 'text-neutral-500 bg-neutral-500/10'
  }

  const inputObj = () => (props.part.input && typeof props.part.input === 'object'
    ? (props.part.input as Record<string, unknown>)
    : {})

  const summary = createMemo(() => {
    const inp = inputObj()
    switch (props.part.name) {
      case 'bash':
        return typeof inp.command === 'string' ? `$ ${inp.command}` : 'Run shell command'
      case 'edit':
      case 'write':
      case 'read':
        return typeof inp.path === 'string' ? inp.path : 'File operation'
      case 'grep':
        return typeof inp.pattern === 'string'
          ? `/${inp.pattern}/ in ${inp.path ?? '.'}`
          : 'Search code'
      case 'glob':
        return typeof inp.pattern === 'string' ? inp.pattern : 'Find files'
      case 'list':
        return typeof inp.path === 'string' ? inp.path : '.'
      default:
        return ''
    }
  })

  const copyOutput = async () => {
    const text = props.part.output ?? props.part.error ?? ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  return (
    <div class="my-2.5 overflow-hidden rounded-xl border border-line bg-surface shadow-xs transition-all">
      {/* Tool Header Bar */}
      <div
        onClick={toggle}
        class="flex cursor-pointer select-none items-center justify-between gap-3 px-3 py-2 text-[12.5px] transition hover:bg-surface-mute/50"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Tool Icon */}
          <div class={`flex size-6 shrink-0 items-center justify-center rounded-md ${meta().color}`}>
            <HugeiconsIcon icon={meta().icon} size={14} />
          </div>

          {/* Tool Name */}
          <span class="shrink-0 font-medium text-foreground">{meta().label}</span>

          {/* Target File or Command */}
          <span class="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground-secondary">
            {summary()}
          </span>
        </div>

        {/* Status Indicators & Chevrons */}
        <div class="flex shrink-0 items-center gap-2">
          <Show when={props.part.status === 'running'}>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <span class="size-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Running</span>
            </span>
          </Show>

          <Show when={props.part.status === 'completed'}>
            <span class="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
              <span>Done</span>
            </span>
          </Show>

          <Show when={props.part.status === 'error'}>
            <span class="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500">
              Failed
            </span>
          </Show>

          <HugeiconsIcon
            icon={open() ? ArrowDown01Icon : ArrowRight01Icon}
            size={14}
            class="text-foreground-muted"
          />
        </div>
      </div>

      {/* Expanded Content View */}
      <Show when={open()}>
        <div class="border-t border-line/70 bg-surface-soft/60">
          {/* Specialized Renderer based on tool type */}
          <Show when={props.part.name === 'bash'}>
            <BashToolView
              command={String(inputObj().command ?? '')}
              output={props.part.output}
              error={props.part.error}
              running={props.part.status === 'running'}
              copied={copied()}
              onCopy={copyOutput}
            />
          </Show>

          <Show when={props.part.name === 'edit'}>
            <EditToolView
              path={String(inputObj().path ?? '')}
              oldString={typeof inputObj().oldString === 'string' ? String(inputObj().oldString) : ''}
              newString={typeof inputObj().newString === 'string' ? String(inputObj().newString) : ''}
              output={props.part.output}
              error={props.part.error}
            />
          </Show>

          <Show when={props.part.name === 'write'}>
            <WriteToolView
              path={String(inputObj().path ?? '')}
              content={typeof inputObj().content === 'string' ? String(inputObj().content) : ''}
              output={props.part.output}
              error={props.part.error}
            />
          </Show>

          <Show when={props.part.name === 'read'}>
            <ReadToolView
              path={String(inputObj().path ?? '')}
              offset={typeof inputObj().offset === 'number' ? Number(inputObj().offset) : 1}
              output={props.part.output}
              error={props.part.error}
            />
          </Show>

          <Show when={props.part.name === 'grep'}>
            <GrepToolView
              pattern={String(inputObj().pattern ?? '')}
              output={props.part.output}
              error={props.part.error}
            />
          </Show>

          <Show when={props.part.name === 'glob' || props.part.name === 'list'}>
            <FilesToolView output={props.part.output} error={props.part.error} />
          </Show>

          {/* Raw Error Display */}
          <Show when={props.part.status === 'error' && props.part.error}>
            <div class="border-t border-danger/30 bg-danger/10 px-3.5 py-2 text-[12px] font-mono text-danger">
              {props.part.error}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

/** OpenCode Terminal Widget for Bash command executions */
function BashToolView(props: {
  command: string
  output?: string
  error?: string
  running?: boolean
  copied: boolean
  onCopy: () => void
}): JSX.Element {
  return (
    <div class="flex flex-col bg-[#0f1117] text-[#e6edf3]">
      {/* Terminal Bar */}
      <div class="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-neutral-400">
        <div class="flex items-center gap-2">
          <div class="flex gap-1">
            <span class="size-2 rounded-full bg-red-500/80" />
            <span class="size-2 rounded-full bg-yellow-500/80" />
            <span class="size-2 rounded-full bg-green-500/80" />
          </div>
          <span class="font-mono text-neutral-400">bash</span>
        </div>

        <button
          type="button"
          onClick={props.onCopy}
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <Show
            when={props.copied}
            fallback={
              <>
                <HugeiconsIcon icon={Copy01Icon} size={11} />
                <span>Copy</span>
              </>
            }
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} class="text-green-400" />
            <span class="text-green-400">Copied</span>
          </Show>
        </button>
      </div>

      {/* Terminal Body */}
      <div class="max-h-80 overflow-y-auto p-3 font-mono text-[12px] leading-5">
        <div class="flex items-center gap-2 text-emerald-400">
          <span class="font-bold select-none">$</span>
          <span>{props.command}</span>
        </div>

        <Show when={props.output}>
          <pre class="mt-2 whitespace-pre-wrap text-neutral-300 font-mono">
            {props.output}
          </pre>
        </Show>

        <Show when={props.running && !props.output}>
          <div class="mt-2 flex items-center gap-2 text-neutral-500">
            <span class="size-2 animate-ping rounded-full bg-emerald-400" />
            <span class="italic">Running command…</span>
          </div>
        </Show>
      </div>
    </div>
  )
}

/** OpenCode Unified Diff Viewer for File Edits */
function EditToolView(props: {
  path: string
  oldString: string
  newString: string
  output?: string
  error?: string
}): JSX.Element {
  const oldLines = createMemo(() => (props.oldString ? props.oldString.split('\n') : []))
  const newLines = createMemo(() => (props.newString ? props.newString.split('\n') : []))

  return (
    <div class="flex flex-col text-[12px] font-mono">
      {/* File Diff Header */}
      <div class="flex items-center justify-between border-b border-line bg-surface px-3 py-1.5 text-[11px] text-foreground-secondary">
        <span class="font-medium text-foreground">{props.path}</span>
        <div class="flex items-center gap-2">
          <span class="text-red-500">-{oldLines().length}</span>
          <span class="text-green-500">+{newLines().length}</span>
        </div>
      </div>

      {/* Diff Lines Container */}
      <div class="max-h-72 overflow-y-auto bg-surface-soft p-1">
        {/* Deleted lines */}
        <For each={oldLines()}>
          {(line) => (
            <div class="flex items-start bg-red-500/10 text-red-600 dark:text-red-400">
              <span class="w-8 shrink-0 select-none pr-2 text-right text-red-400/60">-</span>
              <pre class="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono leading-5">
                {line || ' '}
              </pre>
            </div>
          )}
        </For>

        {/* Added lines */}
        <For each={newLines()}>
          {(line) => (
            <div class="flex items-start bg-green-500/10 text-green-700 dark:text-green-300">
              <span class="w-8 shrink-0 select-none pr-2 text-right text-green-500/60">+</span>
              <pre class="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono leading-5">
                {line || ' '}
              </pre>
            </div>
          )}
        </For>
      </div>

      <Show when={props.output}>
        <div class="border-t border-line/50 bg-surface px-3 py-1.5 text-[11px] text-foreground-muted">
          {props.output}
        </div>
      </Show>
    </div>
  )
}

/** OpenCode Code Viewer for File Writes */
function WriteToolView(props: {
  path: string
  content: string
  output?: string
  error?: string
}): JSX.Element {
  const lines = createMemo(() => (props.content ? props.content.split('\n') : []))

  return (
    <div class="flex flex-col text-[12px] font-mono">
      <div class="flex items-center justify-between border-b border-line bg-surface px-3 py-1.5 text-[11px] text-foreground-secondary">
        <span class="font-medium text-foreground">{props.path}</span>
        <span class="text-foreground-muted">{lines().length} lines written</span>
      </div>

      <div class="max-h-72 overflow-y-auto bg-surface-soft p-2">
        <table class="w-full border-collapse">
          <tbody>
            <For each={lines()}>
              {(line, idx) => (
                <tr class="hover:bg-surface-mute/30">
                  <td class="w-10 select-none pr-3 text-right font-mono text-[11px] text-foreground-muted/60">
                    {idx() + 1}
                  </td>
                  <td class="font-mono text-foreground whitespace-pre">{line || ' '}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** OpenCode Code Viewer for File Reads */
function ReadToolView(props: {
  path: string
  offset: number
  output?: string
  error?: string
}): JSX.Element {
  const lines = createMemo(() => (props.output ? props.output.split('\n') : []))

  return (
    <div class="flex flex-col text-[12px] font-mono">
      <div class="flex items-center justify-between border-b border-line bg-surface px-3 py-1.5 text-[11px] text-foreground-secondary">
        <span class="font-medium text-foreground">{props.path}</span>
        <span class="text-foreground-muted">From line {props.offset}</span>
      </div>

      <div class="max-h-72 overflow-y-auto bg-surface-soft p-2">
        <Show
          when={lines().length > 0}
          fallback={
            <div class="p-2 text-foreground-muted italic">Reading file…</div>
          }
        >
          <table class="w-full border-collapse">
            <tbody>
              <For each={lines()}>
                {(line, idx) => (
                  <tr class="hover:bg-surface-mute/30">
                    <td class="w-10 select-none pr-3 text-right font-mono text-[11px] text-foreground-muted/60">
                      {(props.offset || 1) + idx()}
                    </td>
                    <td class="font-mono text-foreground whitespace-pre">{line || ' '}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  )
}

/** OpenCode Grep Matches Explorer */
function GrepToolView(props: { pattern: string; output?: string; error?: string }): JSX.Element {
  const lines = createMemo(() => (props.output ? props.output.split('\n') : []))

  return (
    <div class="flex flex-col text-[12px]">
      <div class="border-b border-line bg-surface px-3 py-1.5 text-[11px] text-foreground-secondary">
        <span>Matches for </span>
        <span class="font-mono font-medium text-primary">{props.pattern}</span>
      </div>

      <div class="max-h-64 overflow-y-auto bg-surface-soft p-2 space-y-1 font-mono text-[11.5px]">
        <For each={lines()}>
          {(line) => (
            <div class="rounded px-2 py-1 bg-surface border border-line/60 hover:border-line">
              <span class="text-foreground whitespace-pre-wrap">{line}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

/** OpenCode Discovered Files List for Glob / Directory List */
function FilesToolView(props: { output?: string; error?: string }): JSX.Element {
  const entries = createMemo(() => (props.output ? props.output.trim().split('\n') : []))

  return (
    <div class="max-h-64 overflow-y-auto p-2 font-mono text-[12px]">
      <div class="flex flex-wrap gap-1.5">
        <For each={entries()}>
          {(entry) => {
            const isDir = entry.endsWith('/')
            return (
              <span class="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[11.5px] text-foreground-secondary">
                <HugeiconsIcon
                  icon={isDir ? Folder01Icon : File01Icon}
                  size={12}
                  class={isDir ? 'text-amber-500' : 'text-blue-500'}
                />
                <span>{entry}</span>
              </span>
            )
          }}
        </For>
      </div>
    </div>
  )
}
