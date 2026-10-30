import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setToken, getToken } from '@/lib/session'
import { SCENARIOS } from '@/mocks/handlers'

const post = (p: string, b?: object) => fetch(p, { method: 'POST', headers: { 'content-type': 'application/json', authorization: getToken() ? `Bearer ${getToken()}` : '' }, body: JSON.stringify(b ?? {}) })

/** Painel de demonstração: dispara cenários/eventos pela camada de rede (MSW), nunca pela UI. */
export function MockPanel() {
  const [open, setOpen] = useState(false); const qc = useQueryClient()
  const cur = localStorage.getItem('kurio-scenario') ?? 'default'
  const target = 'emerald-ape-042'
  return (
    <div className="fixed bottom-2 right-2 z-50 text-xs">
      <button className="border border-line bg-surface px-2 py-1" aria-expanded={open} onClick={() => setOpen(!open)}>Mock</button>
      {open && (
        <div className="mt-1 w-64 space-y-2 border border-line bg-surface p-3">
          <label className="block">Cenário
            <select className="field mt-1 h-8" value={cur} onChange={(e) => { localStorage.setItem('kurio-scenario', e.target.value); location.reload() }}>
              {SCENARIOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          {([['Preço do Emerald Ape → 2.50', { type: 'price', nftId: target, price: '2.50' }], ['Esgotar Emerald Ape (ed. 1/1 e 1/10)', { type: 'stock', nftId: target, available: 0 }],
            ['Evento duplicado', { type: 'duplicate', nftId: target }], ['Evento antigo', { type: 'stale', nftId: target }]] as const).map(([l, b]) => (
            <button key={l} className="block w-full border border-line p-1 text-left" onClick={() => post('/__mock/emit', b)}>{l}</button>
          ))}
          <button className="block w-full border border-line p-1 text-left" onClick={() => post('/__mock/disconnect')}>Derrubar conexão Socket.IO</button>
          <button className="block w-full border border-line p-1 text-left" onClick={() => post('/__mock/expire')}>Expirar sessão</button>
          <button className="block w-full border border-line p-1 text-left" onClick={async () => { await post('/__mock/reset'); localStorage.removeItem('kurio-scenario'); setToken(null); qc.clear(); location.href = '/' }}>Resetar dados</button>
        </div>
      )}
    </div>
  )
}
