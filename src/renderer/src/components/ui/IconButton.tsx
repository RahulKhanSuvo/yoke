import { JSX, mergeProps, splitProps } from 'solid-js'

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: JSX.Element
  label: string
}

/** A small, rounded icon-only button with an accessible label. */
export const IconButton = (props: IconButtonProps): JSX.Element => {
  // Use mergeProps to set default values for optional props like className
  const merged = mergeProps({ className: '' }, props)

  // Separate known custom props from the rest of the native button attributes
  const [local, rest] = splitProps(merged, ['children', 'label', 'className'])

  return (
    <button
      type="button"
      aria-label={local.label}
      class={`rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 ${local.className}`}
      {...rest}
    >
      {local.children}
    </button>
  )
}
