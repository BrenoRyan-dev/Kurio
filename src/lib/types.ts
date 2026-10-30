export interface Edition { label: string; available: number }
export interface Nft {
  id: string; name: string; tokenId: string; collection: string; price: string; image: string
  editions: Edition[]; rating: number; reviews: number; description: string; attributes: string[]
  tag: 'new' | 'hot' | 'all'; version: number
}
export interface NftPage { items: Nft[]; total: number; page: number; pageSize: number; facets: Record<string, number> }
export interface User { id: string; displayName: string; username: string; email: string; ensName: string; walletNickname: string; avatar: string | null }
export interface CartItem { key: string; nftId: string; edition: number; qty: number }
export interface Cart { items: CartItem[]; coupon: string | null }
export interface QuoteLine { key: string; nftId: string; name: string; tokenId: string; image: string; editionLabel: string; qty: number; unitPrice: string; lineTotal: string; available: number; ok: boolean }
export interface Quote { lines: QuoteLine[]; subtotal: string; discount: string; networkFee: string; total: string; coupon: { code: string; percent: number } | null; issues: string[]; version: number }
export type OrderStatus = 'pending' | 'confirmed' | 'declined'
export interface Order { id: string; status: OrderStatus; version: number; txId: string; createdAt: string; wallet: string; network: string; snapshot: Quote }
export interface WalletInfo { provider: string; network: string; address: string; label: string }
export interface Wallets { primary: WalletInfo | null; secondary: WalletInfo | null }
export interface RtNftUpdated { eventId: string; resource: 'nft'; id: string; version: number; name: string; price: string; available: number[] }
export interface RtOrderUpdated { eventId: string; resource: 'order'; id: string; version: number; status: OrderStatus }
