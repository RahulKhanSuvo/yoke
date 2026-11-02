import { createResource, createSignal, createUniqueId, onCleanup, onMount, Show } from 'solid-js'
import { useLocation, useNavigate } from '@solidjs/router'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import {
  FolderAddIcon,
  PanelLeftIcon,
  SearchIcon as SearchIconData,
  SettingsIcon as SettingsIconData
} from '@hugeicons/core-free-icons'
import DashboardSquareAddIcon from '@hugeicons/core-free-icons/DashboardSquareAddIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import { NavItem } from '@renderer/components/ui/NavItem'
import { ProjectTree } from '@renderer/features/projects/ProjectTree'
import {
  notifyProjectsChanged,
  onProjectsChanged
} from '@renderer/features/projects/project-events'
import { SessionTabs } from '@renderer/features/session/SessionTabs'
import { closeSessionTab, sessionTabs } from '@renderer/features/session/session-tabs'
import { useSidebar } from '../context/sidebar-state'

const SEARCH_SHORTCUT = /Mac/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'

export const AppSidebar = () => {
  const sidebar = useSidebar()
  const navigate = useNavigate()
  // The sidebar renders twice while peeking (docked column + overlay), so each instance needs its own id.
  const id = createUniqueId()

  const [projects, { refetch }] = createResource(async () => {
    if (!window.api) return []
    return window.api.projects.list()
  })

  // Other screens (home, chat) can start sessions too, so follow their updates.
  onMount(() => {
    const dispose = onProjectsChanged(() => void refetch())
    onCleanup(dispose)
  })

  const [activeProjectId, setActiveProjectId] = createSignal<string>()
  const [busy, setBusy] = createSignal(false)
  const location = useLocation()

  // The URL is the source of truth for the active tab, including direct navigation.
  const activeSessionId = () => {
    const match = location.pathname.match(/^\/sessions\/([^/?#]+)/)

    return match?.[1]
  }

  const activeProject = () => {
    const sessionId = activeSessionId()
    const list = projects() ?? []

    if (sessionId) {
      const owner = list.find((project) =>
        project.sessions.some((session) => session.id === sessionId)
      )

      if (owner) return owner
    }

    return list.find((project) => project.id === activeProjectId()) ?? list[0]
  }

  /** The tab to open after closing/deleting `sessionId`, preferring the next one. */
  const tabAfter = (sessionId: string): string | undefined => {
    const open = sessionTabs()
    const index = open.findIndex((tab) => tab.id === sessionId)

    return open[index + 1]?.id ?? open[index - 1]?.id
  }

  const addProject = async () => {
    setBusy(true)

    try {
      const project = await window.api.projects.selectFolder()

      if (project) {
        setActiveProjectId(project.id)
        await refetch()
        notifyProjectsChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  const newSession = async () => {
    const project = activeProject()

    if (!project) {
      navigate('/')

      return
    }

    setBusy(true)

    try {
      const session = await window.api.sessions.create(project.id, project.rootPath)

      await refetch()
      notifyProjectsChanged()
      navigate(`/sessions/${session.id}`)
    } finally {
      setBusy(false)
    }
  }

  const closeTab = (sessionId: string) => {
    const next = tabAfter(sessionId)

    closeSessionTab(sessionId)

    if (activeSessionId() === sessionId) {
      navigate(next ? `/sessions/${next}` : '/')
    }
  }

  const removeProject = async (projectId: string) => {
    const wasActive = activeProject()?.id === projectId

    await window.api.projects.delete(projectId)

    if (wasActive) {
      setActiveProjectId(undefined)
      navigate('/')
    }

    await refetch()
    notifyProjectsChanged()
  }

  const removeSession = async (sessionId: string) => {
    const next = tabAfter(sessionId)
    const wasActive = activeSessionId() === sessionId

    await window.api.sessions.delete(sessionId)
    closeSessionTab(sessionId)

    if (wasActive) {
      navigate(next ? `/sessions/${next}` : '/')
    }

    await refetch()
    notifyProjectsChanged()
  }

  return (
    <aside id={id} class="flex h-full w-full flex-col overflow-hidden">
      <div class="flex h-12 shrink-0 items-center justify-between px-3">
        <NavItem
          icon={<HugeiconsIcon icon={DashboardSquareAddIcon} size={15} class="text-neutral-400" />}
          label="Home"
          onClick={() => navigate('/')}
        />
        <IconButton
          label={sidebar.collapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebar.collapsed()}
          aria-controls={id}
          class="p-1"
          onClick={sidebar.toggle}
        >
          <HugeiconsIcon icon={PanelLeftIcon} size={16} class="text-neutral-400" />
        </IconButton>
      </div>

      <div class="flex flex-col gap-0.5 px-2 pt-2">
        <NavItem
          icon={<HugeiconsIcon icon={SearchIconData} size={15} class="text-neutral-400" />}
          label="Search"
          shortcut={SEARCH_SHORTCUT}
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <SessionTabs
          projects={projects()}
          activeSessionId={activeSessionId()}
          onNew={() => void newSession()}
          onClose={closeTab}
          onOpen={(tab) => {
            setActiveProjectId(tab.projectId)
            navigate(`/sessions/${tab.id}`)
          }}
        />

        <div class="mt-4 flex shrink-0 items-center justify-between px-1 pb-1">
          <span class="text-[13px] font-medium tracking-wide text-neutral-500">Projects</span>
          <IconButton
            label="Add project"
            class="p-1"
            disabled={busy()}
            onClick={() => void addProject()}
          >
            <HugeiconsIcon icon={FolderAddIcon} size={15} class="text-neutral-600" />
          </IconButton>
        </div>

        <Show when={projects.error}>
          <div class="mx-1 mt-1 rounded-md border border-dashed border-red-200 px-3 py-2 text-center">
            <p class="text-[12px] text-red-500">Couldn't load projects</p>
          </div>
        </Show>

        <Show when={projects.loading && !projects()}>
          <p class="mx-1 mt-1 px-2 text-[12px] text-neutral-400">Loading…</p>
        </Show>

        <Show when={projects()?.length === 0}>
          <div class="mx-1 mt-1 rounded-md border border-dashed border-neutral-200 px-3 py-2 text-center">
            <p class="text-[12px] text-neutral-500">No projects yet</p>
          </div>
        </Show>

        <ProjectTree
          projects={projects() ?? []}
          activeProjectId={activeProjectId()}
          activeSessionId={activeSessionId()}
          onRefresh={refetch}
          onSelectProject={(project) => {
            setActiveProjectId(project.id)
          }}
          onSelectSession={(session) => {
            setActiveProjectId(session.projectId)
            navigate(`/sessions/${session.id}`)
          }}
          onDeleteSession={(session) => void removeSession(session.id)}
          onRemoveProject={(project) => void removeProject(project.id)}
        />
      </div>

      <div class="shrink-0 border-t border-neutral-200/70 p-2">
        <NavItem
          icon={<HugeiconsIcon icon={SettingsIconData} size={15} class="text-neutral-400" />}
          label="Settings"
          onClick={() => navigate('/settings')}
        />
      </div>
    </aside>
  )
}
