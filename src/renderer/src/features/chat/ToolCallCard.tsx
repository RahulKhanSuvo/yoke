import { createEffect, createMemo, createSignal, For, Show, type JSX } from 'solid-js'
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
  icon: typeof ComputerTerminal01Icon
}

const TOOL_META: Record<ToolName, ToolMeta> = {
  bash: { label: 'Shell', icon: ComputerTerminal01Icon },
  read: { label: 'Read', icon: AiViewIcon },
  write: { label: 'Write', icon: File01Icon },
  edit: { label: 'Edit', icon: PencilEdit02Icon },
  grep: { label: 'Grep', icon: Search01Icon },
  glob: { label: 'Glob', icon: AiSparklesIcon },
  list: { label: 'List', icon: Folder01Icon }
}

/** The one-line hint opencode shows next to a tool name. */
export function toolSummary(part: Extract<MessagePart, { type: 'tool' }>): string {
  const input = (part.input && typeof part.input === 'object' ? part.input : {}) as Record<string, unknown>
  const path = typeof input.path === 'string' ? input.path : undefined

  switch (part.name) {
    case 'bash':
      return typeof input.command === 'string' ? input.command : 'Run command'
    case 'edit':
    case 'write':
    case 'read':
      return path ?? 'File'
    case 'grep':
      return typeof input.pattern === 'string'
        ? `${input.pattern}${path ? ` in ${path}` : ''}`
        : 'Search'
    case 'glob':
      return typeof input.pattern === 'string' ? input.pattern : 'Find files'
    case 'list':
      return path ?? '.'
    default:
      return ''
  }
}

export function toolLabel(name: ToolName): string {
  return TOOL_META[name]?.label ?? name
}

/**
 * A compact opencode-style tool row: icon, label, one-line argument hint, and
 * a plain output/diff that expands underneath without card chrome.
 */
export function ToolCallCard(props: ToolCallCardProps): JSX.Element {
  const [open, setOpen] = createSignal(props.part.status === 'error')
  const [userToggled, setUserToggled] = createSignal(false)

  // Failed tools reveal their error; everything else stays compact until asked.
  createEffect(() => {
    if (userToggled()) return

    if (props.part.status === 'error') setOpen(true)
  })

  const meta = () => TOOL_META[props.part.name] ?? { label: props.part.name, icon: AiSparklesIcon }
  const input = () =>
    (props.part.input && typeof props.part.input === 'object' ? props.part.input : {}) as Record<string, unknown>
  const summary = createMemo(() => toolSummary(props.part))
  const hasDetails = () =>
    Boolean(props.part.output || props.part.error) || props.part.name === 'edit' || props.part.name === 'write'

  const toggle = () => {
    if (!hasDetails()) return
    setUserToggled(true)
    setOpen(!open())
  }

  return (
    <div class="flex w-full min-w-0 flex-col">
      <button
        type="button"
        onClick={toggle}
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
        <ToolOutput part={props.part} input={input()} />
      </Show>
    </div>
  )
}

function ToolOutput(props: {
  part: Extract<MessagePart, { type: 'tool' }>
  input: Record<string, unknown>
}): JSX.Element {
  const [copied, setCopied] = createSignal(false)

  const text = () => props.part.error ?? props.part.output ?? ''

  const copy = async () => {
    if (!text()) return

    try {
      await navigator.clipboard.writeText(text())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard failures.
    }
  }

  return (
    <div class="group/output mt-1 mb-1 ms-5 overflow-hidden rounded-md border border-line/70 bg-surface-soft">
      <div class="relative max-h-80 overflow-auto">
        <Show when={props.part.name === 'bash'}>
          <pre class="px-3 py-2 font-mono text-[12px] leading-[1.55] whitespace-pre-wrap break-words text-foreground-secondary">
            <span class="select-none text-foreground-muted/60">$ </span>
            {String(props.input.command ?? '')}
            {props.part.output ? `\n${props.part.output}` : ''}
          </pre>
        </Show>

        <Show when={props.part.name === 'edit'}>
          <EditDiff
            oldString={typeof props.input.oldString === 'string' ? props.input.oldString : ''}
            newString={typeof props.input.newString === 'string' ? props.input.newString : ''}
          />
        </Show>

        <Show when={props.part.name === 'write'}>
          <pre class="px-3 py-2 font-mono text-[12px] leading-[1.55] whitespace-pre-wrap break-words text-foreground-secondary">
            {typeof props.input.content === 'string' ? props.input.content : ''}
          </pre>
        </Show>

        <Show when={!['bash', 'edit', 'write'].includes(props.part.name)}>
          <pre class="px-3 py-2 font-mono text-[12px] leading-[1.55] whitespace-pre-wrap break-words text-foreground-secondary">
            {props.part.output ?? props.part.error ?? 'No output'}
          </pre>
        </Show>

        <Show when={props.part.name === 'edit' && props.part.output}>
          <pre class="border-t border-line/60 px-3 py-2 font-mono text-[12px] leading-[1.55] whitespace-pre-wrap break-words text-foreground-muted">
            {props.part.output}
          </pre>
        </Show>

        <Show when={props.part.status === 'error' && props.part.error}>
          <pre class="border-t border-danger/20 bg-danger/5 px-3 py-2 font-mono text-[12px] leading-[1.55] whitespace-pre-wrap break-words text-danger">
            {props.part.error}
          </pre>
        </Show>

        <Show when={text()}>
          <button
            type="button"
            onClick={copy}
            title={copied() ? 'Copied' : 'Copy output'}
            aria-label={copied() ? 'Copied' : 'Copy output'}
            class="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-surface/90 text-foreground-muted opacity-0 shadow-xs transition hover:text-foreground group-hover/output:opacity-100"
          >
            <HugeiconsIcon
              icon={copied() ? CheckmarkCircle02Icon : Copy01Icon}
              size={12}
              classList={{ 'text-green-600': copied() }}
            />
          </button>
        </Show>
      </div>
    </div>
  )
}

function EditDiff(props: { oldString: string; newString: string }): JSX.Element {
  const oldLines = createMemo(() => props.oldString.split('\n'))
  const newLines = createMemo(() => props.newString.split('\n'))

  return (
    <div class="font-mono text-[12px] leading-[1.55]">
      <For each={oldLines()}>
        {(line) => (
          <div class="flex bg-red-500/10 text-red-700">
            <span class="w-6 shrink-0 select-none text-right text-red-500/50">-</span>
            <pre class="min-w-0 flex-1 overflow-x-auto whitespace-pre px-2">{line || ' '}</pre>
          </div>
        )}
      </For>

      <For each={newLines()}>
        {(line) => (
          <div class="flex bg-green-500/10 text-green-700">
            <span class="w-6 shrink-0 select-none text-right text-green-600/50">+</span>
            <pre class="min-w-0 flex-1 overflow-x-auto whitespace-pre px-2">{line || ' '}</pre>
          </div>
        )}
      </For>
    </div>
  )
}
