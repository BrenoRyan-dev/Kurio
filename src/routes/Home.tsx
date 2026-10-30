import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api'
import type { NftPage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox } from './shared'

export interface HomeSearch { q?: string; collections?: string; tag?: string; min?: string; max?: string; sort?: string; page?: number }
const tags = [['all', 'Todos os NFTs'], ['new', 'Novos lançamentos'], ['hot', 'Em alta']] as const
const sorts = [['recent', 'Listados recentemente'], ['price-asc', 'Menor preço'], ['price-desc', 'Maior preço'], ['name', 'Nome (A–Z)']] as const

export function Home() {
  const s = useSearch({ from: '/' }); const navigate = useNavigate({ from: '/' })
  // Qualquer mudança de filtro volta para a página 1; o estado vive na URL.
  const set = (p: Partial<HomeSearch>, resetPage = true) => navigate({ search: (prev) => ({ ...prev, ...p, page: resetPage ? undefined : (p.page ?? prev.page) }) })
  const q = useQuery({
    queryKey: ['nfts', s], placeholderData: keepPreviousData,
    queryFn: ({ signal }) => get<NftPage>('/nfts', s, signal), // signal cancela respostas obsoletas
  })
  const selected = (s.collections ?? '').split(',').filter(Boolean)
  const toggle = (c: string) => set({ collections: (selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]).join(',') || undefined })
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1
  const page = s.page ?? 1

  return (
    <>
      <section className="grid items-center gap-8 pb-16 lg:grid-cols-[1fr_560px]" aria-labelledby="hero">
        <div className="lg:pl-12">
          <p className="mb-6">Bem-vindo à Kurio</p>
          <h1 id="hero" className="text-4xl font-bold leading-snug md:text-5xl">SEJA DONO DO FUTURO DA ARTE DIGITAL</h1>
          <p className="mt-6 max-w-xl leading-8 text-tan">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
          <Button className="mt-8" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>EXPLORAR</Button>
        </div>
        <img src={q.data?.items[0]?.image} alt="Destaque: arte colecionável da Kurio" width={560} height={560} className="aspect-square w-full rounded-3xl bg-surface object-cover" fetchPriority="high" />
      </section>

      <section id="catalogo" className="grid gap-8 lg:grid-cols-[388px_1fr]">
        <aside className="card h-fit p-6" aria-label="Filtros">
          <h2 className="mb-4 text-xl font-bold">Coleções</h2>
          <ul className="space-y-3">
            {Object.entries(q.data?.facets ?? {}).map(([c, n]) => (
              <li key={c}><label className="flex cursor-pointer justify-between text-accent">
                <span className="flex items-center gap-2"><input type="checkbox" className="accent-[#d98f4e]" checked={selected.includes(c)} onChange={() => toggle(c)} />{c}</span><span className="font-bold">({n})</span>
              </label></li>
            ))}
          </ul>
          <fieldset className="mt-6"><legend className="mb-2">Preço (ETH)</legend>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="min">Preço mínimo</label><input id="min" inputMode="decimal" className="field h-10" placeholder="Mín." defaultValue={s.min} onBlur={(e) => set({ min: e.target.value || undefined })} />
              <label className="sr-only" htmlFor="max">Preço máximo</label><input id="max" inputMode="decimal" className="field h-10" placeholder="Máx." defaultValue={s.max} onBlur={(e) => set({ max: e.target.value || undefined })} />
            </div>
          </fieldset>
          <Button variant="outline" size="sm" className="mt-6" onClick={() => navigate({ search: {} })}>Limpar filtros</Button>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div role="tablist" aria-label="Categorias" className="flex flex-wrap gap-6">
              {tags.map(([v, l]) => { const on = (s.tag ?? 'all') === v; return (
                <button key={v} role="tab" aria-selected={on} onClick={() => set({ tag: v === 'all' ? undefined : v })} className={`border-b-2 pb-1 ${on ? 'border-accent text-accent' : 'border-transparent'}`}>{l}</button>) })}
            </div>
            <label className="flex items-center gap-2">Ordenar por:
              <select className="bg-bg text-cream" value={s.sort ?? 'recent'} onChange={(e) => set({ sort: e.target.value === 'recent' ? undefined : e.target.value })}>
                {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          {s.q && <p className="mb-4 text-tan">Resultados para “{s.q}” <button className="ml-2 text-accent underline" onClick={() => set({ q: undefined })}>limpar</button></p>}

          {q.isError && !q.data ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy={q.isFetching} data-testid="nft-grid">
                {q.isPending ? Array.from({ length: 9 }, (_, i) => (
                  <li key={i}><Skeleton className="aspect-[4/5] w-full" /></li>
                )) : q.data?.items.map((n) => (
                  <li key={n.id} className="card p-3">
                    <Link to="/nft/$id" params={{ id: n.id }} className="block">
                      <img src={n.image} alt={`Arte do NFT ${n.name}`} loading="lazy" width={300} height={300} className="aspect-square w-full rounded-2xl object-cover" />
                      <p className="mt-3 font-bold">{n.name}</p><p className="text-sm text-tan">{n.collection}</p>
                      <p className="mt-1 font-bold text-accent">{n.price} ETH</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {q.data?.items.length === 0 && (
                <div className="card p-10 text-center"><p>Nenhum NFT encontrado com esses filtros.</p><Button className="mt-4" variant="outline" onClick={() => navigate({ search: {} })}>Limpar filtros</Button></div>
              )}
              {q.isError && <p role="alert" className="mt-4 text-danger">Não foi possível atualizar. <button className="underline" onClick={() => q.refetch()}>Tentar novamente</button></p>}
              <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ page: page - 1 }, false)}>Anterior</Button>
                <span aria-live="polite">Página {page} de {pages}</span>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => set({ page: page + 1 }, false)}>Próxima</Button>
              </nav>
            </>
          )}
        </div>
      </section>
    </>
  )
}
