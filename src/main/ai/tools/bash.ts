import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import { tool } from 'ai'
import { z } from 'zod'

const run = promisify(exec)

const MAX_OUTPUT = 40_000
const MAX_TIMEOUT = 120_000

/** Runs a shell command inside the project directory. */
export function createBashTool(directory: string) {
  return tool({
    description:
      'Run a shell command in the project directory. Use it for builds, tests, and git. Output is truncated.',
    inputSchema: z.object({
      command: z.string().describe('Shell command to run'),
      timeout: z
        .number()
        .int()
        .min(1_000)
        .max(MAX_TIMEOUT)
        .optional()
        .describe('Timeout in milliseconds')
    }),
    execute: async ({ command, timeout }) => {
      try {
        const { stdout, stderr } = await run(command, {
          cwd: directory,
          timeout: timeout ?? MAX_TIMEOUT,
          maxBuffer: 1024 * 1024,
          shell: '/bin/bash'
        })

        const output = [stdout, stderr].filter(Boolean).join('\n')

        return output.length > MAX_OUTPUT ? `${output.slice(0, MAX_OUTPUT)}\n… (truncated)` : output
      } catch (error) {
        const failure = error as { stdout?: string; stderr?: string; code?: number }

        return [
          `Command failed with exit code ${failure.code ?? 'unknown'}`,
          failure.stdout,
          failure.stderr
        ]
          .filter(Boolean)
          .join('\n')
          .slice(0, MAX_OUTPUT)
      }
    }
  })
}
