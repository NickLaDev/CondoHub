# CondoHub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Plataforma multi-instância para condomínios: comunicação oficial (mural/canais), chamados de
manutenção/ocorrências com histórico e SLA, enquetes/documentos, entregas, e controle de acesso
via convites/QR com logs de auditoria.

Monorepo com backend (Node/TypeScript), dois frontends web (React) e um app mobile (Flutter),
todos multi-tenant por `instance`.

---

## Funcionalidades

- **Mural e canais** — comunicados oficiais com confirmação de leitura obrigatória, canais
  temáticos com posts e comentários.
- **Chamados** — abertura, triagem e acompanhamento de manutenção/ocorrências, com histórico de
  transição de status e SLA.
- **Entregas** — controle de encomendas por unidade (chegou → em distribuição → entregue).
- **Convites e acessos** — convites via código/QR com logs de auditoria, controle por role
  (admin global, síndico, morador, portaria).
- **Inbox** — canal direto morador ↔ síndico.
- **Multi-instância** — um mesmo backend atende vários condomínios isolados por `instance`.
- **Admin Global** — painel de governança da plataforma: gestão de instâncias, planos e suporte.

## Stack

| Parte         | Tecnologia                                   | Rodar com             |
| ------------- | --------------------------------------------- | --------------------- |
| backend       | Node + Express + TypeScript (tsx), `pg`, Zod | `npm run dev`         |
| banco         | PostgreSQL (16 local em Docker / Supabase)    | `scripts/db-local.sh` |
| web-sindico   | React 19 + Vite + React Query + Zustand       | `npm run dev`         |
| web (admin global) | React 19 + Vite + Tailwind              | `npm run dev`         |
| app-mobile    | Flutter (Dart)                                | `flutter run`         |

## Estrutura do repositório

```
CondoHub/
├── dev/
│   ├── backend/        # API + banco (Node + Express + TypeScript, Postgres/Supabase)
│   ├── app-mobile/     # App do morador/portaria (Flutter)
│   ├── web-sindico/    # Painel do síndico/admin (React + Vite)
│   └── web/            # Painel Admin Global — Super Admin Console (React + Vite)
├── scripts/
│   ├── db-local.sh     # Sobe um Postgres LOCAL (Docker) e roda TODAS as migrations
│   └── dev-all.sh      # Sobe backend + web-sindico + app-mobile de uma vez
├── docs/
│   ├── specs/          # Escopo e critérios de entrega por módulo
│   └── architecture/   # Modelo de dados (MER/DER) e modelagem do banco
└── README.md
```

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Início rápido (2 comandos)](#início-rápido-2-comandos)
- [Ambientes / arquivos `.env`](#ambientes--arquivos-env)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Rodando cada parte manualmente](#rodando-cada-parte-manualmente)
- [Seed / dados de demonstração](#seed--dados-de-demonstração)
- [Portas](#portas)
- [Solução de problemas](#solução-de-problemas)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Pré-requisitos

- **Node.js** 20+ (testado com 24) e **npm**
- **Docker** (Docker Desktop) — para o Postgres local
- **Flutter** 3.2+ (testado com 3.41) — só se for rodar o app mobile, com um emulador Android,
  simulador iOS ou dispositivo conectado
- **git**

---

## Início rápido (2 comandos)

Na raiz do projeto:

```bash
# 1) Cria o Postgres LOCAL em Docker e roda todas as migrations (deixa o banco rodando)
./scripts/db-local.sh

# 2) Sobe backend + web-sindico + app-mobile juntos (Ctrl+C encerra tudo)
./scripts/dev-all.sh
```

Antes disso, crie o `.env` do backend a partir do exemplo:

```bash
cd dev/backend && cp .env.example .env && cd ../..
```

Depois disso:

- API/backend: <http://localhost:3000> · Swagger: <http://localhost:3000/api/docs> · health: <http://localhost:3000/health>
- web-sindico: <http://localhost:5173>
- app-mobile: abre no emulador/simulador/dispositivo conectado

Não vai rodar o app mobile agora (sem emulador aberto)? Use:

```bash
./scripts/dev-all.sh --no-mobile
```

---

## Ambientes / arquivos `.env`

Cada projeto tem um `.env.example` versionado no git como modelo. Os arquivos reais (`.env`,
`.env.local`) são **locais e nunca vão pro git** (ver `.gitignore`).

| Arquivo        | Para quê                                                            |
| -------------- | -------------------------------------------------------------------- |
| `.env.example` | Modelo/documentação dos campos — copie a partir dele                |
| `.env`         | Perfil ativo do **backend** (Node não lê `.env.local` sozinho)      |
| `.env.local`   | Perfil ativo dos **frontends Vite** (`web`, `web-sindico`) — o Vite carrega automaticamente |

```bash
# backend
cd dev/backend && cp .env.example .env

# web / web-sindico
cd dev/web && cp .env.example .env.local
cd dev/web-sindico && cp .env.example .env.local
```

#### App mobile (Flutter)

O Flutter **não lê arquivos `.env`**. A URL da API é injetada em build via `--dart-define`
(ver `dev/app-mobile/lib/core/config/app_config.dart`). Os arquivos `.env.local`/`.env.online`
do mobile são só **referência** do valor a usar:

```bash
cd dev/app-mobile
flutter run --dart-define=CONDOHUB_API_BASE_URL=http://localhost:3000/api/v1
# Android emulator usa http://10.0.2.2:3000/api/v1 (já é o default do app para local)
```

---

## Banco de dados e migrations

As migrations ficam em `dev/backend/src/db/migrate/migrations/` (arquivos `.sql` numerados) e são
aplicadas em ordem por um runner próprio, que registra o que já rodou na tabela
`public.schema_migrations` (idempotente: rodar de novo não reaplica).

### Banco local (recomendado para dev)

```bash
./scripts/db-local.sh            # cria/sobe o Postgres em Docker + roda as migrations
./scripts/db-local.sh --status   # só mostra o status das migrations
./scripts/db-local.sh --reset    # APAGA o volume e recria o banco do zero
```

O container criado:

- Imagem: `postgres:16-alpine`
- Nome: `condohub-postgres` · Porta: `5433` (host) → `5432` (container)
- Credenciais: `condohub` / `condohub` · Banco: `condohub`
- `DATABASE_URL=postgresql://condohub:condohub@localhost:5433/condohub`
- Volume `condohub-pgdata` (os dados persistem entre reinícios)

Comandos úteis:

```bash
docker stop condohub-postgres        # parar
docker start condohub-postgres       # voltar a subir
docker logs -f condohub-postgres     # ver logs
```

### Rodar migrations manualmente

```bash
cd dev/backend
npm install
DATABASE_URL="postgresql://condohub:condohub@localhost:5433/condohub" npm run db:migrate
DATABASE_URL="postgresql://condohub:condohub@localhost:5433/condohub" npm run db:status
```

---

## Rodando cada parte manualmente

### Backend (`dev/backend`)

```bash
cd dev/backend
npm install
cp .env.example .env      # ajuste DATABASE_URL se não usar o Postgres local padrão
npm run dev                # API em http://localhost:3000 (tsx watch, hot-reload)
```

- Swagger / docs: <http://localhost:3000/api/docs>
- Health: <http://localhost:3000/health> → `{"ok":true}`
- Variáveis principais (validadas por Zod em `src/config/env.ts`): `DATABASE_URL`, `AUTH_MODE`
  (`jwt`|`mock`), `TENANT_MODE` (`path`|`mock`), `UPLOAD_MODE` (`local`|`supabase`),
  `AUDIT_MODE` (`console`|`db`), `PORT`, `JWT_ACCESS_SECRET`.

### web-sindico (`dev/web-sindico`)

```bash
cd dev/web-sindico
npm install
npm run dev               # http://localhost:5173
```

- Pode rodar em **FULL MOCK** (`VITE_ENABLE_FULL_MOCK=true` no `.env.local`): funciona **sem**
  backend/banco, ótimo para mexer na UI.
- Para bater na API local real: no `.env.local`, mantenha `VITE_ENABLE_FULL_MOCK=false` (precisa
  de dados no banco — veja [Seed / dados de demonstração](#seed--dados-de-demonstração)).

### web — Admin Global (`dev/web`)

```bash
cd dev/web
npm install
npm run dev               # http://localhost:5173 (usa VITE_API_BASE_URL do .env.local)
```

Painel de governança da plataforma (Super Admin): gestão de instâncias, planos e suporte.
Login em `/admin/login` — use o Super Admin do [seed](#seed--dados-de-demonstração)
(`admin@condohub.com` / `admin123`).

### app-mobile (`dev/app-mobile`)

```bash
cd dev/app-mobile
flutter pub get
# Suba a API local antes (./scripts/db-local.sh + backend rodando)
flutter run --dart-define=CONDOHUB_API_BASE_URL=http://localhost:3000/api/v1
```

- Precisa de um emulador Android, simulador iOS ou dispositivo conectado (`flutter devices`).
- Sem `--dart-define`, o app usa o default: `10.0.2.2:3000` no Android emulator e
  `localhost:3000` no iOS/desktop.

---

## Seed / dados de demonstração

Um banco recém-migrado vem **vazio** (só o schema). O **web-sindico** roda em full mock por padrão
e não precisa de dados. Para login real ou para o app mobile, popule o banco local.

**Instance:** `demo` — Condomínio Demo, Bloco A, unidade 101 vinculada ao usuário Morador Demo.

| Usuário       | Email                | Senha         | Role          |
| ------------- | --------------------- | ------------- | ------------- |
| Super Admin   | `admin@condohub.com`  | `admin123`    | ADMIN_GLOBAL  |
| Síndico Demo  | `sindico@demo.com`    | `sindico123`  | SINDICO_ADMIN |
| Morador Demo  | `morador@demo.com`    | `morador123`  | MORADOR       |
| Porteiro Demo | `porteiro@demo.com`   | `porteiro123` | FUNC_ENTREGAS |

Scripts de referência de seed em `dev/backend/docs/` — revise as colunas antes de aplicar, pois o
schema pode ter evoluído. Para gerar hash de senha no Postgres local:

```sql
SELECT crypt('minha_senha', gen_salt('bf'));
```

> Essas são credenciais de **dados de exemplo/seed** para ambiente local de desenvolvimento —
> nenhuma delas aponta para infraestrutura real.

---

## Portas (desenvolvimento local)

| Serviço       | URL                           |
| ------------- | ------------------------------ |
| backend / API | <http://localhost:3000>       |
| Swagger       | <http://localhost:3000/api/docs>  |
| web-sindico   | <http://localhost:5173>       |
| web (admin global) | <http://localhost:5173>* |
| Postgres      | `localhost:5433`              |

\* Se subir os dois apps Vite juntos, o segundo migra para `5174` automaticamente.

---

## Solução de problemas

- **`docker: command not found` / banco não sobe** — instale e abra o Docker Desktop.
- **Porta 5433/3000/5173 ocupada** — pare o processo conflitante ou customize:
  `CONDOHUB_PG_PORT=5444 ./scripts/db-local.sh`, `PORT=3001 npm run dev`.
- **`flutter` não encontrado** — rode `./scripts/dev-all.sh --no-mobile` (sobe só backend + web).
- **App mobile não conecta na API** — no Android emulator a URL é `http://10.0.2.2:3000/api/v1`
  (não `localhost`).
- **Recomeçar o banco do zero** — `./scripts/db-local.sh --reset`.
- **Erro de checksum de migration** — uma migration já aplicada foi editada. Use um banco novo
  (`--reset`) em dev, ou reconcilie com `npm run db:migrate:reconcile-checksums`.

---

## Contribuindo

Contribuições são bem-vindas. Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o fluxo de branches,
padrão de commits (`tipo(escopo): assunto`) e checklist antes de abrir um PR.

## Documentação adicional

- [`docs/specs/`](docs/specs) — escopo, arquitetura de páginas e critérios de entrega por módulo
  (backend, web-sindico, app-mobile).
- [`docs/architecture/`](docs/architecture) — modelo de dados (MER/DER) e modelagem do banco.

## Autores

Projeto criado e mantido por [Nicolas Laredo](https://github.com/NickLaDev) e Enzo Tenani.

## Licença

Distribuído sob a licença [MIT](LICENSE).
