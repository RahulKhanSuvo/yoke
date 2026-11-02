import { readdir } from 'node:fs/promises'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside } from './paths'

/** Lists a directory so the agent can discover the project layout. */
export function createListTool(directory: string) {
  return tool({
    description:
      'List the entries of a project directory. Directories end with a slash. Use "." for the project root.',
    inputSchema: z.object({
      path: z.string().describe('Directory path, relative to the project root')
    }),
    execute: async ({ path }) => {
      const full = resolveInside(directory, path)
      const entries = await readdir(full, { withFileTypes: true })

      return entries
        .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
        .sort((a, b) => a.localeCompare(b))
        .join('\n')
    }
  })
}
