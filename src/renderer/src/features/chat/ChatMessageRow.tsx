import { createMemo, createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import AiSparklesIcon from '@hugeicons/core-free-icons/AiSparklesIcon'
import type { MessagePart } from '@shared/ai'
import { MarkdownContent } from './MarkdownContent'
import { ToolCallCard } from './ToolCallCard'
import { ThinkingBlock } from './ThinkingBlock'

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

/**
 * OpenCode Desktop Turn:
 * - User messages with elevated pill styling, copy action on hover
 * - Assistant messages with agent header, thinking traces, rich markdown, and specialized tool cards
 */
export function ChatMessageRow(props: ChatMessageRowProps): JSX.Element {
  const [copied, setCopied] = createSignal(false)

  const parts = createMemo((): MessagePart[] => {
    if (props.message.parts?.length) return props.message.parts
    return props.message.text ? [{ type: 'text', text: props.message.text }] : []
  })

  const fullText = createMemo(() => {
    if (props.message.text) return props.message.text
    if (props.message.parts) {
      return props.message.parts
        .map((p) => {
          if (p.type === 'text') return p.text
          if (p.type === 'tool') return `[Tool: ${p.name}] ${p.output ?? ''}`
          return ''
        })
        .filter(Boolean)
        .join('\n\n')
    }
    return ''
  })

  const copy = async () => {
    const text = fullText()
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
    <div class="group/row py-3">
      <Show
        when={props.message.role === 'user'}
        fallback={
          /* Assistant Turn */
          <div class="flex flex-col gap-2">
            {/* Assistant Header */}
            <div class="flex items-center justify-between text-[12px] text-foreground-muted">
              <div class="flex items-center gap-2">
                <div class="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={AiSparklesIcon} size={13} />
                </div>
                <span class="font-medium text-foreground">Assistant</span>
              </div>

              {/* Hover Actions */}
              <button
                type="button"
                onClick={copy}
                class="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 rounded px-1.5 py-0.5 text-foreground-muted transition hover:bg-surface-mute hover:text-foreground"
                aria-label="Copy message"
              >
                <Show
                  when={copied()}
                  fallback={
                    <>
                      <HugeiconsIcon icon={Copy01Icon} size={12} />
                      <span class="text-[11px]">Copy</span>
                    </>
                  }
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} class="text-green-500" />
                  <span class="text-[11px] text-green-500">Copied</span>
                </Show>
              </button>
            </div>

            {/* Message Body (Interleaved Parts) */}
            <div class="space-y-2">
              <For each={parts()}>
                {(part) => {
                  if (part.type === 'text') {
                    return <MarkdownContent content={part.text} />
                  }
                  if (part.type === 'tool') {
                    return <ToolCallCard part={part} />
                  }
                  // Optional thinking / reasoning part
                  if ((part as any).type === 'reasoning') {
                    return <ThinkingBlock content={(part as any).text} active={props.streaming} />
                  }
                  return null
                }}
              </For>

              {/* Streaming typing cursor */}
              <Show when={props.streaming}>
                <div class="inline-flex items-center gap-1.5 py-1">
                  <span class="inline-block size-2 animate-ping rounded-full bg-primary/80" />
                  <span class="text-[12px] text-foreground-muted italic">Streaming…</span>
                </div>
              </Show>

              {/* Waiting for response state */}
              <Show when={parts().length === 0 && !props.streaming}>
                <TypingIndicator />
              </Show>
            </div>
          </div>
        }
      >
        {/* User Message Bubble */}
        <div class="flex justify-end">
          <div class="relative max-w-[85%] rounded-2xl rounded-tr-xs bg-neutral-900 px-4 py-3 text-[14px] leading-relaxed text-white shadow-xs dark:bg-neutral-800">
            <div class="whitespace-pre-wrap">{props.message.text}</div>

            {/* User Message Copy button on hover */}
            <button
              type="button"
              onClick={copy}
              class="absolute -top-3 right-2 opacity-0 group-hover/row:opacity-100 flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-foreground-muted shadow-xs transition hover:text-foreground"
              aria-label="Copy prompt"
            >
              <Show
                when={copied()}
                fallback={
                  <>
                    <HugeiconsIcon icon={Copy01Icon} size={11} />
                    <span>Copy</span>
                  </>
                }
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} class="text-green-500" />
                <span class="text-green-500">Copied</span>
              </Show>
            </button>
          </div>
        </div>
      </Show>
    </div>
  )
}

function TypingIndicator(): JSX.Element {
  return (
    <div class="inline-flex items-center gap-1 py-2 text-foreground-muted">
      <span class="size-1.5 animate-bounce rounded-full bg-foreground-muted/60 [animation-delay:-0.3s]" />
      <span class="size-1.5 animate-bounce rounded-full bg-foreground-muted/60 [animation-delay:-0.15s]" />
      <span class="size-1.5 animate-bounce rounded-full bg-foreground-muted/60" />
    </div>
  )
}
