import type { JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import FolderGit2Icon from '@hugeicons/core-free-icons/FolderGit2Icon'

/** A centered panel state: icon, title, and description. */
export function ReviewPanelEmpty(props: {
  icon: typeof FolderGit2Icon
  title: string
  description: string
}): JSX.Element {
  return (
    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 pb-12 text-center">
      <HugeiconsIcon icon={props.icon} size={22} class="text-foreground-muted/50" />
      <div class="text-[13px] font-[530] tracking-[-0.04px] text-foreground">{props.title}</div>
      <p class="max-w-60 text-[12px] leading-4 text-foreground-muted">{props.description}</p>
    </div>
  )
}

/** The session directory is missing or not inside a git repository. */
export function ReviewNotRepo(): JSX.Element {
  return (
    <ReviewPanelEmpty
      icon={FolderGit2Icon}
      title="Not a git repository"
      description="Review shows uncommitted changes for git repositories."
    />
  )
}

/** Every tracked and untracked change is committed. */
export function ReviewClean(): JSX.Element {
  return (
    <ReviewPanelEmpty
      icon={CheckmarkCircle02Icon}
      title="No changes"
      description="The working tree is clean. Files the agent edits will appear here."
    />
  )
}

/** A first load of the change summary or of a file's diff. */
export function ReviewLoading(props: { label?: string }): JSX.Element {
  return (
    <div class="flex min-h-0 flex-1 items-center justify-center pb-12 text-[12px] text-foreground-muted">
      {props.label ?? 'Loading…'}
    </div>
  )
}
