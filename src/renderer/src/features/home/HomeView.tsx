import { createResource, createSignal, Show, type JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ChevronRightIcon from '@hugeicons/core-free-icons/ChevronRightIcon'
import { PixelText } from '@renderer/components/ui/PixelText'
import { ChatComposer } from '@renderer/features/chat/ChatComposer'
import { ProjectMeta } from '@renderer/features/chat/ProjectMeta'
import { aiStore } from '@renderer/features/ai/ai-store'
import { notifyProjectsChanged } from '@renderer/features/projects/project-events'

function HomeView(): JSX.Element {
  const navigate = useNavigate()

  const [projects] = createResource(async () => {
    if (!window.api) return []
    return window.api.projects.list()
  })

  const [draft, setDraft] = createSignal('')
  const [creating, setCreating] = createSignal(false)
  const [error, setError] = createSignal<string>()

  // New sessions go into the most recently used project unless none exists yet.
  const project = () => projects()?.[0]

  const startSession = async () => {
    const prompt = draft().trim()

    if (!prompt || creating() || !window.api) return

    setCreating(true)
    setError()

    try {
      const existing = project()
      const target = existing ?? (await window.api.projects.selectFolder())

      if (!target) return

      if (!existing) notifyProjectsChanged()

      const session = await window.api.sessions.create(target.id, target.rootPath)

      notifyProjectsChanged()
      setDraft('')
      navigate(`/sessions/${session.id}?prompt=${encodeURIComponent(prompt)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start a session')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div class="flex h-full flex-col bg-surface-soft">
      <div class="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <PixelText text="yoke" pixel={14} class="text-neutral-200" />

        <div class="flex w-full max-w-180 flex-col gap-3">
          <ChatComposer
            value={draft()}
            onValueChange={setDraft}
            onSubmit={() => void startSession()}
            disabled={creating()}
          />

          <Show
            when={project()}
            fallback={
              <p class="px-1 text-[12.5px] text-neutral-500">
                No project yet — your first message will ask you to choose a folder.
              </p>
            }
          >
            {(active) => <ProjectMeta name={active().name} path={active().rootPath} />}
          </Show>

          <Show when={!aiStore.providers.loading && !aiStore.hasConfiguredProvider()}>
            <button
              type="button"
              class="px-1 text-left text-[12.5px] text-neutral-500 transition hover:text-neutral-800"
              onClick={() => navigate('/settings')}
            >
              Connect an AI provider to start chatting →
            </button>
          </Show>

          <Show when={error()}>
            {(message) => <p class="px-1 text-[12.5px] text-danger">{message()}</p>}
          </Show>
        </div>
      </div>

      {/* Footer hint */}
      <footer class="flex justify-center pb-6">
        <button
          type="button"
          class="flex items-center gap-1 text-[13px] text-neutral-500 transition hover:text-neutral-700"
          onClick={() => navigate('/settings')}
        >
          Connect to 75+ providers to use other models, including Claude, GPT, Gemini, etc
          <HugeiconsIcon icon={ChevronRightIcon} size={14} class="text-neutral-400" />
        </button>
      </footer>
    </div>
  )
}

export default HomeView
