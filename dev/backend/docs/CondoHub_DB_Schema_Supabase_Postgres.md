# CondoHub — Banco de Dados (PostgreSQL no Supabase)
Data: 2026-02-23

Este documento descreve o **modelo de dados completo** do CondoHub (MVP + extensões planejadas já previstas), cobrindo:

- Admin Global (SaaS): instâncias, planos, suporte e métricas
- Tenant/Condomínio: estrutura, usuários, convites, comunicação, tickets, entregas
- Uploads (Supabase Storage) + anexos genéricos
- QR (assinatura dinâmica) + **logs de entrada/saída somente via QR**
- Auditoria/logs (append-only) + consulta filtrável
- Notificações (infra mínima)

> Observação: “Documentos” do condomínio e outros módulos futuros podem ser suportados **sem mudar o modelo base**, usando `attachments` + `attachment_links` com `target_type='DOCUMENT'` (quando o módulo existir).

---

## 1) Premissas e padrões

### 1.1 Multi-instância (anti-vazamento forte)
- Toda tabela “do condomínio” contém `instance_id UUID NOT NULL`.
- **FK composta** em tabelas tenant-scoped: `(instance_id, parent_id) → parent(instance_id, id)` para impedir referências cruzadas entre instâncias.
- Para permitir FK composta, toda tabela tenant-scoped tem `UNIQUE(instance_id, id)` além do `PRIMARY KEY (id)`.

### 1.2 Soft delete/arquivamento
- Onde aplicável: `archived_at` (cadastros) e `deleted_at` (conteúdo).
- Logs e históricos: **append-only**, sem delete nem update (no máximo correção via novo evento).

### 1.3 Auditoria e histórico em transação
Mudanças críticas devem ocorrer na **mesma transação**:
1) atualiza entidade
2) grava histórico (ex.: `ticket_status_history`, `delivery_events`)
3) grava `audit_logs`

### 1.4 Uploads (Storage)
- Supabase Storage com bucket `attachments` (recomendado **private**).
- Backend gera **signed upload url** (presign) e confirma (complete).
- Backend gera **signed download url** quando o app precisa exibir.

---

## 2) Extensões e tipos

### 2.1 Extensões recomendadas
- `pgcrypto` (UUIDs)
- `citext` (email case-insensitive)
- `pg_trgm` (busca por texto, opcional)

### 2.2 Enums (contrato congelado)
- `instance_status`: `ACTIVE | SUSPENDED`
- `user_status`: `ACTIVE | DISABLED`
- `ticket_status`: `ABERTO | EM_ANALISE | EM_EXECUCAO | RESOLVIDO | FECHADO | REABERTO`
- `delivery_status`: `CHEGOU | EM_DISTRIBUICAO | ENTREGUE | NAO_ENTREGUE`
- `inbox_status`: `ABERTO | EM_ATENDIMENTO | RESOLVIDO | ARQUIVADO`
- `channel_visibility`: `PUBLIC | PRIVATE`
- `push_platform`: `android | ios | web`
- `attachment_status`: `PENDING | READY | FAILED | DELETED`
- `invite_kind`: `RESIDENT_JOIN | VISITOR` (VISITOR pode ficar “planejado”, sem uso no MVP)

---

## 3) Tabelas por módulo (com chaves e relações)

### 3.1 Admin Global (SaaS)
#### `plans`
- `id uuid pk`
- `name text`
- `features jsonb`
- `limits jsonb`
- `archived_at timestamptz null`
- `created_at timestamptz`

Índices:
- `plans (archived_at)` (para listar ativos)

#### `instances`
- `id uuid pk`
- `instance_key text unique`
- `name text`
- `status instance_status`
- `plan_id uuid fk → plans.id`
- `suspended_at timestamptz null`
- `created_at/updated_at`

Índices:
- `unique(instance_key)`
- `instances(status)`
- `instances(plan_id)`

---

### 3.2 IAM (Auth + Refresh + Sessões)
#### `users`
- `id uuid pk`
- `instance_id uuid null` (**NULL = admin global**; bate com claim `iid=null`)
- `unit_id uuid null`
- `name text`
- `email citext null`
- `phone text null`
- `password_hash text`
- `roles text[]` (CHECK só permite roles do contrato)
- `status user_status`
- `token_version int`
- `created_at/updated_at/disabled_at`

Regras (CHECK recomendado):
- Se `roles` contém `ADMIN_GLOBAL` ⇒ `instance_id IS NULL`
- Se `roles` contém `MORADOR` ⇒ `instance_id IS NOT NULL` e `unit_id IS NOT NULL`

Índices:
- `unique(instance_id, email) where instance_id is not null and email is not null`
- `unique(email) where instance_id is null and email is not null`
- `users(instance_id, unit_id)`
- (opcional) `GIN(roles)` se filtrar por role com frequência

#### `sessions`
- `id uuid pk`
- `user_id uuid fk → users.id`
- `refresh_hash text unique`
- `expires_at timestamptz`
- `revoked_at timestamptz null`
- `ip text null`, `user_agent text null`, `request_id text null`
- `created_at/last_seen_at`

Índices:
- `sessions(user_id, expires_at)`
- `sessions(refresh_hash)` unique

---

### 3.3 Condomínio (fundacional)
#### `condo_profile` (1:1)
- `instance_id uuid pk fk → instances.id`
- `display_name text`
- `legal_name text null`
- `address jsonb`
- `settings jsonb`
- `created_at/updated_at`

#### `blocks`
- `id uuid pk`
- `instance_id uuid fk → instances.id`
- `label text`
- `archived_at timestamptz null`
- `created_at`

Constraints/Índices:
- `unique(instance_id, id)`
- `unique(instance_id, label) where archived_at is null`
- `blocks(instance_id)`

#### `units`
- `id uuid pk`
- `instance_id uuid fk → instances.id`
- `block_id uuid null` (**FK composta**: `(instance_id, block_id) → blocks(instance_id, id)`)
- `label text` (ex.: “B-34”)
- `archived_at timestamptz null`
- `created_at`

Constraints/Índices:
- `unique(instance_id, id)`
- `unique(instance_id, label) where archived_at is null`
- `units(instance_id, block_id)`

> Após criar `units`, adicione FK em `users(unit_id)`.

---

### 3.4 Convites (onboarding)
#### `invites`
- `id uuid pk`
- `instance_id uuid`
- `unit_id uuid`
- `kind invite_kind`
- `token_hash text unique`
- `expires_at timestamptz`
- `used_at timestamptz null`
- `revoked_at timestamptz null`
- `created_by_user_id uuid null`
- `created_at`

FKs compostas:
- `(instance_id, unit_id) → units(instance_id, id)`
- (opcional) `(instance_id, created_by_user_id) → users(instance_id, id)`

Índices:
- `invites(instance_id, unit_id, expires_at)`
- `invites(instance_id, used_at)`
- `invites(instance_id, revoked_at)`

---

### 3.5 Uploads / Anexos (Supabase Storage)
#### `attachments`
- `id uuid pk` (attachmentId)
- `instance_id uuid`
- `owner_user_id uuid null`
- `unit_id uuid null`
- `status attachment_status` (`PENDING` no presign; `READY` no complete)
- `bucket text` (default `attachments`)
- `path text` (padrão: `{instance_id}/{attachment_id}_{safeFilename}`)
- `content_type text`
- `size_bytes int`
- `checksum_sha256 text null`
- `created_at/updated_at/completed_at`

Constraints/Índices:
- `unique(instance_id, id)`
- (opcional) `unique(bucket, path)`
- `attachments(instance_id, status, created_at desc)`
- `attachments(instance_id, owner_user_id, created_at desc)`

#### `attachment_links`
- `id uuid pk`
- `instance_id uuid`
- `attachment_id uuid`
- `target_type text` (ex.: ANNOUNCEMENT, CHANNEL_POST, TICKET_MESSAGE, DELIVERY, INBOX_MESSAGE…)
- `target_id uuid`
- `created_at`

FK composta:
- `(instance_id, attachment_id) → attachments(instance_id, id)`

Índices:
- `attachment_links(instance_id, target_type, target_id)`
- `attachment_links(instance_id, attachment_id)`

---

### 3.6 Auditoria / Logs (obrigatório, append-only)
#### `audit_logs`
- `id uuid pk`
- `instance_id uuid`
- `action text` (ex.: ACCESS_QR_VERIFIED, DELIVERY_QR_MISMATCH…)
- `target_type text`
- `target_id uuid null`
- `unit_id uuid null`
- `actor_user_id uuid null`
- `ip/user_agent/request_id`
- `metadata jsonb`
- `created_at`

Índices (performance de consulta):
- `audit_logs(instance_id, created_at desc)`
- `audit_logs(instance_id, action, created_at desc)`
- `audit_logs(instance_id, unit_id, created_at desc)`
- (opcional) `GIN(metadata)` se filtrar por campos dentro do metadata

> **Entrada/saída**: é apenas um subconjunto de `audit_logs` com `action=ACCESS_QR_*`.

---

### 3.7 Notificações (infra)
#### `push_tokens`
- `id uuid pk`
- `instance_id uuid`
- `user_id uuid`
- `platform push_platform`
- `token text`
- `revoked_at timestamptz null`
- `created_at/last_seen_at`

FK composta:
- `(instance_id, user_id) → users(instance_id, id)`

Índice/Unique:
- `unique(instance_id, token) where revoked_at is null`
- `push_tokens(instance_id, user_id)`

---

## 4) Domínios operacionais (Dev 2)
- Comunicação: `announcements`, `announcement_acks`, `channels`, `channel_posts`, `channel_comments`, `moderation_actions`, `inbox_threads`, `inbox_messages`
- Tickets: `tickets`, `ticket_messages`, `ticket_status_history`
- Entregas: `deliveries`, `delivery_events`, `delivery_turns`

---

## 5) Cobertura por funcionalidade (mapa rápido)
✅ Admin Global: `instances`, `plans`, `users`, `sessions`, `audit_logs`  
✅ Estrutura: `condo_profile`, `blocks`, `units`  
✅ Usuários e login: `users`, `sessions`  
✅ Convites: `invites`  
✅ Comunicação: tabelas acima + `attachment_links`  
✅ Tickets: `tickets`, `ticket_messages`, `ticket_status_history` (+ anexos via links)  
✅ Entregas: `deliveries`, `delivery_events`, `delivery_turns` (+ anexos)  
✅ Uploads: `attachments`, `attachment_links` + Supabase Storage  
✅ QR/Entrada-Saída: audit via `audit_logs` (`ACCESS_QR_*`)  
✅ Logs/Auditoria: `audit_logs` filtrável  
✅ Notificações: `push_tokens`  

---

## 6) Performance (índices por endpoints críticos)
- **/tickets**: `tickets(instance_id, status, created_at desc)`, `tickets(instance_id, unit_id, created_at desc)`, `tickets(instance_id, assigned_to_user_id, status)`, `tickets(instance_id, due_at)`
- **/deliveries**: `deliveries(instance_id, status, created_at desc)`, `deliveries(instance_id, unit_id, created_at desc)`, `deliveries(instance_id, assigned_to_user_id, status)`
- **/logs**: `audit_logs(instance_id, created_at desc)`, `audit_logs(instance_id, action, created_at desc)`, `audit_logs(instance_id, unit_id, created_at desc)`

---

## 7) Implementação no Supabase (plano por fases)
### Fase 1 (Dev 1) — Core
1) extensões + enums + triggers  
2) core: plans/instances/users/sessions  
3) fundacional: condo_profile/blocks/units/invites  
4) uploads: attachments/attachment_links  
5) logs/push: audit_logs/push_tokens  
6) bucket storage `attachments` (private)

### Fase 2 (Dev 2) — Domínios
1) comunicação (mural/canais/inbox)  
2) tickets + statusHistory  
3) deliveries + events + turns  
4) índices finais

### Fase 3 — Seed
- 1 plan, 1 instance, 1 síndico, 1 unit, 1 morador, 2 staffs

---

## 8) Segurança no Supabase
- Backend é “fonte da verdade”.
- Use service role no servidor (nunca no app).
- RLS pode ficar habilitado sem policies públicas (opcional, para hardening).

---

## 9) Observações finais
1) FK composta é a base do anti-vazamento.
2) `/uploads/complete` deve validar prefixo `{instance_id}/` no path.
3) Entrada/saída só via QR por enquanto.
