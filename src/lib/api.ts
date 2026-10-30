import axios, { AxiosError } from 'axios'

export const TOKEN_KEY = 'kurio-token'
export const GUEST_KEY = 'kurio-guest'
const guestId = () => {
  let g = localStorage.getItem(GUEST_KEY)
  if (!g) { g = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, g) }
  return g
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}, public data?: unknown) { super(message) }
}

export const api = axios.create({ baseURL: '/api', timeout: 8000 })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem(TOKEN_KEY)
  if (t) c.headers.Authorization = `Bearer ${t}`
  c.headers['X-Guest-Id'] = guestId()
  return c
})
api.interceptors.response.use(
  (r) => r,
  (e: AxiosError<{ code?: string; message?: string; fields?: Record<string, string> }>) => {
    if (axios.isCancel(e)) return Promise.reject(e)
    const s = e.response?.status ?? 0
    const d = e.response?.data
    if (s === 401 && d?.code === 'SESSION_EXPIRED') window.dispatchEvent(new Event('kurio:expired'))
    const code = d?.code ?? (e.code === 'ECONNABORTED' ? 'TIMEOUT' : s ? 'HTTP_ERROR' : 'NETWORK')
    const msg = d?.message ?? (code === 'TIMEOUT' ? 'A resposta demorou demais.' : code === 'NETWORK' ? 'Sem conexão com o servidor.' : 'Algo deu errado.')
    return Promise.reject(new ApiError(s, code, msg, d?.fields, d))
  },
)
export const get = <T,>(url: string, params?: object, signal?: AbortSignal) => api.get<T>(url, { params, signal }).then((r) => r.data)
