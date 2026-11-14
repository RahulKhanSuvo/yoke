import { createResource, createSignal } from 'solid-js'
import { deleteAppState, getAppState, setAppState } from '@renderer/lib/app-state'
import { isThinkingLevel } from '@shared/ai'
import type { AgentId, ModelInfo, ProviderId, ProviderStatus, ThinkingLevel } from '@shared/ai'
import { AGENTS, DEFAULT_AGENT_ID, findAgent, isAgentId } from '@shared/agents'

export interface SelectedModel {
  providerId: ProviderId
  modelId: string
}

const STORAGE_KEY = 'yoke.ai.selected-model'
const AGENT_STORAGE_KEY = 'yoke.ai.agent'
const THINKING_STORAGE_KEY = 'yoke.ai.thinking'

function readStoredModel(): SelectedModel | undefined {
  try {
    const raw = getAppState(STORAGE_KEY)
    if (!raw) return undefined

    const parsed = JSON.parse(raw) as Partial<SelectedModel>

    if (typeof parsed.providerId !== 'string' || typeof parsed.modelId !== 'string') {
      return undefined
    }

    return { providerId: parsed.providerId as ProviderId, modelId: parsed.modelId }
  } catch {
    return undefined
  }
}

const [providers, { refetch }] = createResource<ProviderStatus[]>(async () => {
  if (!window.api?.ai) return []

  return window.api.ai.providers()
})

const [picked, setPicked] = createSignal<SelectedModel | undefined>(readStoredModel())

function readStoredAgent(): AgentId {
  try {
    const raw = getAppState(AGENT_STORAGE_KEY)

    return isAgentId(raw) ? raw : DEFAULT_AGENT_ID
  } catch {
    return DEFAULT_AGENT_ID
  }
}

/** Selected thinking level, persisted like opencode's model variant. */
const readStoredThinking = (): ThinkingLevel => {
  const raw = getAppState(THINKING_STORAGE_KEY)

  // Legacy boolean values from the on/off toggle migrate to a real level.
  if (raw === '1') return 'medium'
  if (raw === '0' || raw === undefined) return 'default'

  return isThinkingLevel(raw) ? raw : 'default'
}

const [agentId, setAgentId] = createSignal<AgentId>(readStoredAgent())

const selectedAgent = () => findAgent(agentId())

const setSelectedAgent = (id: AgentId): void => {
  setAgentId(id)
  setAppState(AGENT_STORAGE_KEY, id)
}

const [thinking, setThinkingSignal] = createSignal<ThinkingLevel>(readStoredThinking())

const setThinking = (value: ThinkingLevel): void => {
  setThinkingSignal(value)
  setAppState(THINKING_STORAGE_KEY, value)
}

/** The selected model's thinking levels, falling back to the full ladder. */
const selectedModelThinkingLevels = (): ThinkingLevel[] => {
  const info = selectedModelInfo()

  if (!info) return []
  if (info.model.levels) return info.model.levels
  if (info.model.reasoning) return ['low', 'medium', 'high', 'max']

  return []
}

const provider = (id?: ProviderId): ProviderStatus | undefined =>
  providers()?.find((entry) => entry.id === id)

/**
 * The model that will actually be used: the persisted pick when it is still valid and
 * configured, otherwise the first model of the first configured provider.
 */
const selectedModel = (): SelectedModel | undefined => {
  const list = providers() ?? []
  const current = picked()

  if (current) {
    const entry = list.find((item) => item.id === current.providerId)
    const model = entry?.models.find((item) => item.id === current.modelId)

    if (entry?.configured && model) return current
  }

  for (const entry of list) {
    if (entry.configured && entry.models[0]) {
      return { providerId: entry.id, modelId: entry.models[0].id }
    }
  }

  return undefined
}

const selectedModelInfo = (): { provider: ProviderStatus; model: ModelInfo } | undefined => {
  const selection = selectedModel()

  if (!selection) return undefined

  const entry = provider(selection.providerId)
  const model = entry?.models.find((item) => item.id === selection.modelId)

  return entry && model ? { provider: entry, model } : undefined
}

const setSelectedModel = (selection?: SelectedModel): void => {
  setPicked(selection)

  if (selection) setAppState(STORAGE_KEY, JSON.stringify(selection))
  else deleteAppState(STORAGE_KEY)
}

const refreshProviders = async (): Promise<void> => {
  await refetch()
}

export const aiStore = {
  providers,
  provider,
  selectedModel,
  selectedModelInfo,
  setSelectedModel,
  refreshProviders,
  agents: AGENTS,
  selectedAgent,
  setSelectedAgent,
  /** Whether the current model offers extended thinking at all. */
  selectedModelSupportsThinking: () => selectedModelThinkingLevels().length > 0,
  /** The thinking levels the current model supports, for the menu. */
  selectedModelThinkingLevels,
  thinking,
  setThinking,
  /** True once at least one provider has a stored API key. */
  hasConfiguredProvider: () => (providers() ?? []).some((entry) => entry.configured)
}
