import type { ToolSet } from 'ai'

import type { ToolName } from '../../../shared/ai'
import type { ApprovalRequester } from '../approval.service'
import { createBashTool } from './bash'
import { createEditTool, createWriteTool } from './edit'
import { createListTool } from './list'
import { createReadTool } from './read'
import { createGlobTool, createGrepTool } from './search'

/**
 * Builds the tool set for one request. Tools are bound to the project
 * directory, so every path the model sends is resolved inside the project.
 * When an approval gate is given, bash commands require user approval.
 */
export function buildTools(directory: string, allowed: ToolName[], approval?: ApprovalRequester): ToolSet {
  const available: ToolSet = {
    read: createReadTool(directory),
    list: createListTool(directory),
    glob: createGlobTool(directory),
    grep: createGrepTool(directory),
    write: createWriteTool(directory),
    edit: createEditTool(directory),
    bash: createBashTool(directory, approval)
  }

  return Object.fromEntries(allowed.map((name) => [name, available[name]]))
}
