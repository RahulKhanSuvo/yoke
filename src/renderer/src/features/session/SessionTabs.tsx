import { createEffect, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import XIcon from '@hugeicons/core-free-icons/XIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import { pruneSessionTabs, sessionTabs, type SessionTab } from './session-tabs'

type ProjectWithSessions = Awaited<ReturnType<typeof window.api.projects.list>>[number]
type Session = ProjectWithSessions['sessions'][number]

export interface SessionTabsProps {
  projects?: ProjectWithSessions[]
  activeSessionId?: string
  onOpen: (tab: SessionTab) => void
  onClose: (sessionId: string) => void
  onNew: () => void
}

const AVATAR_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700'
]

/** Deterministic project color so a project keeps the same avatar between launches. */
function avatarColor(seed: string): string {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * Open sessions shown as vertical tabs, mirroring opencode's sidebar tabs.
 * Tabs are navigation state: closing one leaves the session in the project tree.
 */
export function SessionTabs(props: SessionTabsProps): JSX.Element {
  const sessionById = (id: string): Session | undefined => {
    for (const project of props.projects ?? []) {
      const session = project.sessions.find((item) => item.id === id)

      if (session) return session
    }

    return undefined
  }

  // Drop tabs for sessions that were deleted or whose project was removed.
  createEffect(() => {
    const projects = props.projects

    if (!projects) return

    const keep = props.activeSessionId ? new Set([props.activeSessionId]) : new Set<string>()

    pruneSessionTabs(
      new Set(projects.flatMap((project) => project.sessions.map((s) => s.id))),
      keep
    )
  })

  return (
    <section class="flex flex-col">
      <div class="flex items-center justify-between px-1 pb-1 pt-1">
        <span class="text-[13px] font-medium tracking-wide text-neutral-500">Sessions</span>
        <IconButton label="New session" class="p-1" onClick={props.onNew}>
          <HugeiconsIcon icon={PlusSignIcon} size={15} class="text-neutral-600" />
        </IconButton>
      </div>

      <div class="flex flex-col gap-0.5">
        <Show when={sessionTabs().length === 0}>
          <p class="px-2 py-1.5 text-[12px] text-neutral-400">No open sessions</p>
        </Show>

        <For each={sessionTabs()}>
          {(tab) => {
            const session = () => sessionById(tab.id)
            const active = () => props.activeSessionId === tab.id
            const busy = () => session()?.status === 'busy'

            return (
              <div
                class="group/tab flex items-center gap-0.5 rounded-md pr-0.5 transition-colors"
                classList={{
                  'bg-neutral-200/60 text-neutral-900': active(),
                  'text-neutral-600 hover:bg-neutral-100': !active()
                }}
              >
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300"
                  aria-current={active() ? 'page' : undefined}
                  title={`${tab.title} — ${tab.projectName}`}
                  onClick={() => props.onOpen(tab)}
                >
                  <span
                    class={`flex size-6 shrink-0 items-center justify-center rounded-[5px] ${avatarColor(tab.projectId)}`}
                  >
                    <HugeiconsIcon icon={Folder01Icon} size={13} />
                  </span>

                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-[12.5px] font-medium leading-4">{tab.title}</span>
                    <span class="truncate text-[11px] leading-4 text-neutral-400">
                      {tab.projectName}
                    </span>
                  </span>
                </button>

                <Show when={busy()}>
                  <span
                    class="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500"
                    aria-label="Session is busy"
                  />
                </Show>

                <IconButton
                  label={`Close ${tab.title}`}
                  class="p-1 opacity-0 transition-opacity hover:bg-neutral-200/70 focus-visible:opacity-100 group-hover/tab:opacity-100"
                  onClick={() => props.onClose(tab.id)}
                >
                  <HugeiconsIcon icon={XIcon} size={12} class="text-neutral-500" />
                </IconButton>
              </div>
            )
          }}
        </For>
      </div>
    </section>
  )
}
