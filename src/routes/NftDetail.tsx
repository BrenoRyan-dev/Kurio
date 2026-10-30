import { useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Star } from 'lucide-react'
import { api, ApiError, get } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Cart, Nft } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox, Stepper } from './shared'

export function NftDetail() {
  const { id } = useParams({ from: '/nft/$id' }); const nav = useNavigate(); const qc = useQueryClient(); const { user, owner } = useSession()
  const q = useQuery({ queryKey: ['nft', id], queryFn: ({ signal }) => get<Nft>(`/nfts/${id}`, undefined, signal), retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2 })
  const [pick, setPick] = useState<number | null>(null); const [qty, setQty] = useState(1); const [msg, setMsg] = useState('')
  const favs = useQuery({ queryKey: ['favorites', owner], queryFn: () => get<string[]>('/favorites'), enabled: !!user })
  const isFav = favs.data?.includes(id) ?? false

  // Atualização otimista com rollback em caso de falha.
  const fav = useMutation({
    mutationFn: (on: boolean) => on ? api.put(`/favorites/${id}`) : api.delete(`/favorites/${id}`),
    onMutate: async (on) => {
      await qc.cancelQueries({ queryKey: ['favorites', owner] }); const prev = qc.getQueryData<string[]>(['favorites', owner]) ?? []
      qc.setQueryData(['favorites', owner], on ? [...prev, id] : prev.filter((x) => x !== id)); return { prev }
    },
    onError: (_e, _v, c) => { qc.setQueryData(['favorites', owner], c?.prev); setMsg('Não foi possível atualizar seus favoritos. Tente novamente.') },
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites', owner] }),
  })
  const add = useMutation({
    mutationFn: (v: { edition: number; qty: number }) => api.post<Cart>('/cart/items', { nftId: id, ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', owner] }),
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'Erro ao adicionar.'),
  })

  if (q.isError) return q.error instanceof ApiError && q.error.status === 404
    ? <div className="py-16 text-center"><h1 className="text-3xl font-bold">NFT não encontrado</h1><Button asChild className="mt-6"><Link to="/">Voltar ao catálogo</Link></Button></div>
    : <ErrorBox error={q.error} onRetry={() => q.refetch()} />
  if (!q.data) return <div className="grid gap-8 md:grid-cols-[1fr_1fr]" aria-busy><Skeleton className="aspect-square w-full" /><div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-8 w-1/3" /><Skeleton className="h-32 w-full" /></div></div>

  const n = q.data; const ed = pick ?? Math.max(0, n.editions.findIndex((e) => e.available > 0)); const avail = n.editions[ed]?.available ?? 0
  const q2 = Math.min(qty, Math.max(avail, 1))

  return (
    <article className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-[72px_1fr] gap-4 md:grid-cols-[100px_1fr]">
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <img key={i} src={n.image} alt={`Miniatura ${i + 1} de ${n.name}`} width={100} height={100} className="aspect-square w-full rounded-xl object-cover" />)}</div>
        <div className="card p-4"><img src={n.image} alt={`Arte do NFT ${n.name}`} width={500} height={500} fetchPriority="high" className="aspect-square w-full rounded-2xl object-cover" /></div>
      </div>
      <div>
        <h1 className="text-3xl font-bold">{n.name}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <p className="text-2xl font-bold text-accent" data-testid="price">{n.price} ETH</p>
          <p className="flex items-center gap-2 text-tan"><span className="flex text-accent" aria-hidden>{Array.from({ length: Math.round(n.rating) }, (_, i) => <Star key={i} size={14} fill="currentColor" />)}</span><span>{n.rating} · {n.reviews} avaliações de colecionadores</span></p>
        </div>
        <h2 className="mt-4 font-bold">Sobre este NFT:</h2><p className="mt-2 leading-7 text-tan">{n.description}</p>
        <fieldset className="mt-4"><legend className="font-bold">Edição:</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {n.editions.map((e, i) => (
              <label key={e.label} className={`cursor-pointer rounded-full border px-3 py-1 ${i === ed ? 'border-accent text-accent' : 'border-line'} ${e.available === 0 ? 'cursor-not-allowed opacity-50' : ''}`}>
                <input type="radio" name="ed" className="sr-only" disabled={e.available === 0} checked={i === ed} onChange={() => { setPick(i); setQty(1) }} />
                {e.label.toUpperCase()}{e.available === 0 && ' (esgotada)'}
              </label>
            ))}
          </div>
        </fieldset>
        {avail === 0 ? <p role="status" className="mt-4 text-danger">Todas as edições estão esgotadas no momento.</p> : (
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <Stepper value={q2} max={Math.min(avail, 99)} onChange={setQty} label={n.name} />
            <Button disabled={add.isPending} onClick={() => add.mutate({ edition: ed, qty: q2 }, { onSuccess: () => void nav({ to: '/cart' }) })}>{add.isPending ? 'Adicionando…' : 'Comprar'}</Button>
            <Button variant="outline" disabled={add.isPending} onClick={() => add.mutate({ edition: ed, qty: q2 }, { onSuccess: () => setMsg('Adicionado ao carrinho.') })}>Adicionar ao carrinho</Button>
            <Button variant="ghost" aria-pressed={isFav} onClick={() => (user ? fav.mutate(!isFav) : void nav({ to: '/login', search: { redirect: `/nft/${id}` } }))}><Heart size={18} fill={isFav ? 'currentColor' : 'none'} />{isFav ? 'Favoritado' : 'Favoritar'}</Button>
          </div>
        )}
        <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm">{msg}</p>
        <dl className="mt-4 space-y-2 text-tan"><div>ID do token: {n.tokenId}</div><div>Coleção: {n.collection}</div><div>Atributos: {n.attributes.join(', ')}</div><div>Disponíveis na edição: {avail}</div></dl>
      </div>
    </article>
  )
}
