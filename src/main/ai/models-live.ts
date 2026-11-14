/**
 * Live model availability, the way opencode does it: the models.dev registry
 * is the source of truth for which models a provider offers, and it is only
 * consulted for providers with a stored API key. The registry is curated —
 * chat models only, newest release per family — so junk like image, TTS,
 * music, and embedding endpoints never reaches the picker. The static catalog
 * stays as the offline fallback.
 */
import type { ModelInfo, ProviderId, ThinkingLevel } from '../../shared/ai'

const CACHE_TTL = 60 * 60 * 1000

const cache = new Map<ProviderId, { at: number; models: ModelInfo[] }>()

interface RegistryModel {
  id?: string
  name?: string
  reasoning?: boolean
  tool_call?: boolean
  family?: string
  release_date?: string
  limit?: { context?: number }
  modalities?: { output?: string[] }
  reasoning_options?: Array<{ type?: string; values?: string[] }>
}

interface Registry {
  at: number
  providers: Map<ProviderId, RegistryModel[]>
}

let registry: Registry | undefined

/** Registry entries older than six months are not "latest" material. */
const SIX_MONTHS = 6 * 30.436875 * 24 * 60 * 60 * 1000

/** Wire effort names → our thinking levels, like opencode's variant slugs. */
const EFFORT_LEVELS: Record<string, ThinkingLevel> = {
  minimal: 'low',
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'max',
  max: 'max'
}

/** Every level a reasoning model offers when the registry lists no efforts. */
const FALLBACK_LEVELS: ThinkingLevel[] = ['low', 'medium', 'high', 'max']

/** A model is worth listing when it is a text chat model, not an endpoint. */
const isChatModel = (model: RegistryModel): boolean =>
  model.tool_call !== false &&
  (!model.modalities?.output || model.modalities.output.includes('text'))

/** Thinking levels a model supports, read from its registry effort options. */
function thinkingLevels(model: RegistryModel): ThinkingLevel[] {
  const efforts = model.reasoning_options?.find((option) => option.type === 'effort')?.values ?? []
  const levels = [
    ...new Set(efforts.flatMap((effort) => (EFFORT_LEVELS[effort] ? [EFFORT_LEVELS[effort]] : [])))
  ]

  return levels.length > 0 || !model.reasoning ? levels : FALLBACK_LEVELS
}

/** opencode's `latestModels`: the newest release of each family, with recency. */
function curate(models: RegistryModel[]): RegistryModel[] {
  const byFamily = new Map<string, RegistryModel>()

  for (const model of models) {
    const family = model.family ?? model.id
    const previous = family ? byFamily.get(family) : undefined

    if (!family) continue
    if (!previous || (model.release_date ?? '') > (previous.release_date ?? ''))
      byFamily.set(family, model)
  }

  const latest = [...byFamily.values()]
  const fresh = latest.filter(
    (model) => !model.release_date || Date.now() - Date.parse(model.release_date) < SIX_MONTHS
  )

  return fresh.length > 0 ? fresh : latest
}

function toModelInfo(model: RegistryModel): ModelInfo {
  const levels = thinkingLevels(model)

  return {
    id: model.id ?? '',
    name: model.name ?? model.id ?? '',
    contextWindow: model.limit?.context,
    reasoning: levels.length > 0,
    ...(levels.length > 0 ? { levels } : {})
  }
}

/** Loads the registry once, cached in memory like the picker's hour window. */
async function loadRegistry(): Promise<Registry | undefined> {
  if (registry && Date.now() - registry.at < CACHE_TTL) return registry

  try {
    const response = await fetch('https://models.dev/api.json', {
      signal: AbortSignal.timeout(10_000)
    })

    if (!response.ok) throw new Error(`models.dev responded ${response.status}`)

    const body = (await response.json()) as Record<
      string,
      { models?: Record<string, RegistryModel> }
    >
    const providers = new Map<ProviderId, RegistryModel[]>()

    for (const providerId of ['anthropic', 'openai', 'google', 'openrouter'] as ProviderId[]) {
      providers.set(
        providerId,
        Object.values(body[providerId]?.models ?? {}).filter((model) => model.id)
      )
    }

    registry = { at: Date.now(), providers }

    return registry
  } catch {
    // Offline or registry hiccup: the previous load, if any, stays valid.
    return registry
  }
}

/** The provider's curated live model list, or undefined when nothing is reachable. */
export async function fetchProviderModels(
  providerId: ProviderId,
  _apiKey: string
): Promise<ModelInfo[] | undefined> {
  const cached = cache.get(providerId)

  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.models

  try {
    const current = await loadRegistry()
    const source = current?.providers.get(providerId)

    if (!source) throw new Error('Registry has no models for this provider')

    const models = curate(source.filter(isChatModel))
      .map(toModelInfo)
      .filter((model) => model.id)

    if (models.length === 0) throw new Error('Provider curated no models')

    cache.set(providerId, { at: Date.now(), models })

    return models
  } catch {
    // Registry unreachable: keep serving the last good list, else undefined
    // falls through to the static catalog.
    return cached?.models
  }
}

/**
 * The provider's full chat-model list, uncurated — used to keep a stored
 * model pick selectable even when a newer family release hides it.
 */
export async function fetchProviderChatModels(
  providerId: ProviderId,
  apiKey: string
): Promise<ModelInfo[] | undefined> {
  const current = await loadRegistry()
  const source = current?.providers.get(providerId)

  if (source) {
    return source
      .filter(isChatModel)
      .map(toModelInfo)
      .filter((model) => model.id)
  }

  return fetchProviderModels(providerId, apiKey)
}
