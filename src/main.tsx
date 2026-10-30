import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ApiError } from '@/lib/api'
import { router } from './router'
import './index.css'

// Política de cache: dados do catálogo "frescos" por 30 s; privados por owner na queryKey;
// retry só para falhas transitórias (rede/5xx/timeout), até 2x; 4xx não repete.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, refetchOnWindowFocus: true,
      retry: (n, e) => n < 2 && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500),
    },
    mutations: { retry: false },
  },
})

async function boot() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', serviceWorker: { url: '/mockServiceWorker.js' }, quiet: true })
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>
    </React.StrictMode>,
  )
}
void boot()
