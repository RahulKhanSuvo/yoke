import type { AgentId, AgentInfo } from './ai'

/**
 * The agents shown in the composer. This mirrors opencode's idea of named
 * agents: each has its own system prompt, tool set, and step budget.
 */
export const AGENTS: AgentInfo[] = [
  {
    id: 'build',
    name: 'Build',
    description: 'Read and edit files, run commands',
    tools: [
      'read',
      'list',
      'glob',
      'grep',
      'write',
      'edit',
      'bash',
      'webfetch',
      'todowrite',
      'todoread',
      'question'
    ],
    steps: 12
  },
  {
    id: 'plan',
    name: 'Plan',
    description: 'Inspect the codebase without changing it',
    tools: ['read', 'list', 'glob', 'grep', 'webfetch', 'todoread', 'question'],
    steps: 8
  }
]

export const DEFAULT_AGENT_ID: AgentId = 'build'

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && AGENTS.some((agent) => agent.id === value)
}

export function findAgent(id: AgentId | string | undefined): AgentInfo {
  return AGENTS.find((agent) => agent.id === id) ?? AGENTS[0]
}
