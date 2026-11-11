import { createSignal } from 'solid-js'

const [open, setOpen] = createSignal(false)

/** True while the session-search palette is open, shared across the app. */
export const searchOpen = open

export const openSearch = () => setOpen(true)
export const closeSearch = () => setOpen(false)
export const toggleSearch = () => setOpen(!open())
