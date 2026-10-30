import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogIn, Search, ShoppingCart, User as UserIcon, X } from 'lucide-react'
import { get, api } from '@/lib/api'
import { setToken, useSession } from '@/lib/session'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { dismissNotice, useNotices } from '@/lib/notices'
import type { Cart } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { MockPanel } from './MockPanel'

const nav = [['/', 'Início'], ['/', 'Mercado'], ['/', 'Criadores'], ['/', 'Aprenda']] as const

export function Layout() {
  const qc = useQueryClient(); const navigate = useNavigate()
  const { token, user, owner } = useSession()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const [searching, setSearching] = useState(false)
  const notices = useNotices()

  // Socket.IO por sessão: ao trocar de usuário a conexão antiga é encerrada.
  useEffect(() => { connectSocket(token, owner, qc); return () => disconnectSocket() }, [token, owner, qc])

  // Sessão expirada: limpa dados privados e preserva o contexto para retomada.
  useEffect(() => {
    const h = () => {
      setToken(null); qc.clear()
      void navigate({ to: '/login', search: { redirect: location.pathname + location.search, expired: '1' } })
    }
    window.addEventListener('kurio:expired', h); return () => window.removeEventListener('kurio:expired', h)
  }, [navigate, qc])

  const cart = useQuery({ queryKey: ['cart', owner], queryFn: () => get<Cart>('/cart') })
  const count = cart.data?.items.reduce((a, i) => a + i.qty, 0) ?? 0

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined)
    setToken(null); qc.clear(); void navigate({ to: '/' })
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-accent focus:p-2 focus:text-accent-fg">Ir para o conteúdo</a>
      <div className="mx-auto w-full max-w-[1500px] px-4 md:px-8 xl:px-[150px]">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-5">
          <Link to="/" className="font-bold tracking-widest">KURIO</Link>
          <nav aria-label="Principal" className="order-3 flex w-full gap-6 overflow-x-auto md:order-none md:w-auto md:gap-10">
            {nav.map(([to, label], i) => (
              <Link key={label} to={to} className={`whitespace-nowrap border-b-2 pb-2 ${(i === 0 && path === '/') || (i === 1 && path.startsWith('/nft')) ? 'border-accent text-accent' : 'border-transparent'}`}>{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 md:gap-5">
            {searching ? (
              <form role="search" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get('q') as string; void navigate({ to: '/', search: { q: q || undefined } }); setSearching(false) }}>
                <label className="sr-only" htmlFor="hq">Buscar NFTs</label>
                <input id="hq" name="q" autoFocus className="field h-9 w-36 md:w-56" placeholder="Buscar NFTs" onKeyDown={(e) => e.key === 'Escape' && setSearching(false)} />
              </form>
            ) : (
              <button aria-label="Buscar" onClick={() => setSearching(true)}><Search /></button>
            )}
            <Link to="/cart" aria-label={`Carrinho, ${count} itens`} className="relative">
              <ShoppingCart />
              {count > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-fg">{count}</span>}
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/profile"><UserIcon size={16} />{user.displayName.split(' ')[0]}</Link></Button>
                <Button variant="ghost" size="sm" onClick={logout}>Sair</Button>
              </div>
            ) : (
              <Button asChild size="sm"><Link to="/login" search={{}}><LogIn size={16} />Entrar</Link></Button>
            )}
          </div>
        </header>
        <main id="main" className="py-8"><Outlet /></main>
      </div>

      <div className="fixed bottom-4 left-1/2 z-40 w-[min(560px,92vw)] -translate-x-1/2 space-y-2" role="status" aria-live="polite">
        {notices.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-3 border border-accent bg-surface p-3 text-sm">
            <span>{n.text}</span><button aria-label="Dispensar aviso" onClick={() => dismissNotice(n.id)}><X size={16} /></button>
          </div>
        ))}
      </div>
      {import.meta.env.VITE_ENABLE_MOCKS !== 'false' && <MockPanel />}
    </>
  )
}

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-3 text-tan">O endereço não existe ou foi movido.</p>
      <Button asChild className="mt-6"><Link to="/">Voltar ao início</Link></Button>
    </div>
  )
}
