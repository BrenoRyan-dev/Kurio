import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import type { Cart, RtNftUpdated, RtOrderUpdated } from './types'
import { pushNotice } from './notices'

export const REALTIME_URL = 'wss://realtime.kurio.mock' // interceptado pelo MSW (ws.link)
let socket: Socket | null = null
let seen = new Set<string>()
let latest = new Map<string, number>()
let wasConnected = false

/** Descarta duplicatas (eventId) e versões antigas (resource:id). */
const accept = (e: { eventId: string; resource: string; id: string; version: number }) => {
  if (seen.has(e.eventId)) return false
  seen.add(e.eventId)
  const k = `${e.resource}:${e.id}`
  if ((latest.get(k) ?? -1) >= e.version) return false
  latest.set(k, e.version)
  return true
}

export function connectSocket(token: string | null, owner: string, qc: QueryClient) {
  disconnectSocket()
  seen = new Set(); latest = new Map(); wasConnected = false
  const s = io(REALTIME_URL, { transports: ['websocket'], reconnectionDelay: 500, reconnectionDelayMax: 3000 })
  socket = s
  s.on('connect', () => {
    s.emit('subscribe', { token })
    if (wasConnected) qc.invalidateQueries() // reconciliação com a API REST após reconexão
    wasConnected = true
  })
  s.on('nft.updated', (e: RtNftUpdated) => {
    if (!accept(e)) return
    const cart = qc.getQueryData<Cart>(['cart', owner])
    if (cart?.items.some((i) => i.nftId === e.id)) pushNotice(`${e.name} foi atualizado: ${e.price} ETH. O resumo do carrinho foi recalculado.`)
    qc.invalidateQueries({ queryKey: ['nfts'] })
    qc.invalidateQueries({ queryKey: ['nft', e.id] })
    qc.invalidateQueries({ queryKey: ['quote'] })
  })
  s.on('order.updated', (e: RtOrderUpdated) => {
    if (!accept(e)) return
    qc.invalidateQueries({ queryKey: ['order', e.id] })
    qc.invalidateQueries({ queryKey: ['cart'] })
    qc.invalidateQueries({ queryKey: ['orders'] })
  })
}
export function disconnectSocket() { socket?.removeAllListeners(); socket?.disconnect(); socket = null }
