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
import { ProjectList } from '@renderer/features/projects/ProjectList'
import {
  notifyProjectsChanged,
  onProjectsChanged
} from '@renderer/features/projects/project-events'
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

  const [activeProjectIdSignal, setActiveProjectIdSignal] = createSignal<string>()
  const [busy, setBusy] = createSignal(false)
  const location = useLocation()

  // The URL is the source of truth for the active project, including direct navigation.
  const activeSessionId = () => {
    const match = location.pathname.match(/^\/sessions\/([^/?#]+)/)

    return match?.[1]
  }

  const activeProjectId = () => {
    const sessionId = activeSessionId()
    const list = projects() ?? []

    if (sessionId) {
      const owner = list.find((project) =>
        project.sessions.some((session) => session.id === sessionId)
      )

      if (owner) return owner.id
    }

    return activeProjectIdSignal()
  }

  /** Creates a session in the project root and opens it. */
  const createSession = async (project: { id: string; rootPath: string }) => {
    if (busy()) return

    setBusy(true)

    try {
      const session = await window.api.sessions.create(project.id, project.rootPath)

      setActiveProjectIdSignal(project.id)
      await refetch()
      notifyProjectsChanged()
      navigate(`/sessions/${session.id}`)
    } finally {
      setBusy(false)
    }
  }

  /** Opens the project's latest session, or starts a new one when it has none. */
  const openProject = (project: { id: string; rootPath: string; sessions: unknown[] }) => {
    const latest = (project.sessions as Array<{ id: string }>)[0]

    setActiveProjectIdSignal(project.id)

    if (latest) navigate(`/sessions/${latest.id}`)
    else void createSession(project)
  }

  const addProject = async () => {
    setBusy(true)

    try {
      const project = await window.api.projects.selectFolder()

      if (project) {
        setActiveProjectIdSignal(project.id)
        await refetch()
        notifyProjectsChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  const removeProject = async (projectId: string) => {
    const wasActive = activeProjectId() === projectId

    await window.api.projects.delete(projectId)

    if (wasActive) {
      setActiveProjectIdSignal(undefined)
      navigate('/')
    }

    await refetch()
    notifyProjectsChanged()
  }

  return (
    <aside id={id} class="flex h-full w-full flex-col overflow-hidden bg-surface-soft">
      <div class="flex h-12 shrink-0 items-center justify-between px-3">
        <NavItem
          icon={<HugeiconsIcon icon={DashboardSquareAddIcon} size={15} class="text-foreground-muted" />}
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
          <HugeiconsIcon icon={PanelLeftIcon} size={16} class="text-foreground-muted" />
        </IconButton>
      </div>

      <div class="flex flex-col gap-0.5 px-2 pt-2">
        <NavItem
          icon={<HugeiconsIcon icon={SearchIconData} size={15} class="text-foreground-muted" />}
          label="Search"
          shortcut={SEARCH_SHORTCUT}
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div class="flex shrink-0 items-center justify-between px-1 pb-1">
          <span class="text-[13px] font-medium tracking-wide text-foreground-muted">Projects</span>
          <IconButton
            label="Add project"
            class="p-1"
            disabled={busy()}
            onClick={() => void addProject()}
          >
            <HugeiconsIcon icon={FolderAddIcon} size={15} class="text-foreground-muted" />
          </IconButton>
        </div>

        <Show when={projects.error}>
          <div class="mx-1 mt-1 rounded-md border border-dashed border-danger/30 px-3 py-2 text-center">
            <p class="text-[12px] text-danger">Couldn't load projects</p>
          </div>
        </Show>

        <Show when={projects.loading && !projects()}>
          <p class="mx-1 mt-1 px-2 text-[12px] text-foreground-muted/70">Loading…</p>
        </Show>

        <ProjectList
          projects={projects() ?? []}
          activeProjectId={activeProjectId()}
          busy={busy()}
          onSelectProject={openProject}
          onNewSession={(project) => void createSession(project)}
          onRemoveProject={(project) => void removeProject(project.id)}
        />
      </div>

      <div class="shrink-0 border-t border-line p-2">
        <NavItem
          icon={<HugeiconsIcon icon={SettingsIconData} size={15} class="text-foreground-muted" />}
          label="Settings"
          onClick={() => navigate('/settings')}
        />
      </div>
    </aside>
  )
}
