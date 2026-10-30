import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TOKEN_KEY, get } from './api'
import type { User } from './types'

let token = localStorage.getItem(TOKEN_KEY)
const subs = new Set<() => void>()
export const getToken = () => token
export const setToken = (t: string | null) => {
  token = t
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)
  subs.forEach((s) => s())
}
export const useToken = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => token)

export function useSession() {
  const t = useToken()
  const q = useQuery({ queryKey: ['me', t], queryFn: () => get<User>('/auth/me'), enabled: !!t, retry: false, staleTime: 60_000 })
  return { token: t, user: q.data ?? null, loading: !!t && q.isLoading, owner: q.data?.id ?? 'guest' }
}
