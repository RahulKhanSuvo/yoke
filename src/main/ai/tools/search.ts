import { readFile, stat } from 'node:fs/promises'
import { glob } from 'node:fs/promises'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside } from './paths'

const SKIP_DIRECTORIES = ['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage']
const MAX_RESULTS = 200
const MAX_MATCHES = 100
const MAX_FILE_BYTES = 512 * 1024

function isSkipped(path: string): boolean {
  return SKIP_DIRECTORIES.some((dir) => path === dir || path.startsWith(`${dir}/`))
}

/** Finds files by glob pattern (e.g. `src/**\/*.ts`). */
export function createGlobTool(directory: string) {
  return tool({
    description: 'Find files by glob pattern, for example "src/**/*.ts".',
    inputSchema: z.object({
      pattern: z.string().describe('Glob pattern relative to the project root'),
      path: z.string().optional().describe('Directory to search in')
    }),
    execute: async ({
      pattern,
      path
    }: {
      pattern: string
      path?: string
    }) => {
      const base = path ? resolveInside(directory, path) : directory
      const matches: string[] = []

      for await (const entry of glob(pattern, { cwd: base })) {
        if (isSkipped(entry)) continue

        matches.push(entry)

        if (matches.length >= MAX_RESULTS) break
      }

      return matches.length > 0 ? matches.sort().join('\n') : 'No files matched.'
    }
  })
}

/** Searches file contents with a JavaScript regular expression. */
export function createGrepTool(directory: string) {
  return tool({
    description:
      'Search file contents with a JavaScript regular expression. Returns "path:line: text" matches.',
    inputSchema: z.object({
      pattern: z.string().describe('JavaScript regular expression'),
      include: z.string().optional().describe('Glob filter, for example "**/*.ts"'),
      path: z.string().optional().describe('Directory to search in')
    }),
    execute: async ({
      pattern,
      include,
      path
    }: {
      pattern: string
      include?: string
      path?: string
    }) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (value) => `\\${value}`)

      let regex: RegExp

      try {
        regex = new RegExp(pattern)
      } catch {
        // Invalid regex: treat the input as literal text.
        regex = new RegExp(escaped)
      }

      const base = path ? resolveInside(directory, path) : directory
      const matches: string[] = []

      for await (const entry of glob(include ?? '**/*', { cwd: base })) {
        if (isSkipped(entry)) continue
        if (matches.length >= MAX_MATCHES) break

        const full = resolveInside(base, entry)

        try {
          const info = await stat(full)

          if (!info.isFile() || info.size > MAX_FILE_BYTES) continue

          const text = await readFile(full, 'utf8')

          if (text.includes('\u0000')) continue

          text.split('\n').forEach((line, index) => {
            if (matches.length >= MAX_MATCHES) return
            if (regex.test(line)) matches.push(`${entry}:${index + 1}: ${line.trim().slice(0, 300)}`)
          })
        } catch {
          // Binary or unreadable files are skipped.
        }
      }

      return matches.length > 0 ? matches.join('\n') : 'No matches found.'
    }
  })
}
