import * as D from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
export const Dialog = D.Root
export function DialogContent({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 bg-black/70" />
      <D.Content className="card fixed left-1/2 top-1/2 max-h-[92vh] w-[min(720px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 focus:outline-none">
        <D.Title className="sr-only">{title}</D.Title>
        <D.Description className="sr-only">Resumo do pedido</D.Description>
        <D.Close aria-label="Fechar" className="absolute right-4 top-4 text-accent"><X /></D.Close>
        {children}
      </D.Content>
    </D.Portal>
  )
}
