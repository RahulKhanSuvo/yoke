import { JSX, mergeProps, splitProps } from 'solid-js'

export interface NavItemProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: JSX.Element
  label: string
  shortcut?: string
  active?: boolean
}

/** A single icon + label row used in the sidebar navigation. */
export const NavItem = (props: NavItemProps): JSX.Element => {
  const merged = mergeProps({ active: false, className: '' }, props)
  const [local, rest] = splitProps(merged, ['icon', 'label', 'shortcut', 'active', 'className'])

  return (
    <button
      type="button"
      class={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.75 text-left text-[13px] transition-colors ${
        local.active
          ? 'bg-surface-mute text-foreground'
          : 'text-foreground-secondary hover:bg-foreground/[0.03] hover:text-foreground'
      } ${local.className}`}
      {...rest}
    >
      <span class="shrink-0 text-foreground-muted">{local.icon}</span>
      <span class="flex-1 truncate">{local.label}</span>
      {local.shortcut && (
        <span class="shrink-0 text-[11px] text-neutral-400">{local.shortcut}</span>
      )}
    </button>
  )
}
