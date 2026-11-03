import { createMemo, createSignal, Index, Match, Show, Switch, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import type { MessagePart } from '@shared/ai'
import { MarkdownContent } from './MarkdownContent'
import { ToolGroup } from './ToolGroup'

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

type TextBlock = { type: 'text'; part: Extract<MessagePart, { type: 'text' }> }
type ContextBlock = {
  type: 'context'
  parts: Extract<MessagePart, { type: 'reasoning' | 'tool' }>[]
}
type Block = TextBlock | ContextBlock

/**
 * One opencode-style turn. User prompts sit in a subtle right-aligned bubble;
 * assistant turns are an unlabelled stack of text, reasoning, and compact tool
 * groups.
 */
export function ChatMessageRow(props: ChatMessageRowProps): JSX.Element {
  const parts = createMemo((): MessagePart[] => {
    if (props.message.parts?.length) return props.message.parts
    return props.message.text ? [{ type: 'text', text: props.message.text }] : []
  })

  // Consecutive reasoning/tool parts share one group, matching opencode's
  // "Used N …" rows. Text parts break the group into a new block.
  const blocks = createMemo((): Block[] => {
    const result: Block[] = []

    for (const part of parts()) {
      if (part.type === 'text') {
        if (!part.text) continue

        result.push({ type: 'text', part })
        continue
      }

      const last = result[result.length - 1]

      if (last?.type === 'context') {
        last.parts.push(part)
      } else {
        result.push({ type: 'context', parts: [part] })
      }
    }

    return result
  })

  const copyText = createMemo(() =>
    parts()
      .filter((part): part is Extract<MessagePart, { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join('\n\n')
  )

  return (
    <Show
      when={props.message.role === 'user'}
      fallback={
        <div class="flex w-full min-w-0 flex-col gap-3">
          <Index each={blocks()}>
            {(block) => (
              <Switch>
                <Match when={block().type === 'text' ? (block() as TextBlock) : undefined}>
                  {(text) => (
                    <AssistantText
                      part={text().part}
                      copyText={copyText()}
                      streaming={props.streaming}
                    />
                  )}
                </Match>

                <Match when={block().type === 'context' ? (block() as ContextBlock) : undefined}>
                  {(context) => <ToolGroup parts={context().parts} busy={props.streaming} />}
                </Match>
              </Switch>
            )}
          </Index>
        </div>
      }
    >
      <UserMessage text={props.message.text} />
    </Show>
  )
}

function UserMessage(props: { text: string }): JSX.Element {
  const [copied, setCopied] = createSignal(false)

  const copy = async () => {
    if (!props.text) return

    try {
      await navigator.clipboard.writeText(props.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard failures.
    }
  }

  return (
    <div class="group/row flex w-full items-end justify-end gap-1.5">
      <button
        type="button"
        onClick={copy}
        title={copied() ? 'Copied' : 'Copy prompt'}
        aria-label={copied() ? 'Copied' : 'Copy prompt'}
        class="mb-1 flex size-6 shrink-0 items-center justify-center rounded-md text-foreground-muted opacity-0 transition hover:bg-surface-mute hover:text-foreground group-hover/row:opacity-100 focus-visible:opacity-100"
      >
        <HugeiconsIcon
          icon={copied() ? CheckmarkCircle02Icon : Copy01Icon}
          size={13}
          classList={{ 'text-green-600': copied() }}
        />
      </button>

      <div class="max-w-[min(82%,64ch)] rounded-[10px] bg-surface-mute px-3 py-2 text-[14px] leading-[1.5] tracking-[-0.04px] text-foreground whitespace-pre-wrap break-words">
        {props.text}
      </div>
    </div>
  )
}

function AssistantText(props: {
  part: Extract<MessagePart, { type: 'text' }>
  copyText: string
  streaming?: boolean
}): JSX.Element {
  const [copied, setCopied] = createSignal(false)

  const copy = async () => {
    if (!props.copyText) return

    try {
      await navigator.clipboard.writeText(props.copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard failures.
    }
  }

  return (
    <div class="group/text w-full min-w-0">
      <MarkdownContent content={props.part.text} />

      <Show when={!props.streaming}>
        <div class="mt-2 flex h-5 items-center">
          <button
            type="button"
            onClick={copy}
            title={copied() ? 'Copied' : 'Copy message'}
            aria-label={copied() ? 'Copied' : 'Copy message'}
            class="-ms-0.5 flex size-5 items-center justify-center rounded-md text-foreground-muted opacity-0 transition hover:bg-surface-mute hover:text-foreground group-hover/text:opacity-100 focus-visible:opacity-100"
          >
            <HugeiconsIcon
              icon={copied() ? CheckmarkCircle02Icon : Copy01Icon}
              size={13}
              classList={{ 'text-green-600': copied() }}
            />
          </button>
        </div>
      </Show>
    </div>
  )
}
