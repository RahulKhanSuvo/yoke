import { tool } from 'ai'
import { z } from 'zod'

export interface QuestionAsker {
  ask(
    question: string,
    options: Array<{ label: string; description?: string }>,
    multiple: boolean,
    header?: string
  ): Promise<string[] | null>
}

/**
 * Lets the agent pause and ask the user a question with selectable options,
 * like opencode's question tool. The turn waits until the user answers or
 * the dialog expires.
 */
export function createQuestionTool(asker?: QuestionAsker) {
  return tool({
    description:
      'Ask the user a question with selectable options and wait for their answer. Use it when a decision needs the user\'s input, for example which approach to take. The user may pick one option, or several when "multiple" is true.',
    inputSchema: z.object({
      header: z
        .string()
        .max(30)
        .optional()
        .describe('Very short dialog title, at most 30 characters'),
      question: z.string().describe('Complete question to ask the user'),
      options: z
        .array(
          z.object({
            label: z
              .string()
              .min(1)
              .max(80)
              .describe('Short display text of the choice, 1-5 words'),
            description: z.string().optional().describe('Explanation of what the choice means')
          })
        )
        .min(1)
        .max(8)
        .describe('The options the user can choose from'),
      multiple: z
        .boolean()
        .optional()
        .describe('Allow selecting more than one option (default false)')
    }),
    execute: async ({
      header,
      question,
      options,
      multiple
    }: {
      header?: string
      question: string
      options: Array<{ label: string; description?: string }>
      multiple?: boolean
    }) => {
      if (!asker) return 'Questions are not available in this session.'

      const answers = await asker.ask(question, options, multiple ?? false, header)

      if (!answers || answers.length === 0) {
        return 'The user did not answer the question (dialog was dismissed or it expired). Continue without their input.'
      }

      return `User answered: ${answers.join(', ')}`
    }
  })
}
