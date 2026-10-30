import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { REALTIME_URL } from '@/lib/socket'
import { db } from './db'

// Transporte: WebSocket interceptado pelo MSW + protocolo Socket.IO (@mswjs/socket.io-binding).
// Limitações: sem rooms/ack avançados; broadcast é por Set de conexões vivas, na aba atual.
export const realtime = ws.link(REALTIME_URL)
interface Client { io: ReturnType<typeof toSocketIo>; close: () => void; userId?: string }
const clients = new Set<Client>()

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    const c: Client = { io: toSocketIo(connection), close: () => connection.client.close() }
    clients.add(c)
    c.io.client.on('subscribe', (_ev: unknown, p: { token?: string | null }) => {
      c.userId = p?.token ? db.sessions[p.token]?.userId : undefined
    })
    connection.client.addEventListener('close', () => clients.delete(c))
  }),
]

export const emitAll = (name: string, payload: unknown) => clients.forEach((c) => c.io.client.emit(name, payload))
export const emitToUser = (userId: string, name: string, payload: unknown) =>
  clients.forEach((c) => c.userId === userId && c.io.client.emit(name, payload))
export const dropConnections = () => clients.forEach((c) => c.close())
