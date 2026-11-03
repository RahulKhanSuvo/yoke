import {
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX
} from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon'
import Edit02Icon from '@hugeicons/core-free-icons/Edit02Icon'
import ChevronDownIcon from '@hugeicons/core-free-icons/ChevronDownIcon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import FolderAddIcon from '@hugeicons/core-free-icons/FolderAddIcon'
import MoreVerticalIcon from '@hugeicons/core-free-icons/MoreVerticalIcon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import XIcon from '@hugeicons/core-free-icons/XIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { aiStore } from '@renderer/features/ai/ai-store'
import { projectColor } from '@renderer/features/projects/project-color'
import {
  notifyProjectsChanged,
  onProjectsChanged
} from '@renderer/features/projects/project-events'
import { sessionTabs } from '@renderer/features/session/session-tabs'

type ProjectWithSessions = Awaited<ReturnType<typeof window.api.projects.list>>[number]
type Session = ProjectWithSessions['sessions'][number]

interface SessionRecord {
  session: Session
  project: ProjectWithSessions
}

type DayGroupId = 'today' | 'yesterday' | 'older'

const DAY_MS = 86_400_000

function dayGroup(time: number): DayGroupId {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDay = new Date(new Date(time).getFullYear(), new Date(time).getMonth(), new Date(time).getDate()).getTime()

  if (startOfDay === startOfToday) return 'today'
  if (startOfDay === startOfToday - DAY_MS) return 'yesterday'

  return 'older'
}

function HomeView(): JSX.Element {
  const navigate = useNavigate()

  const [projects, { refetch }] = createResource(async () => {
    if (!window.api) return []

    return window.api.projects.list()
  })

  const [query, setQuery] = createSignal('')
  const [selectedProjectId, setSelectedProjectId] = createSignal<string>()
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string>()

  // Sessions can be created or deleted elsewhere; follow those updates.
  onMount(() => {
    const dispose = onProjectsChanged(() => void refetch())
    onCleanup(dispose)
  })

  const selectedProject = () =>
    projects()?.find((project) => project.id === selectedProjectId())

  const records = createMemo<SessionRecord[]>(() =>
    (projects() ?? [])
      .flatMap((project) => project.sessions.map((session) => ({ session, project })))
      .filter((record) => !selectedProjectId() || record.project.id === selectedProjectId())
      .filter((record) => {
        const needle = query().trim().toLowerCase()

        return !needle || record.session.title.toLowerCase().includes(needle)
      })
      .sort((a, b) => b.session.time_updated - a.session.time_updated)
  )

  const groups = createMemo(() => {
    const buckets: Record<DayGroupId, SessionRecord[]> = { today: [], yesterday: [], older: [] }

    for (const record of records()) buckets[dayGroup(record.session.time_updated)].push(record)

    return [
      { id: 'today' as const, title: 'Today', sessions: buckets.today },
      { id: 'yesterday' as const, title: 'Yesterday', sessions: buckets.yesterday },
      { id: 'older' as const, title: 'Older', sessions: buckets.older }
    ].filter((group) => group.sessions.length > 0)
  })

  const isOpenTab = (sessionId: string) => sessionTabs().some((tab) => tab.id === sessionId)

  const searchPlaceholder = () =>
    selectedProject() ? `Search sessions in ${selectedProject()!.name}` : 'Search sessions'

  const createSession = async () => {
    if (busy() || !window.api) return

    setBusy(true)
    setError()

    try {
      const existing = selectedProject() ?? projects()?.[0]
      const target = existing ?? (await window.api.projects.selectFolder())

      if (!target) return

      if (!existing) notifyProjectsChanged()

      const session = await window.api.sessions.create(target.id, target.rootPath)

      await refetch()
      notifyProjectsChanged()
      navigate(`/sessions/${session.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start a session')
    } finally {
      setBusy(false)
    }
  }

  const addProject = async () => {
    if (busy() || !window.api) return

    setBusy(true)
    setError()

    try {
      const project = await window.api.projects.selectFolder()

      if (!project) return

      setSelectedProjectId(project.id)
      await refetch()
      notifyProjectsChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add the project')
    } finally {
      setBusy(false)
    }
  }

  const removeSession = async (session: SessionRecord) => {
    await window.api.sessions.delete(session.session.id)
    await refetch()
    notifyProjectsChanged()
  }

  return (
    <div class="flex h-full min-h-0 flex-col bg-surface">
      <div class="mx-auto grid h-full min-h-0 w-full max-w-[1080px] grid-cols-1 gap-4 px-3 lg:grid-cols-[280px_minmax(0,720px)] lg:gap-8 lg:px-6">
        {/* Projects, opencode's left rail: one row per project, plus "All projects". */}
        <aside class="hidden min-h-0 flex-col lg:flex lg:pt-14">
          <div class="flex h-7 shrink-0 items-center justify-between pl-1.5 pr-3">
            <span class="text-[13px] font-[530] text-foreground-muted">Projects</span>
            <IconButton
              label="Add project"
              class="p-1"
              disabled={busy()}
              onClick={() => void addProject()}
            >
              <HugeiconsIcon icon={FolderAddIcon} size={15} class="text-foreground-muted" />
            </IconButton>
          </div>

          <div class="mt-4 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto pr-3 pb-8">
            <button
              type="button"
              class="flex h-7 w-full shrink-0 items-center gap-2 rounded-[6px] px-1.5 text-left text-[13px] font-[440] transition-colors"
              classList={{
                'bg-surface-mute text-foreground': !selectedProjectId(),
                'text-foreground-muted hover:bg-foreground/[0.03] hover:text-foreground':
                  !!selectedProjectId()
              }}
              aria-current={!selectedProjectId() ? 'page' : undefined}
              onClick={() => setSelectedProjectId(undefined)}
            >
              <HugeiconsIcon icon={Folder01Icon} size={16} class="shrink-0 text-foreground-muted" />
              <span class="min-w-0 flex-1 truncate">All projects</span>
            </button>

            <For each={projects()}>
              {(project) => (
                <button
                  type="button"
                  class="flex h-7 w-full shrink-0 items-center gap-2 rounded-[6px] px-1.5 text-left text-[13px] font-[440] transition-colors"
                  classList={{
                    'bg-surface-mute text-foreground': selectedProjectId() === project.id,
                    'text-foreground-muted hover:bg-foreground/[0.03] hover:text-foreground':
                      selectedProjectId() !== project.id
                  }}
                  aria-current={selectedProjectId() === project.id ? 'page' : undefined}
                  title={project.rootPath}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <span
                    class={`flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-semibold ${projectColor(project.id)}`}
                  >
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span class="min-w-0 flex-1 truncate">{project.name}</span>
                </button>
              )}
            </For>

            <Show when={projects()?.length === 0}>
              <p class="px-1.5 pt-2 text-[12px] text-foreground-muted/70">No projects yet</p>
            </Show>
          </div>
        </aside>

        {/* Sessions, opencode's main column: search, New session, then date groups. */}
        <section class="flex min-h-0 flex-col">
          <div class="shrink-0 pt-3 lg:pt-12">
            {/* Below lg the projects rail is hidden; opencode swaps in a project dropdown. */}
            <div class="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger class="flex h-9 w-full min-w-0 items-center gap-2 rounded-[6px] bg-surface-mute/60 px-3 text-left text-[13px] font-[440] tracking-[-0.04px] text-foreground transition-colors hover:bg-surface-mute">
                  <Show
                    when={selectedProject()}
                    fallback={
                      <HugeiconsIcon
                        icon={Folder01Icon}
                        size={16}
                        class="shrink-0 text-foreground-muted"
                      />
                    }
                  >
                    {(project) => (
                      <span
                        class={`flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-semibold ${projectColor(project().id)}`}
                      >
                        {project().name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </Show>
                  <span class="min-w-0 flex-1 truncate">
                    {selectedProject()?.name ?? 'All projects'}
                  </span>
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    size={14}
                    class="shrink-0 text-foreground-muted"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent class="min-w-56">
                  <DropdownMenuItem
                    class="text-[12.5px]"
                    onSelect={() => setSelectedProjectId(undefined)}
                  >
                    <HugeiconsIcon icon={Folder01Icon} size={14} class="text-foreground-muted" />
                    All projects
                  </DropdownMenuItem>
                  <For each={projects()}>
                    {(project) => (
                      <DropdownMenuItem
                        class="text-[12.5px]"
                        onSelect={() => setSelectedProjectId(project.id)}
                      >
                        {project.name}
                      </DropdownMenuItem>
                    )}
                  </For>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <label class="mt-2 flex h-9 w-full items-center gap-2 rounded-[6px] bg-surface-mute/60 px-3 text-foreground-muted transition-colors hover:bg-surface-mute focus-within:bg-surface-mute lg:mt-0">
              <HugeiconsIcon icon={Search01Icon} size={16} class="shrink-0" />
              <input
                value={query()}
                placeholder={searchPlaceholder()}
                aria-label={searchPlaceholder()}
                class="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[440] tracking-[-0.04px] text-foreground outline-0 placeholder:text-foreground-muted/60"
                onInput={(event) => setQuery(event.currentTarget.value)}
              />
              <Show when={query()}>
                <button
                  type="button"
                  class="grid size-4 shrink-0 place-items-center rounded text-foreground-muted transition hover:text-foreground"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                >
                  <HugeiconsIcon icon={XIcon} size={12} />
                </button>
              </Show>
            </label>

            <div class="flex items-center justify-end gap-3 pt-2">
              <Show when={!aiStore.providers.loading && !aiStore.hasConfiguredProvider()}>
                <button
                  type="button"
                  class="text-[12.5px] text-foreground-muted transition hover:text-foreground"
                  onClick={() => navigate('/settings')}
                >
                  Connect an AI provider →
                </button>
              </Show>

              <button
                type="button"
                class="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-[530] text-foreground-muted transition-colors hover:bg-surface-mute hover:text-foreground disabled:opacity-60"
                disabled={busy()}
                onClick={() => void createSession()}
              >
                <HugeiconsIcon icon={Edit02Icon} size={14} />
                New session
              </button>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto pb-16 pr-3">
            <Show
              when={groups().length > 0}
              fallback={
                <div class="flex min-h-full flex-col items-center gap-4 px-6 pt-[52px] text-center">
                  <div class="text-[13px] font-[530] tracking-[-0.04px] text-foreground">
                    {query().trim() ? 'No sessions found' : 'Nothing here yet'}
                  </div>
                  <p class="mb-1 max-w-72 text-[13px] leading-5 tracking-[-0.04px] text-foreground-muted">
                    {query().trim()
                      ? `No sessions match "${query().trim()}".`
                      : 'Create a session to get started'}
                  </p>
                  <Show when={!query().trim()}>
                    <button
                      type="button"
                      class="flex h-7 items-center gap-1.5 rounded-md bg-surface-mute px-2.5 text-[13px] font-[530] text-foreground transition hover:bg-surface-mute/70 disabled:opacity-60"
                      disabled={busy()}
                      onClick={() => void createSession()}
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={14} />
                      New session
                    </button>
                  </Show>
                </div>
              }
            >
              <For each={groups()}>
                {(group) => (
                  <>
                    <div class="flex h-7 items-center ps-3 text-[13px] font-[440] tracking-[-0.04px] text-foreground-muted">
                      {group.title}
                    </div>
                    <div class="flex flex-col gap-px pt-2">
                      <For each={group.sessions}>
                        {(record) => (
                          <SessionRow
                            record={record}
                            open={isOpenTab(record.session.id)}
                            onOpen={() => navigate(`/sessions/${record.session.id}`)}
                            onDelete={() => void removeSession(record)}
                          />
                        )}
                      </For>
                    </div>
                  </>
                )}
              </For>
            </Show>

            <Show when={error()}>
              {(message) => <p class="px-3 pt-3 text-[12.5px] text-danger">{message()}</p>}
            </Show>
          </div>
        </section>
      </div>
    </div>
  )
}

/** One session row: project avatar, title, muted project name, and status. */
function SessionRow(props: {
  record: SessionRecord
  open: boolean
  onOpen: () => void
  onDelete: () => void
}): JSX.Element {
  const busy = () => props.record.session.status === 'busy'

  return (
    <div class="group/session relative flex h-10 min-w-0 items-center rounded-[6px]">
      <button
        type="button"
        class="flex h-10 min-w-0 w-full items-center gap-1.5 rounded-[6px] ps-3 pe-9 text-left text-[13px] font-[530] tracking-[-0.04px] text-foreground transition-colors hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:outline-none"
        onClick={props.onOpen}
      >
        <span class="relative shrink-0">
          <Show when={props.open}>
            <span
              aria-hidden="true"
              class="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-[2px] bg-foreground/20"
              style={{ right: 'calc(100% + 4px)' }}
            />
          </Show>
          <span
            class={`flex size-4 items-center justify-center rounded-[4px] text-[9px] font-semibold ${projectColor(props.record.project.id)}`}
          >
            {props.record.project.name.slice(0, 1).toUpperCase()}
          </span>
        </span>

        <span class="min-w-0 max-w-[min(70%,480px)] flex-[0_1_auto] truncate">
          {props.record.session.title}
        </span>
        <span class="min-w-0 flex-[1_1_auto] truncate text-[13px] font-[440] text-foreground-muted">
          {props.record.project.name}
        </span>

        <Show when={busy()}>
          <span
            class="ms-auto size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-line border-t-foreground group-hover/session:opacity-0"
            aria-label="Session is busy"
          />
        </Show>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          class="absolute right-1 flex size-6 items-center justify-center rounded-md text-foreground-muted opacity-0 transition hover:bg-surface-mute hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover/session:opacity-100 data-expanded:opacity-100"
          aria-label={`${props.record.session.title} options`}
        >
          <HugeiconsIcon icon={MoreVerticalIcon} size={30} />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="min-w-40">
          <DropdownMenuItem
            class="text-[12.5px] text-danger focus:bg-danger/10 focus:text-danger"
            onSelect={props.onDelete}
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} />
            Delete session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default HomeView
