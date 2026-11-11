/**
 * The sidebar toggle's two icons, copied path-for-path from opencode's
 * `layout-left-full` / `layout-left` so the toggle reads exactly like theirs:
 * the filled panel while the sidebar rests open, the hairline outline one when
 * closed. Both live on opencode's 20x20 icon grid.
 */
import type { JSX } from 'solid-js'

/** opencode's `layout-left-full`: the left panel filled, the frame stroked. */
const FULL_BODY =
  '<path d="M2.91732 2.91602L7.91732 2.91602L7.91732 17.0827H2.91732L2.91732 2.91602Z" fill="currentColor"/><path d="M2.91732 2.91602L17.084 2.91602M2.91732 2.91602L2.91732 17.0827M2.91732 2.91602L7.91732 2.91602M17.084 2.91602L17.084 17.0827M17.084 2.91602L7.91732 2.91602M17.084 17.0827L2.91732 17.0827M17.084 17.0827L7.91732 17.0827M2.91732 17.0827H7.91732M7.91732 17.0827L7.91732 2.91602" stroke="currentColor" stroke-linecap="square"/>'

/** opencode's `layout-left`: the whole frame and divider as hairline strokes. */
const CLOSED_BODY =
  '<path d="M2.91675 2.91699L2.91675 2.41699L2.41675 2.41699L2.41675 2.91699L2.91675 2.91699ZM17.0834 2.91699L17.5834 2.91699L17.5834 2.41699L17.0834 2.41699L17.0834 2.91699ZM17.0834 17.0837L17.0834 17.5837L17.5834 17.5837L17.5834 17.0837L17.0834 17.0837ZM2.91675 17.0837L2.41675 17.0837L2.41675 17.5837L2.91675 17.5837L2.91675 17.0837ZM7.41674 17.0837L7.41674 17.5837L8.41674 17.5837L8.41674 17.0837L7.91674 17.0837L7.41674 17.0837ZM8.41674 2.91699L8.41674 2.41699L7.41674 2.41699L7.41674 2.91699L7.91674 2.91699L8.41674 2.91699ZM2.91675 2.91699L2.91675 3.41699L17.0834 3.41699L17.0834 2.91699L17.0834 2.41699L2.91675 2.41699L2.91675 2.91699ZM17.0834 2.91699L16.5834 2.91699L16.5834 17.0837L17.0834 17.0837L17.5834 17.0837L17.5834 2.91699L17.0834 2.91699ZM17.0834 17.0837L17.0834 16.5837L2.91675 16.5837L2.91675 17.0837L2.91675 17.5837L17.0834 17.5837L17.0834 17.0837ZM2.91675 17.0837L3.41675 17.0837L3.41675 2.91699L2.91675 2.91699L2.41675 2.91699L2.41675 17.0837L2.91675 17.0837ZM7.91674 17.0837L8.41674 17.0837L8.41674 2.91699L7.91674 2.91699L7.41674 2.91699L7.41674 17.0837L7.91674 17.0837Z" fill="currentColor"/>'

function ToggleIcon(props: { body: string; size?: number; class?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width={props.size ?? 16}
      height={props.size ?? 16}
      fill="none"
      class={props.class}
      aria-hidden="true"
      innerHTML={props.body}
    />
  )
}

/** The sidebar's toggle while it rests open: the left panel drawn full. */
export function SidebarOpenIcon(props: { size?: number; class?: string }): JSX.Element {
  return <ToggleIcon body={FULL_BODY} size={props.size} class={props.class} />
}

/** The floating toggle while the sidebar rests closed: the outline frame. */
export function SidebarClosedIcon(props: { size?: number; class?: string }): JSX.Element {
  return <ToggleIcon body={CLOSED_BODY} size={props.size} class={props.class} />
}
