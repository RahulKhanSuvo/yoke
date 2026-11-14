import { tool } from 'ai'
import { z } from 'zod'

const MAX_BYTES = 1_000_000
const MAX_CHARS = 50_000
const DEFAULT_TIMEOUT_MS = 30_000

/** Collapse an HTML document into rough readable text. */
function htmlToText(html: string): string {
  return (
    html
      // Remove scripts, styles, and other invisible blocks entirely.
      .replace(/<(script|style|noscript|template|svg|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Common block boundaries become line breaks.
      .replace(/<\/(p|div|section|article|header|footer|li|tr|h[1-6]|br)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      // Strip every remaining tag, then decode the usual entities.
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Tidy the whitespace.
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

/**
 * Fetches a URL and returns its content, like opencode's webfetch: the agent
 * can pull documentation and references into the conversation. Only http(s)
 * is allowed and the response is size-capped so a huge payload cannot flood
 * the context.
 */
export function createWebFetchTool() {
  return tool({
    description:
      'Fetch content from an HTTP or HTTPS URL and return it as text. Use it to read documentation, references, or raw files online.',
    inputSchema: z.object({
      url: z.string().describe('The HTTP or HTTPS URL to fetch content from'),
      format: z
        .enum(['text', 'markdown', 'html'])
        .optional()
        .describe('The format to return the content in. Defaults to text.'),
      timeout: z
        .number()
        .min(1)
        .max(120)
        .optional()
        .describe('Optional timeout in seconds (maximum 120)')
    }),
    execute: async ({
      url,
      format,
      timeout
    }: {
      url: string
      format?: 'text' | 'markdown' | 'html'
      timeout?: number
    }) => {
      let parsed: URL

      try {
        parsed = new URL(url)
      } catch {
        throw new Error(`Invalid URL: ${url}`)
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http and https URLs are supported')
      }

      const response = await fetch(parsed, {
        signal: AbortSignal.timeout((timeout ?? 0) * 1000 || DEFAULT_TIMEOUT_MS),
        headers: {
          // Some sites reject clients without an Accept header.
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5'
        },
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`)
      }

      const buffer = await response.arrayBuffer()
      const truncatedBytes = buffer.byteLength > MAX_BYTES
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, MAX_BYTES))

      const contentType = response.headers.get('content-type') ?? ''
      const isHtml = contentType.includes('html') || /^\s*<(!doctype|html)/i.test(text)

      let body: string

      // "html" returns the raw document; everything else gets readable text.
      if (format === 'html') body = text
      else if (isHtml && format !== 'markdown') body = htmlToText(text)
      else body = text

      if (body.length > MAX_CHARS) {
        body = `${body.slice(0, MAX_CHARS)}\n\n… (content truncated at ${MAX_CHARS} characters)`
      }

      const header = truncatedBytes ? '(response truncated at 1MB)\n\n' : ''

      return `${header}${body}`
    }
  })
}
