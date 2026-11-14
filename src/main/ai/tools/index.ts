import type { ToolSet } from 'ai'

import type { ToolName } from '../../../shared/ai'
import type { ApprovalRequester } from '../approval.service'
import { createBashTool } from './bash'
import { createEditTool, createWriteTool } from './edit'
import { createListTool } from './list'
import { createReadTool } from './read'
import { createQuestionTool, type QuestionAsker } from './question'
import { createGlobTool, createGrepTool } from './search'
import { createTodoTools } from './todo'
import { createWebFetchTool } from './webfetch'

/**
 * Builds the tool set for one request. Tools are bound to the project
 * directory, so every path the model sends is resolved inside the project.
 * When an approval gate is given, bash commands require user approval. The
 * session id scopes per-session data such as the todo list.
 */
export function buildTools(
  directory: string,
  allowed: ToolName[],
  approval?: ApprovalRequester,
  sessionId?: string,
  question?: QuestionAsker
): ToolSet {
  const todo = createTodoTools(sessionId)
  const available: ToolSet = {
    read: createReadTool(directory),
    list: createListTool(directory),
    glob: createGlobTool(directory),
    grep: createGrepTool(directory),
    write: createWriteTool(directory),
    edit: createEditTool(directory),
    bash: createBashTool(directory, approval),
    webfetch: createWebFetchTool(),
    todowrite: todo.write,
    todoread: todo.read,
    question: createQuestionTool(question)
  }

  return Object.fromEntries(allowed.map((name) => [name, available[name]]))
}
