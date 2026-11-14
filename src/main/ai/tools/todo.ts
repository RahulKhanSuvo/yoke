import { tool } from 'ai'
import { z } from 'zod'

import { getAppState, setAppState } from '../../services/app-state.service'

const TODO_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const
type TodoStatus = (typeof TODO_STATUSES)[number]

interface Todo {
  content: string
  status: TodoStatus
}

const todoSchema = z.object({
  content: z.string().min(1).max(500).describe('Brief description of the task'),
  status: z
    .enum(TODO_STATUSES)
    .describe('Current status of the task: pending, in_progress, completed, cancelled')
})

/** Todos live per session in the app's key-value store. */
function keyFor(sessionId: string): string {
  return `yoke.session.todo.${sessionId}`
}

function readTodos(sessionId: string): Todo[] {
  try {
    const raw = getAppState(keyFor(sessionId))
    const parsed: unknown = raw ? JSON.parse(raw) : []

    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is Todo =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as Todo).content === 'string' &&
        TODO_STATUSES.includes((item as Todo).status)
    )
  } catch {
    return []
  }
}

/** Renders the list the way opencode shows todos: `[ ]`, `[•]`, `[x]`, `[-]`. */
function formatTodos(todos: Todo[]): string {
  if (todos.length === 0) return 'No todos yet'

  const glyph: Record<TodoStatus, string> = {
    pending: '[ ]',
    in_progress: '[•]',
    completed: '[x]',
    cancelled: '[-]'
  }

  return todos.map((todo) => `${glyph[todo.status]} ${todo.content}`).join('\n')
}

/** The session's task list, like opencode's todowrite/todoread pair. */
export function createTodoTools(sessionId: string | undefined) {
  const write = tool({
    description:
      'Write the session task list. Use it to track multi-step work: replace the whole list each time, keeping finished items completed.',
    inputSchema: z.object({
      todos: z.array(todoSchema).max(50).describe('The updated todo list')
    }),
    execute: async ({ todos }: { todos: Array<{ content: string; status: TodoStatus }> }) => {
      if (!sessionId) return 'Todos are not available without a session.'

      const list = todos.map((todo) => ({ content: todo.content, status: todo.status }))

      setAppState(keyFor(sessionId), JSON.stringify(list))

      return `Saved ${list.length} todo${list.length === 1 ? '' : 's'}:\n${formatTodos(list)}`
    }
  })

  const read = tool({
    description: 'Read the current session task list.',
    inputSchema: z.object({}),
    execute: async () => formatTodos(readTodos(sessionId ?? ''))
  })

  return { write, read }
}

export type TodoItem = Todo
