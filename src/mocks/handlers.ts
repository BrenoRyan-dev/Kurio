import { http, HttpResponse, delay } from 'msw'
import { db, save, resetDb, hashPw, type DbUser } from './db'
import { emitAll, emitToUser, dropConnections, realtimeHandlers } from './realtime'
import { fromUnits, percent, toUnits } from '@/lib/decimal'
import type { Nft, Quote } from '@/lib/types'

// ---------- cenários ----------
export const SCENARIOS = ['default', 'slow', 'variable', 'offline', 'flaky', 'server-error', 'empty', 'payment-declined', 'order-timeout'] as const
const scenario = () => new URLSearchParams(location.search).get('scenario') ?? localStorage.getItem('kurio-scenario') ?? 'default'
let calls = 0
let evSeq = 0

class HttpErr { constructor(public status: number, public body: { code: string; message: string; fields?: Record<string, string> }) {} }
const fail = (status: number, code: string, message: string, fields?: Record<string, string>): never => { throw new HttpErr(status, { code, message, fields }) }
const json = (d: unknown, status = 200) => HttpResponse.json(d as never, { status })

type Ctx = { request: Request; params: Record<string, string | readonly string[] | undefined> }
const route = (fn: (c: Ctx) => Promise<Response> | Response, o: { chaos?: boolean } = { chaos: true }) => async (c: Ctx) => {
  const s = scenario(); calls++
  await delay(s === 'slow' ? 1200 + ((calls * 7919) % 2000) : s === 'variable' ? (calls * 7919) % 1500 : 120)
  if (o.chaos) {
    if (s === 'offline') return HttpResponse.error()
    if (s === 'server-error') return json({ code: 'SERVER_ERROR', message: 'Erro interno do servidor.' }, 500)
    if (s === 'flaky' && calls % 3 === 0) return json({ code: 'UNAVAILABLE', message: 'Serviço temporariamente indisponível.' }, 503)
  }
  try { return await fn(c) } catch (e) { if (e instanceof HttpErr) return json(e.body, e.status); throw e }
}

// ---------- helpers ----------
const auth = (r: Request): DbUser => {
  const t = r.headers.get('authorization')?.replace('Bearer ', '')
  const s = t ? db.sessions[t] : undefined
  if (!t || !s) return fail(401, 'UNAUTHENTICATED', 'Entre para continuar.')
  if (s.expired) return fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
  return db.users.find((u) => u.id === s.userId)!
}
const tryAuth = (r: Request) => { try { return auth(r) } catch (e) { if (e instanceof HttpErr && e.body.code === 'SESSION_EXPIRED') throw e; return null } }
const owner = (r: Request) => tryAuth(r)?.id ?? `guest:${r.headers.get('x-guest-id')}`
const body = async <T,>(r: Request) => (await r.json()) as T
const nftById = (id: string) => db.nfts.find((n) => n.id === id) ?? fail(404, 'NOT_FOUND', 'NFT não encontrado.')
const publicUser = ({ passwordHash: _p, ...u }: DbUser) => u
const bump = (n: Nft) => { n.version++; db.version++ }

const COUPONS: Record<string, number | 'expired'> = { KURIO10: 10, WELCOME5: 5, OLD2024: 'expired' }
const FEE = '0.016'

function quote(own: string): Quote {
  const items = db.carts[own] ?? []
  const lines = items.map((it) => {
    const n = nftById(it.nftId); const ed = n.editions[it.edition]
    return { key: it.key, nftId: n.id, name: n.name, tokenId: n.tokenId, image: n.image, editionLabel: ed.label, qty: it.qty, unitPrice: n.price,
      lineTotal: fromUnits(toUnits(n.price) * BigInt(it.qty)), available: ed.available, ok: it.qty <= ed.available }
  })
  const sub = lines.reduce((a, l) => a + toUnits(l.lineTotal), 0n)
  const code = db.coupons[own]; const pct = code ? COUPONS[code] : undefined
  const disc = typeof pct === 'number' ? percent(sub, pct) : 0n
  const fee = lines.length ? toUnits(FEE) : 0n
  return { lines, subtotal: fromUnits(sub), discount: fromUnits(disc), networkFee: fromUnits(fee), total: fromUnits(sub - disc + fee),
    coupon: code && typeof pct === 'number' ? { code, percent: pct } : null,
    issues: lines.filter((l) => !l.ok).map((l) => `${l.name} (${l.editionLabel}): restam ${l.available}.`), version: db.version }
}

function settle(o: (typeof db.orders)[number]) {
  if (o.status !== 'pending' || Date.now() - o.created < 1500) return o
  o.status = o.forceDecline ? 'declined' : 'confirmed'; o.version++
  if (o.status === 'confirmed') {
    const cart = db.carts[o.userId] ?? []
    for (const p of o.purchased) {
      const it = cart.find((c) => c.key === p.key); if (it) it.qty -= p.qty
      const [id, ed] = p.key.split('~'); const n = db.nfts.find((x) => x.id === id)
      if (n) { n.editions[+ed].available = Math.max(0, n.editions[+ed].available - p.qty); bump(n) }
    }
    db.carts[o.userId] = cart.filter((c) => c.qty > 0)
  }
  save(); return o
}
const orderDto = ({ userId: _u, forceDecline: _f, purchased: _p, created: _c, ...o }: (typeof db.orders)[number]) => o

const validEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e)
const validAddr = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a)

export const handlers = [
  ...realtimeHandlers,
  // ----- sessão -----
  http.post('/api/auth/register', route(async ({ request }) => {
    const b = await body<{ displayName: string; email: string; password: string }>(request); const f: Record<string, string> = {}
    if (!b.displayName?.trim()) f.displayName = 'Informe seu nome.'
    if (!validEmail(b.email ?? '')) f.email = 'E-mail inválido.'
    if ((b.password ?? '').length < 8) f.password = 'Use ao menos 8 caracteres.'
    if (Object.keys(f).length) fail(422, 'VALIDATION', 'Revise os campos.', f)
    if (db.users.some((u) => u.email === b.email.toLowerCase())) fail(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { email: 'Este e-mail já está cadastrado.' })
    const u: DbUser = { id: `u${db.users.length + 1}`, displayName: b.displayName, username: b.email.split('@')[0], email: b.email.toLowerCase(), ensName: '', walletNickname: '', avatar: null, passwordHash: hashPw(b.password) }
    db.users.push(u); return session(u, request)
  })),
  http.post('/api/auth/login', route(async ({ request }) => {
    const b = await body<{ email: string; password: string }>(request)
    const u = db.users.find((x) => x.email === b.email?.toLowerCase())
    if (!u || u.passwordHash !== hashPw(b.password ?? '')) fail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    return session(u!, request)
  })),
  http.get('/api/auth/me', route(({ request }) => json(publicUser(auth(request))), { chaos: false })),
  http.post('/api/auth/logout', route(({ request }) => {
    const t = request.headers.get('authorization')?.replace('Bearer ', ''); if (t) delete db.sessions[t]; save(); return json({ ok: true })
  }, { chaos: false })),

  // ----- NFTs -----
  http.get('/api/nfts', route(({ request }) => {
    const q = new URL(request.url).searchParams
    const term = (q.get('q') ?? '').toLowerCase(); const cols = (q.get('collections') ?? '').split(',').filter(Boolean)
    const min = q.get('min') ? toUnits(q.get('min')!) : null; const max = q.get('max') ? toUnits(q.get('max')!) : null
    const tag = q.get('tag'); const sort = q.get('sort') ?? 'recent'; const page = Math.max(1, +(q.get('page') ?? 1)); const size = 9
    let list = scenario() === 'empty' ? [] : db.nfts.filter((n) => (!term || n.name.toLowerCase().includes(term) || n.collection.toLowerCase().includes(term))
      && (!cols.length || cols.includes(n.collection)) && (!tag || tag === 'all' || n.tag === tag)
      && (min === null || toUnits(n.price) >= min) && (max === null || toUnits(n.price) <= max))
    const facets: Record<string, number> = {}; list.forEach((n) => (facets[n.collection] = (facets[n.collection] ?? 0) + 1))
    list = [...list].sort((a, b) => sort === 'price-asc' ? Number(toUnits(a.price) - toUnits(b.price)) : sort === 'price-desc' ? Number(toUnits(b.price) - toUnits(a.price)) : sort === 'name' ? a.name.localeCompare(b.name) : 0)
    return json({ items: list.slice((page - 1) * size, page * size), total: list.length, page, pageSize: size, facets })
  })),
  http.get('/api/nfts/:id', route(({ params }) => json(nftById(String(params.id))))),

  // ----- favoritos -----
  http.get('/api/favorites', route(({ request }) => json(db.favorites[auth(request).id] ?? []))),
  http.put('/api/favorites/:id', route(({ request, params }) => {
    const u = auth(request); nftById(String(params.id))
    if (request.headers.get('x-mock-fail') === '1') fail(500, 'SERVER_ERROR', 'Não foi possível favoritar.')
    db.favorites[u.id] = [...new Set([...(db.favorites[u.id] ?? []), String(params.id)])]; save(); return json(db.favorites[u.id])
  })),
  http.delete('/api/favorites/:id', route(({ request, params }) => {
    const u = auth(request); db.favorites[u.id] = (db.favorites[u.id] ?? []).filter((x) => x !== params.id); save(); return json(db.favorites[u.id])
  })),

  // ----- carrinho -----
  http.get('/api/cart', route(({ request }) => { const o = owner(request); return json({ items: db.carts[o] ?? [], coupon: db.coupons[o] ?? null }) })),
  http.post('/api/cart/items', route(async ({ request }) => {
    const o = owner(request); const b = await body<{ nftId: string; edition: number; qty: number }>(request)
    const n = nftById(b.nftId); const ed = n.editions[b.edition]
    if (!ed || !Number.isInteger(b.qty) || b.qty < 1) fail(422, 'VALIDATION', 'Quantidade inválida.')
    const cart = db.carts[o] ?? []; const key = `${b.nftId}~${b.edition}`; const cur = cart.find((c) => c.key === key)
    if ((cur?.qty ?? 0) + b.qty > ed.available) fail(409, 'AVAILABILITY', `Só restam ${ed.available} unidades desta edição.`)
    if (cur) cur.qty += b.qty; else cart.push({ key, nftId: b.nftId, edition: b.edition, qty: b.qty })
    db.carts[o] = cart; save(); return json({ items: cart, coupon: db.coupons[o] ?? null })
  })),
  http.patch('/api/cart/items/:key', route(async ({ request, params }) => {
    const o = owner(request); const { qty } = await body<{ qty: number }>(request); const it = (db.carts[o] ?? []).find((c) => c.key === params.key)
    if (!it) fail(404, 'NOT_FOUND', 'Item não está no carrinho.')
    const ed = nftById(it!.nftId).editions[it!.edition]
    if (!Number.isInteger(qty) || qty < 1) fail(422, 'VALIDATION', 'Quantidade inválida.')
    if (qty > ed.available) fail(409, 'AVAILABILITY', `Só restam ${ed.available} unidades desta edição.`)
    it!.qty = qty; save(); return json({ items: db.carts[o], coupon: db.coupons[o] ?? null })
  })),
  http.delete('/api/cart/items/:key', route(({ request, params }) => {
    const o = owner(request); db.carts[o] = (db.carts[o] ?? []).filter((c) => c.key !== params.key); save(); return json({ items: db.carts[o], coupon: db.coupons[o] ?? null })
  })),
  http.put('/api/cart/coupon', route(async ({ request }) => {
    const o = owner(request); const code = (await body<{ code: string }>(request)).code?.trim().toUpperCase(); const c = COUPONS[code]
    if (c === undefined) fail(404, 'COUPON_INVALID', 'Cupom inválido.')
    if (c === 'expired') fail(410, 'COUPON_EXPIRED', 'Este cupom expirou.')
    db.coupons[o] = code; save(); return json({ ok: true })
  })),
  http.delete('/api/cart/coupon', route(({ request }) => { db.coupons[owner(request)] = null; save(); return json({ ok: true }) })),
  http.post('/api/quote', route(({ request }) => json(quote(owner(request))))),

  // ----- pedidos (idempotentes) -----
  http.post('/api/orders', route(async ({ request }) => {
    const u = auth(request); const key = request.headers.get('idempotency-key') ?? fail(422, 'VALIDATION', 'Idempotency-Key obrigatória.')
    const b = await body<{ expectedTotal: string; wallet: string; network: string }>(request); const hash = JSON.stringify(b)
    const prev = db.idem[`${u.id}:${key}`]
    if (prev) { if (prev.hash !== hash) fail(409, 'IDEMPOTENCY_CONFLICT', 'Chave reutilizada com conteúdo diferente.'); return json(orderDto(settle(db.orders.find((o) => o.id === prev.orderId)!))) }
    const q = quote(u.id)
    if (!q.lines.length) fail(422, 'EMPTY_CART', 'Seu carrinho está vazio.')
    if (q.issues.length) fail(409, 'AVAILABILITY', q.issues.join(' '), undefined)
    if (q.total !== b.expectedTotal) throw new HttpErr(409, { code: 'PRICE_CHANGED', message: `O total mudou para ${q.total} ETH. Revise e confirme novamente.` })
    const o = { id: `ord_${db.orders.length + 1}_${Date.now().toString(36)}`, status: 'pending' as const, version: 1, txId: `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}…${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(), wallet: b.wallet, network: b.network, snapshot: q, userId: u.id, forceDecline: scenario() === 'payment-declined',
      purchased: q.lines.map((l) => ({ key: l.key, qty: l.qty })), created: Date.now() }
    db.orders.push(o); db.idem[`${u.id}:${key}`] = { hash, orderId: o.id }; save()
    setTimeout(() => { const s = settle(o); emitToUser(u.id, 'order.updated', { eventId: `evt_${++evSeq}`, resource: 'order', id: s.id, version: s.version, status: s.status }) }, 1600)
    if (scenario() === 'order-timeout') await delay(15000) // pedido criado, resposta nunca chega a tempo
    return json(orderDto(o), 201)
  }, { chaos: false })),
  http.get('/api/orders', route(({ request }) => {
    const u = auth(request); const st = new URL(request.url).searchParams.get('status')
    return json(db.orders.filter((o) => o.userId === u.id).map(settle).filter((o) => !st || o.status === st).map(orderDto))
  })),
  http.get('/api/orders/:id', route(({ request, params }) => {
    const u = auth(request); const o = db.orders.find((x) => x.id === params.id)
    if (!o) fail(404, 'NOT_FOUND', 'Pedido não encontrado.'); if (o!.userId !== u.id) fail(403, 'FORBIDDEN', 'Sem permissão para este pedido.')
    return json(orderDto(settle(o!)))
  })),

  // ----- perfil e carteiras -----
  http.get('/api/profile', route(({ request }) => json(publicUser(auth(request))))),
  http.patch('/api/profile', route(async ({ request }) => {
    const u = auth(request); const b = await body<Partial<DbUser>>(request); const f: Record<string, string> = {}
    if (b.displayName !== undefined && !b.displayName.trim()) f.displayName = 'Informe o nome de exibição.'
    if (b.email !== undefined && !validEmail(b.email)) f.email = 'E-mail inválido.'
    if (b.avatar && b.avatar.length > 300_000) f.avatar = 'Imagem muito grande (máx. ~200 KB).'
    if (Object.keys(f).length) fail(422, 'VALIDATION', 'Revise os campos.', f)
    if (b.email && db.users.some((x) => x.id !== u.id && x.email === b.email!.toLowerCase())) fail(409, 'EMAIL_TAKEN', 'E-mail em uso.', { email: 'Este e-mail já está em uso.' })
    for (const k of ['displayName', 'username', 'email', 'ensName', 'walletNickname', 'avatar'] as const) if (k in b) (u as never as Record<string, unknown>)[k] = b[k]
    save(); return json(publicUser(u))
  })),
  http.post('/api/profile/password', route(async ({ request }) => {
    const u = auth(request); const b = await body<{ current: string; next: string }>(request)
    if (u.passwordHash !== hashPw(b.current ?? '')) fail(422, 'VALIDATION', 'Revise os campos.', { current: 'Senha atual incorreta.' })
    if ((b.next ?? '').length < 8) fail(422, 'VALIDATION', 'Revise os campos.', { next: 'Use ao menos 8 caracteres.' })
    u.passwordHash = hashPw(b.next); save(); return json({ ok: true })
  })),
  http.get('/api/wallets', route(({ request }) => json(db.wallets[auth(request).id] ?? { primary: null, secondary: null }))),
  http.put('/api/wallets/:slot', route(async ({ request, params }) => {
    const u = auth(request); const w = await body<{ provider: string; network: string; address: string; label: string }>(request); const f: Record<string, string> = {}
    if (!validAddr(w.address ?? '')) f.address = 'Endereço 0x inválido (42 caracteres).'
    if (!w.network) f.network = 'Selecione uma rede.'
    if (!w.provider) f.provider = 'Selecione o tipo de carteira.'
    if (Object.keys(f).length) fail(422, 'VALIDATION', 'Revise os campos.', f)
    const cur = db.wallets[u.id] ?? { primary: null, secondary: null }; cur[params.slot === 'secondary' ? 'secondary' : 'primary'] = w
    db.wallets[u.id] = cur; save(); return json(cur)
  })),
  http.post('/api/wallets/connect', route(async ({ request }) => {
    auth(request); const { address } = await body<{ address: string }>(request)
    if (address?.toLowerCase().endsWith('dead')) fail(403, 'WALLET_REJECTED', 'A carteira recusou a conexão.')
    return json({ connected: true })
  })),

  // ----- controle do mock (dev/demo/testes) -----
  http.post('/__mock/emit', async ({ request }) => {
    const b = await body<{ type: 'price' | 'stock' | 'duplicate' | 'stale'; nftId: string; price?: string; available?: number }>(request)
    const n = nftById(b.nftId)
    const ev = () => ({ eventId: `evt_${++evSeq}`, resource: 'nft', id: n.id, version: n.version, name: n.name, price: n.price, available: n.editions.map((e) => e.available) })
    if (b.type === 'price') { n.price = b.price ?? '2.50'; bump(n); save(); emitAll('nft.updated', ev()) }
    if (b.type === 'stock') { n.editions[0].available = b.available ?? 0; n.editions[1].available = b.available ?? 0; bump(n); save(); emitAll('nft.updated', ev()) }
    if (b.type === 'duplicate') { const e = ev(); emitAll('nft.updated', e); emitAll('nft.updated', e) }
    if (b.type === 'stale') emitAll('nft.updated', { ...ev(), eventId: `evt_${++evSeq}`, version: 0, price: '0.01' })
    return json({ ok: true })
  }),
  http.post('/__mock/expire', ({ request }) => { const t = request.headers.get('authorization')?.replace('Bearer ', ''); if (t && db.sessions[t]) db.sessions[t].expired = true; save(); return json({ ok: true }) }),
  http.post('/__mock/disconnect', () => { dropConnections(); return json({ ok: true }) }),
  http.post('/__mock/reset', () => { resetDb(); return json({ ok: true }) }),
]

function session(u: DbUser, request: Request) {
  const token = `tok_${u.id}_${Math.random().toString(36).slice(2)}`; db.sessions[token] = { userId: u.id, expired: false }
  // mescla o carrinho do visitante ao autenticar
  const g = `guest:${request.headers.get('x-guest-id')}`; const gc = db.carts[g] ?? []; const uc = db.carts[u.id] ?? []
  for (const it of gc) { const cur = uc.find((c) => c.key === it.key); const max = nftById(it.nftId).editions[it.edition].available; if (cur) cur.qty = Math.min(max, cur.qty + it.qty); else uc.push({ ...it, qty: Math.min(max, it.qty) }) }
  db.carts[u.id] = uc; delete db.carts[g]; if (db.coupons[g]) { db.coupons[u.id] = db.coupons[g]; delete db.coupons[g] }
  save(); return json({ token, user: publicUser(u) })
}
