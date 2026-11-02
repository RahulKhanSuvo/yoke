import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import SourceCodeIcon from '@hugeicons/core-free-icons/SourceCodeIcon'
import type { MessagePart, ToolName } from '@shared/ai'

export interface ChatMessageView {
  id: string
  role: 'user' | 'assistant'
  text: string
  parts?: MessagePart[]
}

export interface ChatMessageRowProps {
  message: ChatMessageView
  streaming?: boolean
}

const TOOL_LABELS: Record<ToolName, string> = {
  read: 'Read',
  list: 'List',
  glob: 'Glob',
  grep: 'Search',
  write: 'Write',
  edit: 'Edit',
  bash: 'Run'
}

/** One transcript turn: user bubbles on the right, assistant parts on the left. */
export function ChatMessageRow(props: ChatMessageRowProps): JSX.Element {
  const parts = (): MessagePart[] => {
    if (props.message.parts?.length) return props.message.parts

    return props.message.text ? [{ type: 'text', text: props.message.text }] : []
  }

  return (
    <Show
      when={props.message.role === 'user'}
      fallback={
        <div class="flex flex-col gap-2 text-[14px] leading-7 text-foreground">
          <For each={parts()}>
            {(part) =>
              part.type === 'text' ? (
                <p class="whitespace-pre-wrap">{part.text}</p>
              ) : (
                <ToolCallRow part={part} />
              )
            }
          </For>

          <Show when={props.streaming && props.message.text}>
            <span class="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-neutral-400 align-middle" />
          </Show>

          <Show when={parts().length === 0}>
            <Typing />
          </Show>
        </div>
      }
    >
      <div class="flex justify-end">
        <div class="max-w-[85%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-2.5 text-[14px] leading-6 whitespace-pre-wrap text-white">
          {props.message.text}
        </div>
      </div>
    </Show>
  )
}

function ToolCallRow(props: { part: Extract<MessagePart, { type: 'tool' }> }): JSX.Element {
  return (
    <details class="group rounded-lg border border-line bg-surface">
      <summary class="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-[12.5px] text-neutral-600">
        <HugeiconsIcon icon={SourceCodeIcon} size={13} class="shrink-0 text-neutral-400" />
        <span class="shrink-0 font-medium text-neutral-700">{TOOL_LABELS[props.part.name]}</span>
        <span class="min-w-0 flex-1 truncate text-neutral-400">{summarize(props.part.input)}</span>
        <Show
          when={props.part.status === 'running'}
          fallback={
            <Show
              when={props.part.status === 'completed'}
              fallback={<span class="text-[11px] font-medium text-danger">failed</span>}
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={13}
                class="shrink-0 text-green-600"
              />
            </Show>
          }
        >
          <span class="size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-neutral-300 border-t-neutral-600" />
        </Show>
      </summary>

      <pre class="max-h-64 overflow-auto border-t border-line/70 px-2.5 py-2 text-[11.5px] leading-5 whitespace-pre-wrap text-neutral-600">
        {props.part.output ?? props.part.error ?? 'Running…'}
      </pre>
    </details>
  )
}

function summarize(input: unknown): string {
  if (!input || typeof input !== 'object') return ''

  const value = input as Record<string, unknown>

  if (typeof value.path === 'string') return value.path
  if (typeof value.command === 'string') return value.command
  if (typeof value.pattern === 'string') return value.pattern

  return ''
}

function Typing(): JSX.Element {
  return (
    <span class="inline-flex items-center gap-1 py-2" aria-label="Assistant is thinking">
      <span class="size-1.5 animate-bounce rounded-full bg-neutral-300 [animation-delay:-0.2s]" />
      <span class="size-1.5 animate-bounce rounded-full bg-neutral-300 [animation-delay:-0.1s]" />
      <span class="size-1.5 animate-bounce rounded-full bg-neutral-300" />
    </span>
  )
}
