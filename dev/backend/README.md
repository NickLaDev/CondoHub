# CondoHub Backend

API multi-instância (multi-tenant) do CondoHub. Node + Express + TypeScript, Postgres via `pg`,
validação com Zod.

> Setup rápido do monorepo inteiro: veja o [README raiz](../../README.md#início-rápido-2-comandos).

## Instalação

```bash
cd dev/backend
npm install
cp .env.example .env   # ajuste DATABASE_URL se não usar o Postgres local padrão (ver raiz do repo)
```

## Execução

```bash
npm run dev      # hot reload (tsx watch) — http://localhost:3000
npm run build     # build de produção (tsc) → dist/
npm start         # roda o build
```

- Health: <http://localhost:3000/health> → `{"ok":true}`
- Swagger UI: <http://localhost:3000/api/docs>

## Variáveis de ambiente

| Variável | Valores | Default | Descrição |
|---|---|---|---|
| `DATABASE_URL` | connection string | — | Postgres (local Docker ou Supabase) |
| `AUTH_MODE` | `mock` / `jwt` | `mock` | Mock: headers `X-Dev-*`. JWT: `Authorization: Bearer` |
| `TENANT_MODE` | `mock` / `path` | `mock` | Mock: header `X-Dev-InstanceId`. Path: `:instanceKey` na URL |
| `UPLOAD_MODE` | `local` / `supabase` | `local` | Local: salva em `var/uploads/`. Supabase: bucket privado com signed upload URLs |
| `AUDIT_MODE` | `console` / `db` | `console` | Console: log no stdout. DB: grava em `audit_logs` |
| `PORT` | número | `3000` | Porta do servidor |
| `CORS_ORIGIN` | `*` ou CSV de origins | `*` | Origins permitidas |
| `JWT_ACCESS_SECRET` | string | `dev_secret` | Secret para verificar JWT (só se `AUTH_MODE=jwt`) |
| `INVITE_CODE_PEPPER` | string | `dev_invite_code_pepper` | Pepper usado no hash dos códigos de convite |
| `RATE_LIMIT_ENABLED` | `true` / `false` | `true` | Ativa rate limit nas rotas de auth |
| `SUSPENDED_INSTANCE_KEYS` | CSV | `` | Instance keys bloqueadas (403 `INST_SUSPENDED`) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | — | `` | Obrigatórios só se `UPLOAD_MODE=supabase` |

Para desenvolvimento local recomendado, `.env.example` já vem configurado com `AUTH_MODE=jwt`,
`TENANT_MODE=path` e `DATABASE_URL` apontando pro Postgres local do `./scripts/db-local.sh`.

## Banco de dados e migrations

Migrations em `src/db/migrate/migrations/` (SQL numerado, aplicado em ordem, registrado em
`public.schema_migrations`). Ver a seção [Banco de dados](../../README.md#banco-de-dados-e-migrations)
do README raiz para os comandos de subir o Postgres local.

```bash
npm run db:migrate                            # aplica migrations pendentes
npm run db:status                              # mostra o que já rodou
npm run db:migrate:reconcile-checksums         # reconcilia checksum após editar uma migration aplicada
```

## Modo mock (sem Postgres/JWT)

Com `AUTH_MODE=mock` e `TENANT_MODE=mock`, o contexto da requisição é controlado via headers,
sem precisar de banco nem token real:

| Header | Obrigatório | Descrição |
|---|---|---|
| `X-Dev-InstanceId` | Sim (rotas tenant) | ID da instância |
| `X-Dev-UserId` | Sim (pra ter actor) | ID do usuário |
| `X-Dev-Roles` | Sim (pra ter actor) | Roles CSV (ex: `SINDICO_ADMIN,MORADOR`) |
| `X-Dev-UnitId` | Não | ID da unidade |

## Upload de anexos (Supabase Storage)

Só necessário com `UPLOAD_MODE=supabase` (o default `local` salva em `var/uploads/` sem
configuração extra). Fluxo: `POST .../uploads/presign` → upload direto pro Storage → `POST
.../uploads/complete`. Bucket `attachments`, privado, acesso via signed URL.

```bash
# 1. crie o bucket privado (Storage → New bucket, "Public bucket" OFF)
# 2. no .env:
UPLOAD_MODE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
```

## Principais endpoints

Referência completa e sempre atualizada: **Swagger UI em `/api/docs`**. Visão geral por domínio:

| Domínio | Base path | Exemplos |
|---|---|---|
| Auth (admin) | `/api/v1/admin/auth` | login, me |
| Admin Global | `/api/v1/admin/{instances,plans,stats,logs}` | CRUD de instâncias/planos, estatísticas |
| Auth (tenant) | `/api/v1/{instanceKey}/auth` | login, logout, me, registro via convite |
| Estrutura | `/api/v1/{instanceKey}/structure/{blocks,units}` | blocos e unidades do condomínio |
| Usuários | `/api/v1/{instanceKey}/users/{residents,staff}` | moradores e funcionários |
| Comunicados | `/api/v1/{instanceKey}/announcements` | CRUD + confirmação de leitura |
| Canais | `/api/v1/{instanceKey}/channels` | canais, posts, comentários, moderação |
| Chamados | `/api/v1/{instanceKey}/tickets` | abertura, status, mensagens, reabertura |
| Entregas | `/api/v1/{instanceKey}/deliveries` | fila, atribuição, conclusão |
| Convites | `/api/v1/{instanceKey}/invites` | convite direto e código/QR |
| QR / acessos | `/api/v1/{instanceKey}/qr` | assinatura e verificação |
| Inbox | `/api/v1/{instanceKey}/unit/inbox` | canal morador ↔ síndico |
| Portaria | `/api/v1/{instanceKey}/turns` | turnos de portaria |
| Uploads | `/api/v1/{instanceKey}/uploads` | presign/complete de anexos |
| Dashboard | `/api/v1/{instanceKey}/dashboard/summary` | indicadores agregados |

## Estrutura de pastas

```
src/
  app.ts                    # Pipeline Express
  server.ts                 # Boot
  config/env.ts              # Env parsing com Zod
  core/
    contract/                # Roles, enums, permissions, RequestContext, AppError, paginação
    auth/                     # JWT + mock auth
    db/                       # Client Postgres
    services/                 # AuditService, UploadService (local/supabase), QrService, Notifications
  middleware/                 # requestId, contextBuilder, errorHandler, cors, rateLimit
  modules/                    # Um diretório por domínio (rotas + service + repo)
    adminGlobal/ audit/ auth/ communication/ condoProfile/
    dashboard/ deliveries/ instances/ invites/ structure/ tickets/ users/
  routes/
    health.ts                # /health e /ready
    swagger.ts                # /api/docs
    v1/
      admin.ts                # /api/v1/admin/*
      tenant.ts                # /api/v1/:instanceKey/*
  db/migrate/                # Runner de migrations + arquivos .sql numerados
  types/express.d.ts          # Extensão do Express Request (ctx, id)
```

## Roles disponíveis

`ADMIN_GLOBAL` | `SINDICO_ADMIN` | `FUNC_ENTREGAS` | `FUNC_MANUTENCAO` | `MORADOR`
