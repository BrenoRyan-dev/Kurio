// Pequeno store para avisos acessíveis (aria-live) vindos do tempo real.
import { useSyncExternalStore } from 'react'
let notices: { id: number; text: string }[] = []
const subs = new Set<() => void>()
let n = 0
export const pushNotice = (text: string) => { notices = [...notices.slice(-3), { id: ++n, text }]; subs.forEach((s) => s()) }
export const dismissNotice = (id: number) => { notices = notices.filter((x) => x.id !== id); subs.forEach((s) => s()) }
export const useNotices = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => notices)
