# Arquitetura e decisões

## Camadas
`lib/api.ts` (Axios + erros tipados) → hooks TanStack Query nas rotas → UI. `mocks/` só fala HTTP/WebSocket: nada de resposta fictícia em componentes, hooks ou no cliente Axios. Valores em ETH trafegam como **string decimal**; o mock calcula em BigInt (18 casas, `lib/decimal.ts`).

## Cache (TanStack Query)
`staleTime` 30 s; `retry` até 2x só para rede/timeout/5xx (4xx não repete); mutations sem retry. Chaves privadas incluem `owner` (`userId` ou `guest`) e `['quote', owner, coupon]`; logout/expiração/login executam `queryClient.clear()` e reconectam o socket (sem vazamento entre usuários). Consultas do catálogo recebem `AbortSignal` (descarta respostas obsoletas) e usam `keepPreviousData`. Otimismo com rollback: favoritos (`onMutate`/`onError`/`onSettled`).

## Sessão
Token opaco em `localStorage`; `/auth/me` recupera a sessão. 401 `SESSION_EXPIRED` → evento global → limpa cache, vai a `/login?redirect=…&expired=1` e retoma o contexto após login. Rotas privadas usam `beforeLoad` do TanStack Router. Senhas só existem como hash no mock (hash de brinquedo, não criptográfico).

## Carrinho
Servidor (mock) por `owner`; visitante usa `X-Guest-Id` e o carrinho é **mesclado** no login (limitado ao estoque). Cupom guardado no carrinho. Chave de item `nftId~índiceDaEdição`.

## Checkout, idempotência e recibo
Revisão → confirmação. O servidor revalida preço/estoque/cupom/taxa contra `expectedTotal` (409 `PRICE_CHANGED`) e a UI exige nova revisão se a cotação mudar. `Idempotency-Key` fica em `sessionStorage` atrelada ao conteúdo: reenvio após timeout reutiliza a chave e recupera o mesmo pedido. Pedido `pending` é recuperado após refresh (`GET /orders?status=pending`). Recibo = `snapshot` da cotação no pedido. Só os itens comprados saem do carrinho, ao confirmar.

## Tempo real e reconciliação
`socket.io-client` conecta em `wss://realtime.kurio.mock`, interceptado por `ws.link` + `@mswjs/socket.io-binding`. Cliente descarta `eventId` repetido e versão ≤ última vista por recurso; depois **invalida** as queries (REST é a fonte de verdade). Em reconexão invalida tudo. `order.updated` só é emitido ao socket autenticado do dono. Limitação: broadcast vale para a aba atual; sem rooms/acks.

## Desvios do Figma / limitações
- Imagens: o arquivo Figma não estava acessível; os NFTs usam SVGs gerados (`mocks/db.ts`). Troque `image` pelas artes reais em `public/`.
- Checkout: omitidos "Nome do perfil" e "Código de indicação" (obrigatório no layout, sem regra definida) e o seletor ".eth".
- Itens do menu do perfil fora de escopo aparecem desabilitados (`aria-disabled`).
- Mobile: navegação em linha rolável (sem menu hambúrguer); sem frames dedicados para perfil/carteiras/confirmação.
- Hero sem carrossel (apenas o destaque estático).
