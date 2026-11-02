import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside } from './paths'

/** Creates or overwrites a file, including missing parent directories. */
export function createWriteTool(directory: string) {
  return tool({
    description: 'Create a file or replace its full contents. Parent directories are created.',
    inputSchema: z.object({
      path: z.string().describe('File path, relative to the project root'),
      content: z.string().describe('The complete new file contents')
    }),
    execute: async ({ path, content }) => {
      const full = resolveInside(directory, path)

      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, content, 'utf8')

      return `Wrote ${content.length} characters to ${path}`
    }
  })
}

/**
 * Replaces an exact string in a file. Requiring `oldString` to be unique keeps
 * edits predictable and surfaces ambiguous matches instead of guessing.
 */
export function createEditTool(directory: string) {
  return tool({
    description:
      'Replace an exact string in a file. oldString must match exactly once unless replaceAll is true.',
    inputSchema: z.object({
      path: z.string().describe('File path, relative to the project root'),
      oldString: z.string().describe('Exact text to replace'),
      newString: z.string().describe('Replacement text'),
      replaceAll: z.boolean().optional().describe('Replace every occurrence')
    }),
    execute: async ({ path, oldString, newString, replaceAll }) => {
      const full = resolveInside(directory, path)
      const text = await readFile(full, 'utf8')
      const occurrences = text.split(oldString).length - 1

      if (occurrences === 0) {
        throw new Error(`oldString was not found in ${path}`)
      }

      if (!replaceAll && occurrences > 1) {
        throw new Error(
          `oldString matches ${occurrences} times in ${path}. Add more context or set replaceAll.`
        )
      }

      const updated = replaceAll
        ? text.split(oldString).join(newString)
        : text.replace(oldString, newString)

      await writeFile(full, updated, 'utf8')

      return `Updated ${path} (${replaceAll ? occurrences : 1} replacement${occurrences === 1 ? '' : 's'})`
    }
  })
}
