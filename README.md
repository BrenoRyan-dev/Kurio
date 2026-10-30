# ✦ Kurio — NFT Marketplace

<p align="center">
  <strong>Explore. Discover. Collect.</strong>
  <br />
  Uma experiência de marketplace digital para explorar e colecionar NFTs.
  <br /><br />
  <a href="https://kurio-5qw5.vercel.app/">
    <strong>🌐 ACESSAR PROJETO ONLINE</strong>
  </a>
</p>

---

## 📌 Sobre o projeto

O **Kurio** é um marketplace de NFTs desenvolvido para proporcionar uma experiência moderna de navegação, exploração e compra de ativos digitais.

O projeto foi construído com React e TypeScript, utilizando ferramentas modernas do ecossistema frontend para gerenciamento de rotas, estado, comunicação com APIs e atualizações em tempo real.

A aplicação simula os principais fluxos de um marketplace real, desde a autenticação até o checkout e acompanhamento de pedidos.

## 🚀 Demonstração

<pre>
https://kurio-5qw5.vercel.app/
</pre>

Acesse a aplicação publicada e explore suas funcionalidades.

## ✨ Funcionalidades

- 🔐 Cadastro, login e autenticação de usuários.
- 🎨 Exploração de NFTs e coleções.
- 🔎 Pesquisa, filtros e ordenação.
- ❤️ Sistema de favoritos.
- 🛒 Carrinho de compras.
- 🎟️ Aplicação de cupons de desconto.
- 💳 Simulação de checkout e processamento de pedidos.
- 📦 Histórico e acompanhamento de pedidos.
- 👤 Gerenciamento de perfil.
- 👛 Simulação de conexão com carteiras digitais.
- ⚡ Atualizações em tempo real com Socket.IO.
- 📱 Interface responsiva.

## 🛠️ Tecnologias

| Tecnologia | Aplicação |
|---|---|
| React | Construção da interface |
| TypeScript | Tipagem estática |
| TanStack Router | Gerenciamento de rotas |
| TanStack Query | Cache e gerenciamento de dados |
| Axios | Requisições HTTP |
| Socket.IO | Comunicação em tempo real |
| Tailwind CSS | Estilização |
| shadcn/ui | Componentes de interface |
| MSW | Simulação de APIs |
| Playwright | Testes automatizados |
| Lighthouse | Auditoria de qualidade |

## 🏗️ Arquitetura

O projeto utiliza **MSW (Mock Service Worker)** para simular toda a comunicação com o backend.

As operações REST e os eventos Socket.IO são simulados na camada de rede, inclusive na versão publicada.

Essa abordagem permite testar diferentes comportamentos da aplicação sem depender de um servidor backend externo.

## 🧪 Testes e cenários simulados

A aplicação conta com um painel de controle Mock que permite reproduzir diferentes situações:

| Cenário | Descrição |
|---|---|
| `default` | Funcionamento normal |
| `slow` | Respostas lentas |
| `variable` | Respostas fora de ordem |
| `offline` | Indisponibilidade da aplicação |
| `flaky` | Erros 503 intermitentes |
| `server-error` | Erros internos |
| `empty` | Resultados vazios |
| `payment-declined` | Pagamento recusado |
| `order-timeout` | Atraso na confirmação do pedido |

Também é possível simular alterações de NFTs, desconexões do Socket.IO, expiração de sessão e recuperação de pedidos utilizando chaves de idempotência.

## 🔑 Credenciais para demonstração

Utilize uma das contas fictícias para explorar os recursos autenticados:

| E-mail | Senha |
|---|---|
| `ana@kurio.test` | `Kurio@123` |
| `bruno@kurio.test` | `Kurio@123` |

**Cupons de demonstração:**

- `KURIO10` — 10% de desconto.
- `WELCOME5` — 5% de desconto.
- `OLD2024` — cupom expirado.

## 💻 Como executar localmente

**Pré-requisitos:** Node.js e npm.

```bash
# Clone o repositório
git clone https://github.com/BrenoRyan-dev/Kurio.git

# Entre na pasta
cd Kurio

# Instale as dependências
npm install

# Inicie o projeto
npm run dev
```

A aplicação estará disponível em:

`http://localhost:5173`

### Outros comandos

```bash
# Gerar build de produção
npm run build

# Visualizar build
npm run preview

# Verificar tipos
npm run typecheck

# Executar lint
npm run lint

# Instalar navegador do Playwright
npx playwright install chromium

# Executar testes E2E
npm run test:e2e

# Executar auditoria Lighthouse
npm run lighthouse
```

## ⚙️ Configuração

Variável de ambiente:

```env
VITE_ENABLE_MOCKS=true
```

Os dados simulados são persistidos no `localStorage`, utilizando a chave `kurio-db-v1`.

## 📡 API REST

A aplicação disponibiliza endpoints simulados para:

- Autenticação e gerenciamento de sessão.
- Listagem e detalhes de NFTs.
- Favoritos.
- Carrinho e cupons.
- Checkout e pedidos.
- Perfil e atualização de senha.
- Carteiras digitais.

O prefixo utilizado é `/api`.

As respostas seguem estruturas padronizadas, com tratamento de erros HTTP como 401, 403, 404, 409, 410, 422, 500 e 503.

## ⚡ Atualizações em tempo real

O Socket.IO simula dois eventos principais:

- `nft.updated` — atualizações de preço, disponibilidade e informações dos NFTs.
- `order.updated` — alterações no status dos pedidos.

Os eventos utilizam identificadores e controle de versão para permitir o tratamento de mensagens duplicadas ou desatualizadas.

## 📦 Deploy

O projeto está publicado na **Vercel**, com configuração de rotas SPA através do arquivo `vercel.json`.

🌐 **Projeto online:** https://kurio-5qw5.vercel.app/

---

## 👨‍💻 Desenvolvido por

**Breno Ryan Garcia Neves**

Desenvolvedor com foco em Front-End, interessado na construção de aplicações web modernas, interfaces intuitivas e soluções utilizando tecnologias atuais.

- GitHub: [@BrenoRyan-dev](https://github.com/BrenoRyan-dev)
- Projeto: [Kurio NFT Marketplace](https://kurio-5qw5.vercel.app/)

---

<p align="center">
  Desenvolvido com dedicação e aprendizado contínuo.
  <br />
  <strong>Kurio © 2026</strong>
</p>
