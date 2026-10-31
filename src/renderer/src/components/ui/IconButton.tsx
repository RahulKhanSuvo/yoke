import { splitProps, type JSX } from 'solid-js'

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: JSX.Element
  label: string
}

/** A small, rounded icon-only button with an accessible label. */
export const IconButton = (props: IconButtonProps): JSX.Element => {
  // Separate known custom props from the rest of the native button attributes, so a
  // passed `class` extends the base styles instead of replacing them via the spread.
  const [local, rest] = splitProps(props, ['children', 'label', 'class'])

  return (
    <button
      type="button"
      aria-label={local.label}
      class={`rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 ${local.class ?? ''}`}
      {...rest}
    >
      {local.children}
    </button>
  )
}
