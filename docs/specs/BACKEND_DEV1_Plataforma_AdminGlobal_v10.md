# CondoHub Backend — DEV 1 (Plataforma + Admin Global + Fundacionais) — v3 (Supabase Postgres + Storage)

Este documento é o “manual de execução” do **Dev 1**. Somado ao documento do **Dev 2**, ele cobre **100% do backend**.

---

## 0) O que já existe no repo (PASSO 0 pronto)

✅ Já está implementado e validado:

- Contrato congelado (não alterar): `src/core/contract/CONTRACT_FROZEN.md`
- Constantes do contrato: `roles.ts`, `enums.ts`, `permissions.ts`, `requestContext.ts`, `errors.ts`, `pagination.ts`
- Serviços base (com factory):
  - `AuditService` (console ok, db stub)
  - `UploadService` (local ok, supabase stub)
  - `QrService` (stub: token `dev:<unitId>`)
  - `NotificationService` (stub console)
- Middlewares: `requestId`, `contextBuilder (mock|jwt + mock|path)`, `cors`, `rateLimit`, `errorHandler`
- Rotas: health + v1 skeleton + stubs
- Debug DEV: `GET /api/v1/:instanceKey/_debug/ctx` (confirma `req.ctx`)
- `qr/signature` e `qr/verify` funcionando em mock + audit console
- `uploads` funcionando em local

### PASSO 0 — Supabase Storage (já implementado no repo)

O PASSO 0 já tem `UPLOAD_MODE=supabase` funcionando (não é stub). Ele inclui:

- `src/core/services/uploads/supabaseClient.ts` — client server-side com `SUPABASE_SERVICE_ROLE_KEY` (service role, server-only)
- `src/core/services/uploads/uploads.supabase.ts` — implementação real do UploadService:
  - valida `contentType` e `size`
  - gera `path` padronizado: `${ctx.instanceId}/${attachmentId}_${safeFilename}`
  - usa `createSignedUploadUrl` para retornar `signedUrl` + `token`
  - no `complete()`, valida que o `path` pertence à instância (`path` deve começar com `${ctx.instanceId}/`) e verifica existência do objeto
- `scripts/test_signed_upload.ts` — script de validação: **presign → uploadToSignedUrl → complete**
- `.env.example` + `src/config/env.ts` com:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET`
  - `SUPABASE_STORAGE_SIGNED_UPLOAD_TTL_SEC`

Isso significa que, após criar o bucket `attachments` no projeto Supabase e preencher o `.env`, vocês já conseguem **subir imagens no Storage** e validar com o script.

**O seu trabalho é EVOLUIR**, não reescrever.

---

## 1) Seu escopo (Dev 1) — o que você entrega

### Plataforma / Governo

1. **Multi-instância real**: resolver `instanceKey → instanceId` no Postgres e bloquear instância suspensa
2. **IAM real**: login/logout/me + refresh rotativo com sessions (hash do refresh) + `tokenVersion`
3. **RBAC enforcement**:
   - `requireAuth()`
   - `requirePermission("...")` (permission strings do contrato)
   - helpers de escopo: `assertSameUnit` e `assertAssigned`
4. **Admin Global** (SaaS): instâncias, planos, suporte, stats, logs globais
5. **Auditoria e logs** append-only no DB + rota de consulta (`/logs`)
6. **Uploads e anexos**:
   - manter `UPLOAD_MODE=local` (dev)
   - implementar `UPLOAD_MODE=supabase` (produção) usando **Supabase Storage** (bucket `attachments`)
   - persistir `attachments` no Postgres
   - fornecer forma de obter **URL de download** (signed ou public)
7. **Fundacionais tenant**:
   - condo profile
   - blocks/units
   - users (residents + staff)
   - invites (+ accept público)
8. **QR**:
   - assinatura dinâmica do morador
   - `qr/verify` como **único gerador** de log de entrada/saída (por enquanto)

---

## 2) Contrato congelado (imutável)

Tudo em `src/core/contract/CONTRACT_FROZEN.md` é lei:

- rotas base + refresh único
- claims do JWT
- roles/enums
- error/paginação
- `RequestContext`
- permission strings

Sem mudança sem alinhamento.

---

## 3) Organização de código (para não conflitar com Dev 2)

Crie módulos assim:
`src/modules/<nome>/{routes.ts, controller.ts, service.ts, repo.ts, dto.ts}`

Você é dono de:

- `iam`, `adminGlobal`, `tenantResolver`,
- `structure`, `users`, `invites`, `condoProfile`,
- `uploads`, `attachments`,
- `auditLogs`,
- `qr`, `notifications`,
- `db/*` (camada Postgres, migrations)

Evite mexer em módulos do Dev 2 (communication/tickets/deliveries/dashboard).

---

## 4) Middlewares que você deve criar (enforcement)

### 4.1 requireAuth

**Arquivo:** `src/middleware/requireAuth.ts`

- Em `AUTH_MODE=mock`: exige `ctx.actor` preenchido (senão `401 AUTH_REQUIRED`)
- Em `AUTH_MODE=jwt`: exige `Authorization: Bearer <token>` e valida, senão `401 AUTH_INVALID`
- Resultado: rotas protegidas sempre recebem `ctx.actor`

### 4.2 requirePermission

**Arquivo:** `src/middleware/requirePermission.ts`

- Crie `src/core/contract/rolePermissions.ts` com mapping **fixo**:
  - `ADMIN_GLOBAL` → inclui `admin:manage` (e o que mais fizer sentido)
  - `SINDICO_ADMIN` → manage do condomínio + read:any
  - `MORADOR` → read:unit + create ticket etc
  - `FUNC_ENTREGAS` → deliveries:deliver + reads necessários
  - `FUNC_MANUTENCAO` → tickets:update (em escopo)
- Se faltar permissão: `403 PERMISSION_DENIED`

### 4.3 helpers de escopo

**Arquivo:** `src/core/contract/scopeHelpers.ts`

- `assertSameUnit(resourceUnitId, actor.unitId)`
- `assertAssigned(resourceAssignedTo, actor.userId)`
- Lançar `AppError(403, "SCOPE_DENIED", ...)`

Dev 2 deve **chamar** esses helpers, não duplicar regra.

---

## 5) Postgres no Supabase (DB + migrations) — padrão recomendado

### 5.1 Como vocês vão conectar

- Se o backend vai rodar “sempre ligado” (VPS/Docker): use **conexão direta** (simples e estável)
- Se for serverless/edge: use **pooler**; nesse caso, algumas libs/ORM exigem ajustes para prepared statements

**Recomendação pragmática (MVP):**

- Back “sempre ligado” + conexão direta
- Migrações via Supabase CLI (`supabase db push`) ou via Prisma migrate (com `DIRECT_URL`)

### 5.2 DB layer no projeto

Crie uma pasta:

- `src/db/` com:
  - `pool.ts` (pg Pool)
  - `tx.ts` (helper para transações)
  - `queries/*` (ou repos por módulo)
  - `migrations/` (se não usar Prisma)

> Se usar Prisma:

- manter `DIRECT_URL` para migrations e `DATABASE_URL` para runtime

---

## 6) Schema mínimo (tabelas que você cria como “core”)

Você cria as tabelas do core e deixa as tabelas do Dev 2 para ele.

### 6.1 Admin Global

- `plans`
- `instances` (com `instance_key` unique, `status` ACTIVE/SUSPENDED, `plan_id`)

### 6.2 IAM

- `users`
  - `instance_id` NULL para `ADMIN_GLOBAL` (claim `iid=null`)
  - `unit_id` NULL quando não aplicável
  - `roles` como `text[]` com CHECK para roles fixas
  - `token_version` int
- `sessions`
  - `refresh_hash` unique
  - `revoked_at`, `expires_at`

### 6.3 Fundacionais

- `condo_profile` (1:1 por instance)
- `blocks` (soft delete via `archived_at`)
- `units` (soft delete via `archived_at`)
- `invites` (hash do token, expiração, usado, revogado)

### 6.4 Uploads

- `attachments`
  - `bucket`, `path`, `content_type`, `size_bytes`
  - `instance_id`, `owner_user_id`, `unit_id?`
- `attachment_links` (recomendado)
  - liga `attachment_id` a `target_type` + `target_id`
  - permite anexos em mural/canais/tickets/deliveries/inbox sem duplicar colunas

### 6.5 Logs + Push

- `audit_logs` (append-only)
- `push_tokens`

> Observação: “entrada/saída” por QR é **ação** em `audit_logs`, não tabela separada.

---

## 7) Supabase Storage (obrigatório) — implementar UPLOAD_MODE=supabase

### 7.1 Config do Supabase

- Bucket: `attachments`
- Sugestão: **private**
- Caminho padronizado:
  - `"{instance_id}/{attachment_id}_{safe_filename}"`

### 7.2 Env (server-only)

Adicionar:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (NUNCA vai pro app)
- `SUPABASE_STORAGE_BUCKET=attachments`
- `SUPABASE_STORAGE_SIGNED_UPLOAD_TTL_SEC=7200` (2h)
- `SUPABASE_STORAGE_SIGNED_DOWNLOAD_TTL_SEC=600` (10 min)

### 7.3 UploadService supabase (substituir stub)

**Arquivo:** `src/core/services/uploads/uploads.supabase.ts`

#### presign(ctx, { filename, contentType, size })

- validar allowlist:
  - MVP: `image/jpeg`, `image/png`
  - (se liberar) `application/pdf`
- validar size (ex.: <= 5MB no MVP)
- gerar `attachmentId`
- criar `path` padronizado
- gerar signed upload URL (e token, se sua lib retornar)
- retornar para o cliente:
  - `{ attachmentId, bucket, path, signedUrl, token }`
  - manter compatibilidade com o que o PASSO 0 já retorna (`uploadUrl`), se necessário

#### complete(ctx, { attachmentId, bucket, path, contentType, sizeBytes })

- persistir linha em `attachments` (instanceId, ownerUserId, bucket, path, contentType, size)
- retornar `{ ok:true, attachmentId }`

### 7.4 Como o app baixa para exibir imagem

Com bucket private, o app precisa de URL assinada. Para isso, implemente **uma das opções**:

**Opção A (recomendada): endpoint dedicado**

- `GET /api/v1/:instanceKey/attachments/:id/url`
  - retorna `{ url, expiresAt }` (signed download url)

**Opção B: embutir URLs ao buscar entidades**

- quando listar/detalhar ticket/delivery/post, o backend troca `attachmentId` por `signedUrl`

A opção A é mais simples e desacopla o Dev 2.

---

## 8) Endpoints do Dev 1 (rotas completas)

### 8.1 Health

- `GET /health` (já existe)
- `GET /ready` (já existe)

### 8.2 Tenant resolver (TENANT_MODE=path)

No `contextBuilder` (ou módulo separado):

- lookup em `instances` por `instance_key`
- 404 `TENANT_NOT_FOUND`
- 403 `INST_SUSPENDED`

### 8.3 IAM tenant

Base: `/api/v1/:instanceKey/auth/*`

- `POST /api/v1/:instanceKey/auth/login`
- `POST /api/v1/:instanceKey/auth/logout`
- `GET /api/v1/:instanceKey/auth/me`

### 8.4 IAM admin global

Base: `/api/v1/admin/auth/*`

- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`

### 8.5 Refresh (único)

- `POST /api/v1/auth/refresh`
  Regras:
- localizar session por `refresh_hash`
- se revogado: 401
- rotacionar: novo refresh, substituir hash, invalidar anterior
- emitir novo access 5 min

#### Padrão de resposta (recomendado e usado em todos os auth endpoints)

Para manter o front simples, use o mesmo formato em:

- `POST /auth/login` (tenant)
- `POST /admin/auth/login` (admin)
- `POST /auth/refresh`
- `POST /invites/accept`

Resposta:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresInSec": 300,
  "user": {
    "id": "uuid",
    "instanceId": "uuid|null",
    "unitId": "uuid|null",
    "roles": ["SINDICO_ADMIN"],
    "name": "string",
    "email": "string|null",
    "phone": "string|null"
  }
}
```

Logout:

```json
{ "ok": true }
```

### 8.6 Admin Global (SaaS)

Base: `/api/v1/admin/*` (exigir `ADMIN_GLOBAL` + `admin:manage`)

**Instances**

- `GET  /api/v1/admin/instances` (paginação + filtros)
- `POST /api/v1/admin/instances` (gera `instance_key` unique)
- `GET  /api/v1/admin/instances/:id`
- `PATCH /api/v1/admin/instances/:id`
- `POST /api/v1/admin/instances/:id/suspend`
- `POST /api/v1/admin/instances/:id/reactivate`

**Plans**

- `GET  /api/v1/admin/plans`
- `POST /api/v1/admin/plans`
- `GET  /api/v1/admin/plans/:id`
- `PATCH /api/v1/admin/plans/:id`
- `POST /api/v1/admin/plans/:id/archive` (soft)

**Stats**

- `GET /api/v1/admin/stats` (básico; pode crescer depois)

**Logs globais**

- `GET /api/v1/admin/logs` (consulta audit_logs, paginado)

**Support**

- `POST /api/v1/admin/support/reset-sindico`
  - reset de senha ou criação de invite/admin
  - sempre gerar audit log

### 8.7 Condo Profile

Base: `/api/v1/:instanceKey/condo/profile`

- `GET /api/v1/:instanceKey/condo/profile`
- `PATCH /api/v1/:instanceKey/condo/profile`
  Permissão: use `structure:manage` no MVP (não inventar perm nova)

### 8.8 Estrutura

Permissão: `structure:manage`

- `GET  /api/v1/:instanceKey/structure/blocks`
- `POST /api/v1/:instanceKey/structure/blocks`
- `PATCH /api/v1/:instanceKey/structure/blocks/:id`
- `POST /api/v1/:instanceKey/structure/blocks/:id/archive`

- `GET  /api/v1/:instanceKey/structure/units`
- `POST /api/v1/:instanceKey/structure/units`
- `PATCH /api/v1/:instanceKey/structure/units/:id`
- `POST /api/v1/:instanceKey/structure/units/:id/archive`

### 8.9 Usuários

Permissão: `users:manage`

**Moradores**

- `GET  /api/v1/:instanceKey/users/residents`
- `POST /api/v1/:instanceKey/users/residents` (unitId obrigatório)
- `PATCH /api/v1/:instanceKey/users/residents/:id`
- `POST /api/v1/:instanceKey/users/residents/:id/disable`

**Funcionários**

- `GET  /api/v1/:instanceKey/users/staff`
- `POST /api/v1/:instanceKey/users/staff` (role = FUNC_ENTREGAS|FUNC_MANUTENCAO)
- `PATCH /api/v1/:instanceKey/users/staff/:id`
- `POST /api/v1/:instanceKey/users/staff/:id/disable`

### 8.10 Convites

Permissão: `invites:manage`

- `POST /api/v1/:instanceKey/invites`
- `GET  /api/v1/:instanceKey/invites`
- `POST /api/v1/:instanceKey/invites/:id/revoke`

Público:

- `POST /api/v1/:instanceKey/invites/accept`
  - valida token/expiração/uso
  - cria usuário morador (unitId do invite)
  - cria sessão (refresh+access) e retorna **accessToken + refreshToken** (mesmo padrão do login)

### 8.11 Uploads + Attachments

> Nota de segurança: no MVP o `/uploads/complete` aceita `bucket/path` vindo do cliente (porque não há DB ainda). Quando o Postgres estiver pronto, **não confie em `path` do cliente** — derive o `path` a partir de `instanceId + attachmentId` ou guarde o `path` gerado no `presign` (pending) e valide antes de persistir.

- `POST /api/v1/:instanceKey/uploads/presign` (auth required)
- `POST /api/v1/:instanceKey/uploads/complete` (auth required)
- `GET /api/v1/:instanceKey/attachments/:id/url` (se bucket private)

### 8.12 Logs (instância)

Permissão: `logs:read`

- `GET /api/v1/:instanceKey/logs` (filtros: período, unitId, action, actorUserId, busca)

### 8.13 Notificações

- `POST /api/v1/:instanceKey/notifications/register` (salva `push_tokens`)

### 8.14 QR (entrada/saída via QR)

- `POST /api/v1/:instanceKey/qr/signature` (morador gera QR dinâmico)
- `POST /api/v1/:instanceKey/qr/verify`
  - **OBRIGATÓRIO**: gerar audit log
    - ok: `ACCESS_QR_VERIFIED`
    - fail: `ACCESS_QR_DENIED`

---

## 9) Testes mínimos (curl) para você validar

Em DEV (mock):

- `TENANT_MODE=mock`, `AUTH_MODE=mock`
- headers:
  - `X-Dev-InstanceId`, `X-Dev-UserId`, `X-Dev-Roles`, `X-Dev-UnitId`

Checklist:

1. `/health` ok
2. `/qr/signature` retorna token
3. `/qr/verify` gera audit console/db
4. `/uploads/presign` retorna signedUrl quando `UPLOAD_MODE=supabase`
5. `/uploads/complete` grava `attachments`
6. `/attachments/:id/url` retorna signed download (se private)

---

## 10) DoD Dev 1 (final)

- Tenant resolver real + bloqueio suspenso + anti-vazamento
- IAM completo (login/logout/me + refresh rotativo + sessions + tokenVersion)
- RBAC enforcement por permission string + helpers de escopo
- Admin Global completo (instances/plans/support/stats/logs)
- Fundacionais completos (condo profile, structure, users, invites)
- Supabase Storage funcionando (presign + upload + complete) + attachments persistidos
- Audit/logs em DB (append-only) + consultas
- QR verify gerando logs de entrada/saída via audit
