import type { CartItem, Nft, Order, User, WalletInfo } from '@/lib/types'

const KEY = 'kurio-db-v1'
export interface DbUser extends User { passwordHash: string }
export interface DB {
  version: number
  nfts: Nft[]
  users: DbUser[]
  sessions: Record<string, { userId: string; expired: boolean }>
  carts: Record<string, CartItem[]>
  coupons: Record<string, string | null>
  favorites: Record<string, string[]>
  orders: (Order & { userId: string; forceDecline: boolean; purchased: { key: string; qty: number }[]; created: number })[]
  idem: Record<string, { hash: string; orderId: string }>
  wallets: Record<string, { primary: WalletInfo | null; secondary: WalletInfo | null }>
}

// Hash de senha de brinquedo (apenas mock): nunca guarda a senha em claro.
export const hashPw = (s: string) => {
  let h = 5381
  for (const c of `kurio-salt:${s}`) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0
  return `h1$${h.toString(16)}`
}

const art = (seed: number, label: string) => {
  const hue = (seed * 47) % 360
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='400' height='400' fill='hsl(${hue},28%,86%)'/><circle cx='200' cy='170' r='96' fill='hsl(${(hue + 30) % 360},35%,32%)'/><rect x='80' y='250' width='240' height='150' rx='70' fill='hsl(${(hue + 150) % 360},40%,30%)'/><text x='200' y='392' font-size='22' text-anchor='middle' fill='%23140d0a' font-family='monospace'>${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function seed(): DB {
  const base: [string, string, string, string][] = [
    ['Emerald Ape', '042', '1.19', 'Kurio Apes'], ['Violet Nomad', '314', '1.39', 'Violet Nomads'], ['Ivory Baron', '088', '1.79', 'Ivory Barons'],
  ]
  const names = ['Amber Sage', 'Onyx Drifter', 'Coral Mystic', 'Jade Oracle', 'Cobalt Rogue', 'Rust Pilgrim', 'Opal Warden', 'Slate Monk', 'Crimson Scribe']
  const cols = ['Kurio Apes', 'Violet Nomads', 'Ivory Barons', 'Genesis Drops']
  const nfts: Nft[] = Array.from({ length: 36 }, (_, i) => {
    const b = base[i]
    const name = b ? b[0] : names[i % names.length]
    const num = b ? b[1] : String(100 + i * 7).padStart(3, '0')
    const cents = 100 + ((i * 37) % 190)
    const price = b ? b[2] : `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
    return {
      id: `${name.toLowerCase().replace(/ /g, '-')}-${num}`, name: `${name} #${num}`, tokenId: `#${num.padStart(4, '0')}`,
      collection: b ? b[3] : cols[i % cols.length], price, image: art(i + 1, `#${num}`),
      editions: [{ label: '1/1', available: i % 7 === 0 ? 0 : 1 }, { label: '1/10', available: 10 - (i % 4) }, { label: '1/50', available: 50 }, { label: 'Aberta', available: 999 }],
      rating: 4 + (i % 2) * 0.5, reviews: 5 + ((i * 13) % 40),
      description: 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
      attributes: ['Óculos', 'Esmeralda', 'Raro'], tag: i % 3 === 0 ? 'new' : i % 3 === 1 ? 'hot' : 'all', version: 1,
    }
  })
  const mk = (id: string, displayName: string, username: string, email: string): DbUser => ({
    id, displayName, username, email, ensName: username, walletNickname: `${username}-main`, avatar: null, passwordHash: hashPw('Kurio@123'),
  })
  return {
    version: 1, nfts, users: [mk('u1', 'Ana Colecionadora', 'ana', 'ana@kurio.test'), mk('u2', 'Bruno Criador', 'bruno', 'bruno@kurio.test')],
    sessions: {}, carts: {}, coupons: {}, favorites: {}, orders: [], idem: {}, wallets: {},
  }
}

function load(): DB {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) } catch { /* ignore */ }
  return seed()
}
export let db: DB = load()
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* quota */ } }
export const resetDb = () => { db = seed(); save() }
