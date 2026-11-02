const PROJECTS_CHANGED = 'yoke:projects-changed'

/** Ask every mounted project list to reload from the main process. */
export function notifyProjectsChanged(): void {
  window.dispatchEvent(new Event(PROJECTS_CHANGED))
}

export function onProjectsChanged(handler: () => void): () => void {
  window.addEventListener(PROJECTS_CHANGED, handler)

  return () => window.removeEventListener(PROJECTS_CHANGED, handler)
}
