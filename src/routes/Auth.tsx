import { useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { setToken } from '@/lib/session'
import type { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const s = useSearch({ strict: false }) as { redirect?: string; expired?: string }; const nav = useNavigate(); const qc = useQueryClient()
  const [errs, setErrs] = useState<Record<string, string>>({}); const [top, setTop] = useState('')
  const m = useMutation({
    mutationFn: (b: Record<string, string>) => api.post<{ token: string; user: User }>(`/auth/${mode}`, b).then((r) => r.data),
    onSuccess: (r) => { qc.clear(); setToken(r.token); void nav({ href: s.redirect && s.redirect.startsWith('/') ? s.redirect : '/' }) }, // retorna ao fluxo anterior
    onError: (e) => { if (e instanceof ApiError) { setErrs(e.fields); setTop(Object.keys(e.fields).length ? '' : e.message) } },
  })
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const b = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; const er: Record<string, string> = {}
    if (mode === 'register' && !b.displayName?.trim()) er.displayName = 'Informe seu nome.'
    if (!/^\S+@\S+\.\S+$/.test(b.email ?? '')) er.email = 'E-mail inválido.'
    if (!b.password || (mode === 'register' && b.password.length < 8)) er.password = mode === 'register' ? 'Use ao menos 8 caracteres.' : 'Informe sua senha.'
    setErrs(er); setTop(''); if (!Object.keys(er).length) m.mutate(b)
  }
  const F = (id: string, label: string, type = 'text', ac?: string) => (
    <div><label htmlFor={id} className="label">{label}</label><Input id={id} name={id} type={type} autoComplete={ac} aria-invalid={!!errs[id] || undefined} aria-describedby={errs[id] ? `${id}-e` : undefined} />{errs[id] && <p id={`${id}-e`} className="err">{errs[id]}</p>}</div>)
  return (
    <form noValidate onSubmit={submit} className="card mx-auto max-w-md space-y-5 p-8" aria-labelledby="t">
      <h1 id="t" className="text-2xl font-bold">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
      {s.expired && <p role="status" className="border border-accent p-3 text-sm">Sua sessão expirou. Entre novamente para continuar de onde parou.</p>}
      {mode === 'register' && F('displayName', 'Nome de exibição', 'text', 'name')}
      {F('email', 'E-mail', 'email', 'email')}{F('password', 'Senha', 'password', mode === 'login' ? 'current-password' : 'new-password')}
      {top && <p role="alert" className="err">{top}</p>}
      <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</Button>
      <p className="text-center text-sm">{mode === 'login' ? <>Novo por aqui? <Link className="text-accent underline" to="/register" search={s}>Criar conta</Link></> : <>Já tem conta? <Link className="text-accent underline" to="/login" search={s}>Entrar</Link></>}</p>
      {mode === 'login' && <p className="text-center text-xs text-tan">Demo: ana@kurio.test / Kurio@123</p>}
    </form>
  )
}
export const Login = () => <AuthForm mode="login" />
export const Register = () => <AuthForm mode="register" />
