/** Types shared between the main process, preload bridge, and renderer. */

export type ProviderId = 'openai' | 'google' | 'anthropic' | 'openrouter'

export interface ModelInfo {
  id: string
  name: string
  /** Approximate context window in tokens, used for the session usage ring. */
  contextWindow?: number
}

export interface ProviderInfo {
  id: ProviderId
  name: string
  /** Where the user creates an API key for this provider. */
  apiKeyUrl: string
  /** Listed under "Popular" in the integrations picker instead of "Services". */
  popular?: boolean
  models: ModelInfo[]
}

/** A provider plus whether an API key is currently stored for it. */
export interface ProviderStatus extends ProviderInfo {
  configured: boolean
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AgentId = 'build' | 'plan'

/** Tools an agent is allowed to call. */
export type ToolName = 'read' | 'list' | 'glob' | 'grep' | 'write' | 'edit' | 'bash'

export interface AgentInfo {
  id: AgentId
  name: string
  description: string
  tools: ToolName[]
  /** Maximum model/tool steps before the loop is forced to answer in text. */
  steps: number
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * One piece of an assistant turn. Text parts are streamed token by token,
 * reasoning parts stream the model's thinking, and tool parts are created on
 * `tool-call` and updated on `tool-result`.
 *
 * `providerMetadata` carries provider-specific data such as Gemini thought
 * signatures. It must survive persistence so replayed tool calls stay valid.
 */
export type MessagePart =
  | { type: 'text'; text: string; providerMetadata?: Record<string, unknown> }
  | { type: 'reasoning'; text: string; providerMetadata?: Record<string, unknown> }
  | {
      type: 'tool'
      toolCallId: string
      name: ToolName
      input: unknown
      status: 'running' | 'completed' | 'error'
      output?: string
      error?: string
      providerMetadata?: Record<string, unknown>
    }

/** Shape persisted in `session_message.data`. */
export interface SessionMessageData {
  text: string
  /** Ordered transcript of the turn (text, reasoning, and tool calls). */
  parts?: MessagePart[]
}

// ---------------------------------------------------------------------------
// IPC contracts
// ---------------------------------------------------------------------------

export interface ChatSendRequest {
  requestId: string
  sessionId: string
  providerId: ProviderId
  modelId: string
  agentId: AgentId
  prompt: string
}

export interface ChatStreamChunk {
  requestId: string
  text: string
}

/** A tool call was created or updated by the agent loop. */
export interface ChatStreamPart {
  requestId: string
  part: MessagePart
}

/** Token counts reported by the provider for one assistant turn. */
export interface AgentUsage {
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
}

export interface ChatStreamDone {
  requestId: string
  messageId: string
  text: string
  parts: MessagePart[]
  /** Accumulated provider usage for the turn, so the UI can update its ring. */
  tokens?: AgentUsage
}

export interface ChatStreamError {
  requestId: string
  message: string
}

// ---------------------------------------------------------------------------
// Tool approvals
// ---------------------------------------------------------------------------

/**
 * The main process asks the renderer to approve a privileged tool call
 * (currently `bash`) before it runs. Unanswered requests are denied.
 */
export interface ApprovalRequest {
  requestId: string
  approvalId: string
  command: string
}

export type ApprovalDecision = 'allow' | 'allow-session' | 'deny'

export interface ApprovalResponse {
  requestId: string
  approvalId: string
  decision: ApprovalDecision
}
