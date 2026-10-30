import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, get } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Cart, Order, Wallets } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Summary, useQuote } from './Cart'

const NETWORKS = ['Ethereum', 'Polygon', 'Base']; const PROVIDERS = ['MetaMask', 'WalletConnect', 'Coinbase']
type Conn = 'disconnected' | 'connecting' | 'connected' | 'rejected'

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="label">{label}<span aria-hidden className="text-danger"> *</span></label>{children}{error && <p id={`${id}-e`} className="err">{error}</p>}</div>
}

export function Checkout() {
  const { user, owner } = useSession(); const nav = useNavigate(); const qc = useQueryClient()
  const cart = useQuery({ queryKey: ['cart', owner], queryFn: () => get<Cart>('/cart') })
  const quote = useQuote(owner, cart.data?.coupon, !!cart.data)
  const wallets = useQuery({ queryKey: ['wallets', owner], queryFn: () => get<Wallets>('/wallets') })
  const pending = useQuery({ queryKey: ['orders', owner, 'pending'], queryFn: () => get<Order[]>('/orders', { status: 'pending' }) })
  const [f, setF] = useState({ displayName: '', username: '', email: '', network: '', address: '', provider: '', note: '' })
  const [errs, setErrs] = useState<Record<string, string>>({}); const [conn, setConn] = useState<Conn>('disconnected')
  const [reviewed, setReviewed] = useState<string | null>(null); const [msg, setMsg] = useState(''); const sending = useRef(false)

  useEffect(() => { // pré-preenche com perfil e carteira principal
    const w = wallets.data?.primary
    setF((p) => ({ ...p, displayName: p.displayName || user?.displayName || '', username: p.username || user?.username || '', email: p.email || user?.email || '', network: p.network || w?.network || '', address: p.address || w?.address || '', provider: p.provider || w?.provider || '' }))
  }, [user, wallets.data])
  useEffect(() => { if (pending.data?.[0]) void nav({ to: '/orders/$id', params: { id: pending.data[0].id } }) }, [pending.data, nav]) // recupera pedido pendente após refresh

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setReviewed(null) }
  const validate = () => {
    const e: Record<string, string> = {}
    if (!f.displayName.trim()) e.displayName = 'Informe o nome de exibição.'
    if (!f.username.trim()) e.username = 'Informe o nome de usuário.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'E-mail inválido.'
    if (!f.network) e.network = 'Selecione uma rede.'
    if (!/^0x[a-fA-F0-9]{40}$/.test(f.address)) e.address = 'Endereço 0x inválido (42 caracteres).'
    if (!f.provider) e.provider = 'Selecione o tipo de carteira.'
    if (conn !== 'connected') e.conn = 'Conecte a carteira para continuar.'
    if (quote.data?.issues.length) e.cart = quote.data.issues.join(' ')
    setErrs(e); return Object.keys(e).length === 0
  }

  const connect = useMutation({
    mutationFn: () => api.post('/wallets/connect', { address: f.address }),
    onMutate: () => setConn('connecting'), onSuccess: () => setConn('connected'),
    onError: (e) => { setConn('rejected'); setErrs({ conn: e instanceof ApiError ? e.message : 'Falha ao conectar.' }) },
  })

  const total = quote.data?.total
  const stale = reviewed !== null && total !== undefined && reviewed !== total
  const submit = useMutation({
    mutationFn: () => {
      // Mesma tentativa => mesma Idempotency-Key (inclusive após timeout); conteúdo novo => chave nova.
      const fp = JSON.stringify({ t: total, w: f.address, n: f.network }); const saved = JSON.parse(sessionStorage.getItem('kurio-idem') ?? 'null') as { fp: string; key: string } | null
      const key = saved?.fp === fp ? saved.key : crypto.randomUUID(); sessionStorage.setItem('kurio-idem', JSON.stringify({ fp, key }))
      return api.post<Order>('/orders', { expectedTotal: reviewed, wallet: f.provider, network: f.network }, { headers: { 'Idempotency-Key': key } }).then((r) => r.data)
    },
    onSuccess: (o) => { sessionStorage.removeItem('kurio-idem'); void nav({ to: '/orders/$id', params: { id: o.id } }) },
    onError: (e) => {
      if (e instanceof ApiError && ['PRICE_CHANGED', 'AVAILABILITY', 'EMPTY_CART'].includes(e.code)) {
        setReviewed(null); setMsg(`${e.message} Revise o resumo e confirme novamente.`); void qc.invalidateQueries({ queryKey: ['quote'] }); void qc.invalidateQueries({ queryKey: ['cart'] })
      } else setMsg(e instanceof ApiError && (e.code === 'TIMEOUT' || e.code === 'NETWORK') ? 'Não recebemos a resposta. Seu pedido pode ter sido criado: reenviar usa a mesma chave e não duplica a compra.' : e instanceof ApiError ? e.message : 'Erro ao enviar o pedido.')
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onSettled: () => { sending.current = false },
  })
  const confirm = () => { if (sending.current || submit.isPending) return; sending.current = true; setMsg(''); submit.mutate() }

  const A = (id: string) => ({ id, 'aria-invalid': !!errs[id] || undefined, 'aria-describedby': errs[id] ? `${id}-e` : undefined })
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_506px]">
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (validate()) { setReviewed(total ?? null); setMsg('') } }} aria-labelledby="ph">
        <h1 id="ph" className="mb-6 text-xl font-bold">Perfil do colecionador</h1>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="displayName" label="Nome de exibição" error={errs.displayName}><Input {...A('displayName')} value={f.displayName} onChange={set('displayName')} /></Field>
          <Field id="username" label="Nome de usuário" error={errs.username}><Input {...A('username')} value={f.username} onChange={set('username')} /></Field>
          <Field id="network" label="Rede" error={errs.network}><select {...A('network')} className="field" value={f.network} onChange={set('network')}><option value="">Selecione uma rede</option>{NETWORKS.map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field id="provider" label="Tipo de carteira" error={errs.provider}><select {...A('provider')} className="field" value={f.provider} onChange={set('provider')}><option value="">Selecione uma carteira</option>{PROVIDERS.map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field id="address" label="Endereço da carteira" error={errs.address}><Input {...A('address')} placeholder="Endereço 0x da carteira" value={f.address} onChange={(e) => { set('address')(e); setConn('disconnected') }} /></Field>
          <Field id="email" label="E-mail" error={errs.email}><Input {...A('email')} type="email" value={f.email} onChange={set('email')} /></Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {conn === 'connected' ? <><span role="status">Carteira conectada.</span><Button type="button" variant="outline" size="sm" onClick={() => { setConn('disconnected'); setReviewed(null) }}>Desconectar</Button></>
            : <Button type="button" variant="outline" size="sm" disabled={conn === 'connecting' || !/^0x[a-fA-F0-9]{40}$/.test(f.address)} onClick={() => connect.mutate()}>{conn === 'connecting' ? 'Conectando…' : 'Conectar carteira'}</Button>}
          {errs.conn && <p role="alert" className="err">{errs.conn}</p>}
        </div>
        <div className="mt-5"><label htmlFor="note" className="label">Observação do colecionador (opcional)</label><textarea id="note" rows={4} className="field h-auto py-2" value={f.note} onChange={set('note')} /></div>
        {errs.cart && <p role="alert" className="err">{errs.cart}</p>}
        <Button type="submit" className="mt-6" disabled={!quote.data?.lines.length}>Revisar pedido</Button>
      </form>

      <aside aria-labelledby="sn" className="h-fit">
        <h2 id="sn" className="mb-4 text-xl font-bold">Seus NFTs</h2>
        <ul className="space-y-3">{quote.data?.lines.map((l) => (
          <li key={l.key} className="card flex items-center gap-3 pr-3"><img src={l.image} alt={`Arte de ${l.name}`} width={88} height={88} className="h-[88px] w-[88px] rounded-xl object-cover" />
            <div className="flex-1"><p className="font-bold">{l.name}</p><p className="text-sm text-tan">ID do token: {l.tokenId}</p></div><span>(x {l.qty})</span><span className="font-bold text-accent">{l.lineTotal} ETH</span></li>))}</ul>
        <div className="mt-6"><Summary quote={quote.data} /></div>
        <div role="status" aria-live="polite" className="mt-4 space-y-2">
          {stale && <p className="border border-danger p-3 text-danger">O valor mudou desde a sua revisão ({reviewed} → {total} ETH). Revise o pedido novamente.</p>}
          {msg && <p className="border border-danger p-3">{msg}</p>}
        </div>
        {reviewed && !stale && <Button className="mt-4 w-full" disabled={submit.isPending} onClick={confirm}>{submit.isPending ? 'Enviando pedido…' : msg ? 'Reenviar pedido' : `Confirmar compra de ${reviewed} ETH`}</Button>}
        <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/cart">Voltar ao carrinho</Link></Button>
      </aside>
    </div>
  )
}
