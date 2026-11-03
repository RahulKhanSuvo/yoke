/** Stable, light-theme avatar palettes keyed by a project id. */
const PROJECT_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700'
]

/**
 * Deterministic project color so a project keeps the same avatar between
 * launches and across the sidebar tabs and the session header.
 */
export function projectColor(seed: string): string {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }

  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}
