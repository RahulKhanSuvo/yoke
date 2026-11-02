import { readFile } from 'node:fs/promises'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside } from './paths'

const MAX_CHARS = 60_000
const MAX_LINES = 2_000

/** Reads a text file and returns it with line numbers, like a code editor gutter. */
export function createReadTool(directory: string) {
  return tool({
    description:
      'Read a text file from the project. Returns the file with line numbers. Use offset/limit for large files.',
    inputSchema: z.object({
      path: z.string().describe('File path, relative to the project root'),
      offset: z.number().int().min(1).optional().describe('First line to return (1-based)'),
      limit: z.number().int().min(1).max(MAX_LINES).optional().describe('Number of lines to return')
    }),
    execute: async ({
      path,
      offset,
      limit
    }: {
      path: string
      offset?: number
      limit?: number
    }) => {
      const full = resolveInside(directory, path)
      let text = await readFile(full, 'utf8')

      if (text.length > MAX_CHARS) {
        text = `${text.slice(0, MAX_CHARS)}\n… (file truncated)`
      }

      const lines = text.split('\n')
      const start = (offset ?? 1) - 1
      const end = Math.min(limit ? start + limit : lines.length, lines.length)

      return lines
        .slice(start, end)
        .map((line, index) => `${start + index + 1}: ${line}`)
        .join('\n')
    }
  })
}
