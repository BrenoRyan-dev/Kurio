# Kurio · NFT Marketplace

React + TypeScript · TanStack Router/Query · Axios · Socket.IO · Tailwind · shadcn/ui · MSW · Playwright · Lighthouse.
Toda a "API" (REST e Socket.IO) é simulada na camada de rede com MSW, inclusive no build publicado.

## Setup
```bash
npm install            # o postinstall do MSW gera public/mockServiceWorker.js (campo "msw" do package.json)
npm run dev            # http://localhost:5173 com mocks
npm run build && npm run preview   # http://localhost:4173
npm run typecheck && npm run lint
npx playwright install chromium && npm run test:e2e
npx playwright test visual --update-snapshots   # cria as baselines (depois, versione-as)
npm run lighthouse     # exige o preview rodando; gera ./lighthouse/*.html|json e summary.json (mediana de 3 execuções)
```
Variáveis: `VITE_ENABLE_MOCKS` (padrão `true`). Deploy: Vercel (`vercel.json` já reescreve rotas para o SPA).

## Credenciais fictícias
`ana@kurio.test` e `bruno@kurio.test`, senha `Kurio@123`. Cupons: `KURIO10` (10%), `WELCOME5` (5%), `OLD2024` (expirado). Endereço de carteira terminado em `dead` simula recusa de conexão.

## Cenários e reset
Painel **Mock** (canto inferior direito) ou `?scenario=<nome>`: `default`, `slow`, `variable` (respostas fora de ordem), `offline`, `flaky` (503 a cada 3ª chamada), `server-error`, `empty`, `payment-declined`, `order-timeout` (pedido criado, resposta atrasa 15 s; reenviar recupera o mesmo pedido pela Idempotency-Key).
O painel também dispara `nft.updated` (preço/estoque/duplicado/antigo), derruba o Socket.IO, expira a sessão e **reseta** os dados (também `POST /__mock/reset`). Estado persiste em `localStorage` (`kurio-db-v1`).

## Contratos REST (prefixo `/api`)
`POST auth/register|login|logout`, `GET auth/me` · `GET nfts?q&collections&tag&min&max&sort&page`, `GET nfts/:id` · `GET|PUT|DELETE favorites(/:id)` · `GET cart`, `POST cart/items`, `PATCH|DELETE cart/items/:key`, `PUT|DELETE cart/coupon`, `POST quote` · `POST orders` (header `Idempotency-Key`), `GET orders(?status)`, `GET orders/:id` · `GET|PATCH profile`, `POST profile/password` · `GET wallets`, `PUT wallets/:slot`, `POST wallets/connect`.
Erros: `{ code, message, fields? }` com 401 (`UNAUTHENTICATED`/`SESSION_EXPIRED`), 403, 404, 409 (`AVAILABILITY`, `PRICE_CHANGED`, `EMAIL_TAKEN`, `IDEMPOTENCY_CONFLICT`), 410 (`COUPON_EXPIRED`), 422 (`VALIDATION`), 503/500.
Eventos Socket.IO: `nft.updated {eventId, resource, id, version, name, price, available[]}` · `order.updated {eventId, resource, id, version, status}`.
