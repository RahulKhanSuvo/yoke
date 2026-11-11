import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import { tool } from 'ai'
import { z } from 'zod'

import type { ApprovalRequester } from '../approval.service'

const run = promisify(exec)

const MAX_OUTPUT = 40_000
const MAX_TIMEOUT = 120_000

/**
 * Runs a shell command inside the project directory. Every command waits for
 * explicit user approval first, like opencode's bash permission prompt;
 * without approval the command never executes.
 */
export function createBashTool(directory: string, approval?: ApprovalRequester) {
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
    execute: async ({
      command,
      timeout
    }: {
      command: string
      timeout?: number
    }) => {
      if (approval && !(await approval.request(command))) {
        throw new Error('Command was not approved by the user')
      }

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
