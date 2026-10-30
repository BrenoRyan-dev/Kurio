import { Minus, Plus } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'

export const Stepper = ({ value, max, onChange, label, disabled }: { value: number; max: number; onChange: (n: number) => void; label: string; disabled?: boolean }) => (
  <div className="flex items-center gap-3" role="group" aria-label={`Quantidade de ${label}`}>
    <button aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-fg disabled:opacity-40"><Minus size={16} /></button>
    <span aria-live="polite" className="w-6 text-center">{value}</span>
    <button aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-fg disabled:opacity-40"><Plus size={16} /></button>
  </div>
)
export const Eth = ({ v }: { v: string }) => <span className="font-bold text-accent">{v} ETH</span>

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const m = error instanceof ApiError ? error.message : 'Algo deu errado.'
  return (
    <div role="alert" className="card border border-danger/60 p-6 text-center">
      <p className="mb-4">{m}</p>{onRetry && <Button variant="outline" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  )
}
