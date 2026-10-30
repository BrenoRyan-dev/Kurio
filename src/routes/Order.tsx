import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { get, ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Order } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ErrorBox } from './shared'

export function OrderPage() {
  const { id } = useParams({ from: '/orders/$id' }); const nav = useNavigate(); const { owner } = useSession()
  const q = useQuery({ queryKey: ['order', id, owner], queryFn: () => get<Order>(`/orders/${id}`), refetchInterval: (s) => (s.state.data?.status === 'pending' ? 2000 : false) })
  if (q.isError) return q.error instanceof ApiError && [403, 404].includes(q.error.status) ? <div role="alert" className="py-16 text-center"><h1 className="text-2xl font-bold">Pedido não encontrado</h1><Button asChild className="mt-6"><Link to="/">Início</Link></Button></div> : <ErrorBox error={q.error} onRetry={() => q.refetch()} />
  const o = q.data
  if (!o || o.status === 'pending') return <div role="status" aria-live="polite" className="py-20 text-center"><h1 className="text-2xl font-bold">Processando seu pedido…</h1><p className="mt-3 text-tan">Não feche esta página. Se recarregar ou perder a conexão, retomamos de onde parou.</p></div>
  if (o.status === 'declined') return (
    <div role="alert" className="py-16 text-center"><h1 className="text-2xl font-bold">Pagamento recusado</h1><p className="mt-3 text-tan">Nenhum item foi comprado e seu carrinho foi preservado.</p>
      <Button asChild className="mt-6"><Link to="/checkout">Tentar novamente</Link></Button></div>
  )
  const s = o.snapshot // o recibo usa o snapshot do pedido, nunca o catálogo atual
  return (
    <Dialog open onOpenChange={(v) => { if (!v) void nav({ to: '/' }) }}>
      <DialogContent title="Pedido confirmado">
        <h1 className="mt-4 text-center text-lg font-bold text-tan">Seus NFTs agora estão na sua carteira</h1>
        <dl className="my-6 grid grid-cols-2 gap-4 border-y border-line py-4 text-sm sm:grid-cols-4">
          <div><dt className="font-bold">ID da transação</dt><dd>{o.txId}</dd></div><div><dt>Data</dt><dd>{new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</dd></div>
          <div><dt>Total</dt><dd>{s.total} ETH</dd></div><div><dt className="font-bold">Carteira</dt><dd>{o.wallet} · {o.network}</dd></div>
        </dl>
        <h2 className="font-bold">Detalhes da transação</h2>
        <table className="mt-3 w-full text-left"><thead><tr className="border-b border-line"><th className="py-2">NFTs</th><th>Edições</th><th className="text-right">Subtotal</th></tr></thead>
          <tbody>{s.lines.map((l) => <tr key={l.key}><td className="flex items-center gap-3 py-2"><img src={l.image} alt={`Arte de ${l.name}`} width={64} height={64} className="h-16 w-16 rounded-xl object-cover" /><span><b>{l.name}</b><br /><span className="text-sm text-tan">ID do token: {l.tokenId}</span></span></td><td>(x {l.qty})</td><td className="text-right font-bold text-accent">{l.lineTotal} ETH</td></tr>)}</tbody></table>
        <dl className="mt-4 space-y-1 text-sm"><div className="flex justify-between"><dt>Desconto</dt><dd>{s.discount} ETH</dd></div><div className="flex justify-between"><dt>Taxa de rede</dt><dd>{s.networkFee} ETH</dd></div></dl>
      </DialogContent>
    </Dialog>
  )
}
