import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { api, ApiError, get } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Cart, Quote } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox, Eth, Stepper } from './shared'

export const useQuote = (owner: string, coupon: string | null | undefined, enabled = true) =>
  useQuery({ queryKey: ['quote', owner, coupon ?? null], queryFn: () => api.post<Quote>('/quote').then((r) => r.data), enabled })

export function Summary({ quote }: { quote?: Quote }) {
  if (!quote) return <div className="space-y-3" aria-busy><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-8 w-full" /></div>
  return (
    <dl className="space-y-3" aria-live="polite">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{quote.subtotal} ETH</dd></div>
      <div className="flex justify-between"><dt>Desconto{quote.coupon ? ` (${quote.coupon.code})` : ' do lançamento'}</dt><dd>(-) {quote.discount} ETH</dd></div>
      <div className="flex justify-between"><dt>Taxa de rede <span className="text-xs text-accent">(estimada)</span></dt><dd>{quote.networkFee} ETH</dd></div>
      <div className="flex justify-between border-t border-line pt-4 text-lg font-bold"><dt>Total</dt><dd data-testid="total"><Eth v={quote.total} /></dd></div>
    </dl>
  )
}

export function CartPage() {
  const { owner } = useSession(); const qc = useQueryClient(); const [code, setCode] = useState(''); const [err, setErr] = useState('')
  const cart = useQuery({ queryKey: ['cart', owner], queryFn: () => get<Cart>('/cart') })
  const quote = useQuote(owner, cart.data?.coupon, !!cart.data)
  const inv = () => { void qc.invalidateQueries({ queryKey: ['cart', owner] }); void qc.invalidateQueries({ queryKey: ['quote'] }) }
  const patch = useMutation({ mutationFn: (v: { key: string; qty: number }) => api.patch(`/cart/items/${v.key}`, { qty: v.qty }), onSuccess: () => { setErr(''); inv() }, onError: (e) => { setErr(e instanceof ApiError ? e.message : 'Erro'); inv() } })
  const del = useMutation({ mutationFn: (key: string) => api.delete(`/cart/items/${key}`), onSuccess: inv })
  const apply = useMutation({ mutationFn: () => api.put('/cart/coupon', { code }), onSuccess: () => { setErr(''); setCode(''); inv() }, onError: (e) => setErr(e instanceof ApiError ? e.message : 'Erro') })
  const rm = useMutation({ mutationFn: () => api.delete('/cart/coupon'), onSuccess: inv })

  if (cart.isError) return <ErrorBox error={cart.error} onRetry={() => cart.refetch()} />
  const lines = quote.data?.lines ?? []; const empty = cart.data && cart.data.items.length === 0

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_414px]">
      <section aria-labelledby="ch">
        <h1 id="ch" className="mb-4 text-xl font-bold">Carrinho de NFTs</h1>
        {empty ? <div className="card p-10 text-center"><p>Seu carrinho está vazio.</p><Button asChild className="mt-4"><Link to="/">Explorar NFTs</Link></Button></div> : (
          <ul className="space-y-3">
            {!quote.data ? Array.from({ length: 3 }, (_, i) => <li key={i}><Skeleton className="h-[88px] w-full" /></li>) : lines.map((l) => (
              <li key={l.key} className="card grid grid-cols-[auto_1fr_auto] items-center gap-4 p-0 pr-4 md:grid-cols-[auto_1fr_100px_140px_100px_auto]">
                <img src={l.image} alt={`Arte de ${l.name}`} width={88} height={88} className="h-[88px] w-[88px] rounded-xl object-cover" />
                <div><Link to="/nft/$id" params={{ id: l.nftId }} className="font-bold">{l.name}</Link><p className="text-sm text-tan">ID do token: {l.tokenId} · {l.editionLabel}</p>
                  {!l.ok && <p role="alert" className="text-sm text-danger">Disponível: {l.available}. Ajuste a quantidade.</p>}</div>
                <span className="hidden text-accent md:block">{l.unitPrice} ETH</span>
                <Stepper value={l.qty} max={Math.max(l.available, 1)} label={l.name} onChange={(qty) => patch.mutate({ key: l.key, qty })} disabled={patch.isPending} />
                <span className="hidden font-bold text-accent md:block">{l.lineTotal} ETH</span>
                <button aria-label={`Remover ${l.name}`} onClick={() => del.mutate(l.key)} className="text-accent"><Trash2 /></button>
              </li>
            ))}
          </ul>
        )}
        <p role="alert" className="mt-3 min-h-6 text-sm text-danger">{err}</p>
      </section>

      <aside aria-labelledby="rs" className="h-fit">
        <h2 id="rs" className="mb-4 border-b border-line pb-3 text-xl font-bold">Resumo da carteira</h2>
        <form className="mb-6" onSubmit={(e) => { e.preventDefault(); if (code.trim()) apply.mutate() }}>
          <label htmlFor="cp" className="label font-bold">Código promocional</label>
          {cart.data?.coupon ? <p className="flex items-center justify-between">{cart.data.coupon} aplicado <Button type="button" variant="ghost" size="sm" onClick={() => rm.mutate()}>Remover</Button></p> : (
            <div className="flex"><input id="cp" className="field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Digite o código promocional..." /><Button type="submit" className="rounded-none" disabled={apply.isPending}>Aplicar</Button></div>
          )}
        </form>
        <Summary quote={quote.data} />
        <Button asChild className="mt-6 w-full" aria-disabled={!!empty || !!quote.data?.issues.length}><Link to="/checkout">Conectar e finalizar</Link></Button>
        <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/">Continuar explorando</Link></Button>
      </aside>
    </div>
  )
}
