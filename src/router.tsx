import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { Layout, NotFound } from '@/routes/Layout'
import { Home, type HomeSearch } from '@/routes/Home'
import { NftDetail } from '@/routes/NftDetail'
import { CartPage } from '@/routes/Cart'
import { Checkout } from '@/routes/Checkout'
import { OrderPage } from '@/routes/Order'
import { Login, Register } from '@/routes/Auth'
import { Profile, WalletsPage } from '@/routes/Profile'
import { getToken } from '@/lib/session'

const root = createRootRoute({ component: Layout, notFoundComponent: NotFound })
const guard = () => {
  if (!getToken()) throw redirect({ to: '/login', search: { redirect: location.pathname + location.search } })
}
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

const index = createRoute({
  getParentRoute: () => root, path: '/', component: Home,
  validateSearch: (s: Record<string, unknown>): HomeSearch => ({
    q: str(s.q), collections: str(s.collections), tag: str(s.tag), min: str(s.min), max: str(s.max), sort: str(s.sort),
    page: Number.isInteger(+(s.page as string)) && +(s.page as string) > 1 ? +(s.page as string) : undefined,
  }),
})
const nft = createRoute({ getParentRoute: () => root, path: '/nft/$id', component: NftDetail })
const cart = createRoute({ getParentRoute: () => root, path: '/cart', component: CartPage })
const checkout = createRoute({ getParentRoute: () => root, path: '/checkout', component: Checkout, beforeLoad: guard })
const order = createRoute({ getParentRoute: () => root, path: '/orders/$id', component: OrderPage, beforeLoad: guard })
const redirectSearch = (s: Record<string, unknown>) => ({ redirect: str(s.redirect), expired: s.expired === '1' || s.expired === 1 ? '1' : undefined })
const login = createRoute({ getParentRoute: () => root, path: '/login', component: Login, validateSearch: redirectSearch })
const register = createRoute({ getParentRoute: () => root, path: '/register', component: Register, validateSearch: redirectSearch })
const profile = createRoute({ getParentRoute: () => root, path: '/profile', component: Profile, beforeLoad: guard })
const wallets = createRoute({ getParentRoute: () => root, path: '/wallets', component: WalletsPage, beforeLoad: guard })

export const router = createRouter({
  routeTree: root.addChildren([index, nft, cart, checkout, order, login, register, profile, wallets]),
  defaultPreload: 'intent',
})
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
