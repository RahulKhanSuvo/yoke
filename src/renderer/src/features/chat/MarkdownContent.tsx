import { createMemo, createSignal, For, Show, type JSX } from 'solid-js'
import { marked } from 'marked'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'

interface MarkdownContentProps {
  content: string
  class?: string
}

interface CodeBlock {
  id: string
  language: string
  code: string
}

export function MarkdownContent(props: MarkdownContentProps): JSX.Element {
  // Extract and replace code blocks with unique placeholders so Solid can render
  // interactive CodeBlock widgets with working Copy buttons and headers.
  const parsed = createMemo(() => {
    const raw = props.content ?? ''
    const blocks: CodeBlock[] = []
    let counter = 0

    const tokenized = raw.replace(
      /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
      (_, lang, code) => {
        const id = `__YOKE_CODE_${counter++}__`
        blocks.push({
          id,
          language: lang || 'text',
          code: code.trimEnd()
        })
        return `<div data-code-block="${id}"></div>`
      }
    )

    const html = marked.parse(tokenized, {
      gfm: true,
      breaks: true
    }) as string

    return { html, blocks }
  })

  // Split HTML around the data-code-block placeholders
  const segments = createMemo(() => {
    const { html, blocks } = parsed()
    const parts: Array<{ type: 'html'; content: string } | { type: 'code'; block: CodeBlock }> = []

    const regex = /<div data-code-block="(__YOKE_CODE_\d+__)"><\/div>/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'html',
          content: html.slice(lastIndex, match.index)
        })
      }

      const block = blocks.find((b) => b.id === match![1])
      if (block) {
        parts.push({ type: 'code', block })
      }

      lastIndex = regex.lastIndex
    }

    if (lastIndex < html.length) {
      parts.push({
        type: 'html',
        content: html.slice(lastIndex)
      })
    }

    return parts
  })

  return (
    <div
      class={`markdown-content max-w-none text-[14px] leading-[1.6] tracking-[-0.04px] text-foreground ${
        props.class ?? ''
      }`}
    >
      <For each={segments()}>
        {(segment) =>
          segment.type === 'html' ? (
            <div
              class="markdown-html [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-3 [&_h1]:mt-7 [&_h1]:mb-3 [&_h1]:text-[17px] [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2.5 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-[14px] [&_h3]:font-semibold [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-foreground-secondary [&_blockquote]:italic [&_code]:rounded [&_code]:bg-surface-mute [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-line [&_th]:bg-surface-soft [&_th]:p-2 [&_td]:border [&_td]:border-line [&_td]:p-2 [&_hr]:my-6 [&_hr]:border-line"
              innerHTML={segment.content}
            />
          ) : (
            <CodeBlockView block={segment.block} />
          )
        }
      </For>
    </div>
  )
}

function CodeBlockView(props: { block: CodeBlock }): JSX.Element {
  const [copied, setCopied] = createSignal(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.block.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard error
    }
  }

  const lines = createMemo(() => props.block.code.split('\n'))

  return (
    <div class="my-3 overflow-hidden rounded-lg border border-line bg-surface-soft">
      <div class="flex items-center justify-between border-b border-line/70 bg-surface px-3 py-1.5 text-[11.5px]">
        <span class="font-mono font-medium text-foreground-secondary uppercase tracking-wider">
          {props.block.language}
        </span>
        <button
          type="button"
          onClick={copy}
          class="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-foreground-muted transition hover:bg-surface-mute hover:text-foreground"
          aria-label="Copy code"
        >
          <Show
            when={copied()}
            fallback={
              <>
                <HugeiconsIcon icon={Copy01Icon} size={13} />
                <span>Copy</span>
              </>
            }
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} class="text-green-500" />
            <span class="text-green-500 font-medium">Copied</span>
          </Show>
        </button>
      </div>

      <div class="overflow-x-auto p-3 font-mono text-[12px] leading-5">
        <table class="w-full border-collapse">
          <tbody>
            <For each={lines()}>
              {(line, idx) => (
                <tr class="hover:bg-surface-mute/40">
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
