import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, LogOut, MapPin, User as UserIcon } from 'lucide-react'
import { api, ApiError, get } from '@/lib/api'
import { setToken, useSession } from '@/lib/session'
import type { User, WalletInfo, Wallets } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const soon = ['Atividade', 'Lista de interesse', 'Ofertas', 'Arquivos baixados', 'Suporte']
function Shell({ children, active }: { children: React.ReactNode; active: 'profile' | 'wallets' }) {
  const nav = useNavigate(); const qc = useQueryClient()
  return (
    <div className="grid gap-8 lg:grid-cols-[388px_1fr]">
      <aside className="card h-fit" aria-label="Minha conta"><h2 className="p-4 text-xl font-bold">Meu perfil</h2>
        <ul>
          <li><Link to="/profile" aria-current={active === 'profile' ? 'page' : undefined} className={`flex items-center gap-3 p-4 ${active === 'profile' ? 'border-l-4 border-accent text-accent' : ''}`}><UserIcon size={18} />Dados do perfil</Link></li>
          <li><Link to="/wallets" aria-current={active === 'wallets' ? 'page' : undefined} className={`flex items-center gap-3 p-4 ${active === 'wallets' ? 'border-l-4 border-accent text-accent' : ''}`}><MapPin size={18} />Carteiras</Link></li>
          {soon.map((l) => <li key={l}><span aria-disabled="true" title="Indisponível nesta versão" className="flex items-center gap-3 p-4 text-tan/60"><Heart size={18} />{l}</span></li>)}
          <li className="border-t border-line"><button className="flex w-full items-center gap-3 p-4 font-bold text-accent" onClick={async () => { await api.post('/auth/logout').catch(() => undefined); setToken(null); qc.clear(); void nav({ to: '/' }) }}><LogOut size={18} />Sair</button></li>
        </ul></aside>
      <section>{children}</section>
    </div>
  )
}
const FieldErr = ({ id, e }: { id: string; e?: string }) => (e ? <p id={`${id}-e`} className="err">{e}</p> : null)

export function Profile() {
  const { owner } = useSession(); const qc = useQueryClient()
  const q = useQuery({ queryKey: ['profile', owner], queryFn: () => get<User>('/profile') })
  const [f, setF] = useState<Partial<User>>({}); const [e, setE] = useState<Record<string, string>>({}); const [ok, setOk] = useState(''); const [pw, setPw] = useState({ current: '', next: '', confirm: '' }); const [pe, setPe] = useState<Record<string, string>>({})
  useEffect(() => { if (q.data) setF(q.data) }, [q.data])
  const save = useMutation({
    mutationFn: (b: Partial<User>) => api.patch<User>('/profile', b).then((r) => r.data),
    onSuccess: (u) => { setE({}); setOk('Alterações salvas.'); qc.setQueryData(['profile', owner], u); void qc.invalidateQueries({ queryKey: ['me'] }) },
    onError: (x) => { setOk(''); if (x instanceof ApiError) setE(x.fields) },
  })
  const pass = useMutation({
    mutationFn: () => api.post('/profile/password', { current: pw.current, next: pw.next }),
    onSuccess: () => { setPe({}); setPw({ current: '', next: '', confirm: '' }); setOk('Senha alterada.') }, onError: (x) => x instanceof ApiError && setPe(x.fields),
  })
  const onFile = (file?: File) => {
    if (!file) return; if (file.size > 200_000) return setE({ avatar: 'Imagem muito grande (máx. 200 KB).' })
    const r = new FileReader(); r.onload = () => save.mutate({ avatar: r.result as string }); r.readAsDataURL(file)
  }
  const t = (k: keyof User, label: string, type = 'text') => (
    <div><label htmlFor={k} className="label">{label}</label><Input id={k} type={type} value={(f[k] as string) ?? ''} aria-invalid={!!e[k] || undefined} aria-describedby={e[k] ? `${k}-e` : undefined} onChange={(ev) => setF({ ...f, [k]: ev.target.value })} /><FieldErr id={k} e={e[k]} /></div>)
  return (
    <Shell active="profile">
      <h1 className="mb-6 text-xl font-bold">Perfil do colecionador</h1>
      <form noValidate className="grid gap-5 sm:grid-cols-2" onSubmit={(ev) => { ev.preventDefault(); setOk(''); const { displayName, username, email, ensName, walletNickname } = f; save.mutate({ displayName, username, email, ensName, walletNickname }) }}>
        {t('displayName', 'Nome de exibição')}{t('username', 'Nome de usuário')}{t('email', 'E-mail', 'email')}{t('ensName', 'Nome ENS')}{t('walletNickname', 'Apelido da carteira')}
        <div><p className="label">Avatar</p><div className="flex items-center gap-3">
          {f.avatar ? <img src={f.avatar} alt="Seu avatar" className="h-14 w-14 rounded-full object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-full bg-surface"><UserIcon /></span>}
          <label className="inline-flex h-10 cursor-pointer items-center bg-accent px-4 text-accent-fg focus-within:outline focus-within:outline-2">Alterar<input type="file" accept="image/*" className="sr-only" onChange={(ev) => onFile(ev.target.files?.[0])} /></label>
          <Button type="button" variant="ghost" size="sm" onClick={() => save.mutate({ avatar: null })}>Remover</Button></div><FieldErr id="avatar" e={e.avatar} /></div>
        <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending}>Salvar alterações</Button></div>
      </form>
      <p role="status" aria-live="polite" className="mt-3 min-h-6 text-accent">{ok}</p>
      <h2 className="mb-4 mt-8 text-xl font-bold">Alterar senha</h2>
      <form noValidate className="max-w-md space-y-4" onSubmit={(ev) => { ev.preventDefault(); const er: Record<string, string> = {}; if (!pw.current) er.current = 'Informe a senha atual.'; if (pw.next.length < 8) er.next = 'Use ao menos 8 caracteres.'; if (pw.next !== pw.confirm) er.confirm = 'As senhas não conferem.'; setPe(er); if (!Object.keys(er).length) pass.mutate() }}>
        {(['current', 'next', 'confirm'] as const).map((k) => (
          <div key={k}><label htmlFor={`pw-${k}`} className="label">{{ current: 'Senha atual', next: 'Nova senha', confirm: 'Confirmar nova senha' }[k]}</label>
            <Input id={`pw-${k}`} type="password" autoComplete={k === 'current' ? 'current-password' : 'new-password'} value={pw[k]} aria-invalid={!!pe[k] || undefined} aria-describedby={pe[k] ? `pw-${k}-e` : undefined} onChange={(ev) => setPw({ ...pw, [k]: ev.target.value })} />{pe[k] && <p id={`pw-${k}-e`} className="err">{pe[k]}</p>}</div>))}
        <Button type="submit" disabled={pass.isPending}>Alterar senha</Button>
      </form>
    </Shell>
  )
}

function WalletForm({ slot, title, value }: { slot: 'primary' | 'secondary'; title: string; value: WalletInfo | null }) {
  const { owner } = useSession(); const qc = useQueryClient(); const [f, setF] = useState<WalletInfo>(value ?? { provider: '', network: '', address: '', label: '' }); const [e, setE] = useState<Record<string, string>>({}); const [ok, setOk] = useState('')
  useEffect(() => { if (value) setF(value) }, [value])
  const m = useMutation({ mutationFn: () => api.put<Wallets>(`/wallets/${slot}`, f).then((r) => r.data), onSuccess: (w) => { setE({}); setOk('Carteira salva.'); qc.setQueryData(['wallets', owner], w) }, onError: (x) => { setOk(''); if (x instanceof ApiError) setE(x.fields) } })
  const id = (k: string) => `${slot}-${k}`
  return (
    <form noValidate className="card mb-6 grid gap-4 p-6 sm:grid-cols-2" aria-labelledby={id('t')} onSubmit={(ev) => { ev.preventDefault(); m.mutate() }}>
      <h2 id={id('t')} className="text-lg font-bold sm:col-span-2">{title}</h2>
      <div><label className="label" htmlFor={id('provider')}>Tipo de carteira</label><select id={id('provider')} className="field" value={f.provider} aria-invalid={!!e.provider || undefined} onChange={(ev) => setF({ ...f, provider: ev.target.value })}><option value="">Selecione</option>{['MetaMask', 'WalletConnect', 'Coinbase'].map((p) => <option key={p}>{p}</option>)}</select><FieldErr id={id('provider')} e={e.provider} /></div>
      <div><label className="label" htmlFor={id('network')}>Rede</label><select id={id('network')} className="field" value={f.network} aria-invalid={!!e.network || undefined} onChange={(ev) => setF({ ...f, network: ev.target.value })}><option value="">Selecione</option>{['Ethereum', 'Polygon', 'Base'].map((p) => <option key={p}>{p}</option>)}</select><FieldErr id={id('network')} e={e.network} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={id('address')}>Endereço da carteira</label><Input id={id('address')} value={f.address} aria-invalid={!!e.address || undefined} aria-describedby={e.address ? `${id('address')}-e` : undefined} onChange={(ev) => setF({ ...f, address: ev.target.value })} /><FieldErr id={id('address')} e={e.address} /></div>
      <div className="sm:col-span-2 flex items-center gap-4"><Button type="submit" disabled={m.isPending}>Salvar carteira</Button><span role="status" className="text-accent">{ok}</span></div>
    </form>
  )
}
export function WalletsPage() {
  const { owner } = useSession(); const q = useQuery({ queryKey: ['wallets', owner], queryFn: () => get<Wallets>('/wallets') })
  return <Shell active="wallets"><h1 className="mb-6 text-xl font-bold">Carteiras</h1>{q.isPending ? <p>Carregando…</p> : <><WalletForm slot="primary" title="Carteira principal" value={q.data?.primary ?? null} /><WalletForm slot="secondary" title="Carteira secundária" value={q.data?.secondary ?? null} /></>}</Shell>
}
