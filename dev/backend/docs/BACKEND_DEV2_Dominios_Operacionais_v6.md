# CondoHub Backend — DEV 2 (Domínios Operacionais: Comunicação + Tickets + Entregas + Dashboard) — v4 (Supabase-ready + completo)

Este documento é o “manual de execução” do **Dev 2**. Somado ao documento do **Dev 1**, ele cobre **100% do backend**.

---

## 0) O que já existe no repo (PASSO 0 pronto)
- `AUTH_MODE=mock` injeta `ctx.actor` via headers `X-Dev-*`
- `TENANT_MODE=mock` injeta `ctx.instanceId` via `X-Dev-InstanceId`
- `req.ctx` tipado (`RequestContext`)
- erro padrão + Zod validation + pagination helpers
- `AuditService`, `QrService`, `UploadService`, `NotificationService` (factories)

### Como rodar em DEV sem depender do Dev 1
Use:
- `AUTH_MODE=mock`
- `TENANT_MODE=mock`

Headers típicos:
- `X-Dev-InstanceId: IID_TEST`
- `X-Dev-UserId: U1`
- `X-Dev-Roles: MORADOR` (ou `SINDICO_ADMIN`, `FUNC_ENTREGAS`, `FUNC_MANUTENCAO`)
- `X-Dev-UnitId: UNIT123` (quando simular morador)

✅ Você desenvolve tudo sem esperar IAM/tenant real.

---

## 1) Regras obrigatórias do seu lado
1) Toda tabela do seu domínio tem `instance_id`
2) Toda query filtra por `ctx.instanceId`
3) Morador: **escopo unit** (nunca vaza)
4) Manutenção: só tickets atribuídos (use helper `assertAssigned`)
5) Toda ação crítica: `audit.log(ctx, ...)`
6) Listagens sempre paginadas (`parsePagination`)
7) Soft delete onde fizer sentido (`deleted_at`/`archived_at`)
8) Rotas devem “declarar permissão” (usar `requirePermission(...)` quando existir)

---

## 2) Integração com o que o Dev 1 entrega (NÃO reinventar)
**Atualização (já no repo):** o PASSO 0 já tem `uploads.supabase.ts` implementado e um script de validação (`scripts/test_signed_upload.ts`) que executa **presign → uploadToSignedUrl → complete**. Isso ajuda você a testar anexos sem depender do app.


**Obs (já no repo):** quando `UPLOAD_MODE=supabase`, o `/uploads/presign` retorna `signedUrl` + `token` (além de `bucket/path`) e o upload real pode ser feito via `uploadToSignedUrl`.
Você deve tratar essas peças como contratos:

- **AuditService**: sempre chamar em ações críticas.
- **UploadService**: você não sobe arquivo. Você só recebe `attachmentId`.
- **QrService.verify**: obrigatório para `deliveries/:id/complete` (QR forte).
- **requireAuth / requirePermission**: quando Dev 1 plugar, suas rotas já devem estar organizadas por permissão.
- **scopeHelpers**: `assertSameUnit` e `assertAssigned` (não duplique regra).

---

## 3) Attachments (Supabase Storage) — como você usa
Você NÃO fala com o Supabase Storage diretamente.

Fluxo:
1) cliente chama `/uploads/presign` e `/uploads/complete` (Dev 1)
2) seus endpoints recebem `attachmentId` (UUID)
3) você valida que:
   - `attachments.instance_id == ctx.instanceId`
   - (opcional) contentType permitido para aquela rota
4) você cria links em `attachment_links`:
   - `target_type` + `target_id`

Para exibir mídia (bucket private):
- o app chama `GET /attachments/:id/url` (Dev 1) e recebe URL assinada.

---

## 4) Tabelas do seu domínio (Postgres no Supabase)
> Todas com `instance_id` e índices por `(instance_id, created_at)` e por `status`.

### 4.1 Comunicação
- `announcements`
- `announcement_acks`
- `channels`
- `channel_posts` (soft delete `deleted_at`)
- `channel_comments` (soft delete `deleted_at`)
- `moderation_actions`
- `inbox_threads` (1 por unit; status)
- `inbox_messages`

### 4.2 Tickets
- `tickets`
- `ticket_messages`
- `ticket_status_history` (obrigatório)

### 4.3 Entregas
- `deliveries`
- `delivery_events` (obrigatório)
- `delivery_turns`

Você também usa tabelas do core do Dev 1:
- `attachments`
- `attachment_links`
- `users` / `units` (FK)

---

## 5) Endpoints do seu domínio (rotas completas)
Base tenant: `/api/v1/:instanceKey/...`

> Importante: mantenha os “targets” para anexos via `attachment_links`.  
> Ex.: announcement/post/message/delivery/ticket.

---

# A) Comunicação

## A1) Mural (Announcements)
Permissão admin: `communication:manage`

- `GET  /announcements` (paginado, filtros: archived, requireAck)
- `POST /announcements`
  body: `{ title, body, requireAck?: boolean, attachmentIds?: string[] }`
  - criar announcement
  - validar attachments e criar links (target_type='ANNOUNCEMENT')
  - audit: `ANNOUNCEMENT_CREATED`
- `PATCH /announcements/:id`
  body: `{ title?, body?, requireAck?, attachmentIds? }`
  - atualizar
  - se attachmentIds informado: atualizar links (remove antigos e insere novos)
  - audit: `ANNOUNCEMENT_UPDATED`
- `POST /announcements/:id/archive` (soft)
  - audit: `ANNOUNCEMENT_ARCHIVED`
- `POST /announcements/:id/ack` (morador)
  - regra: morador só pode ack se tiver `ctx.actor.unitId`
  - registrar `announcement_acks` (unique per user)
  - audit: `ANNOUNCEMENT_ACK`

## A2) Canais
Permissão admin: `communication:manage`

- `GET  /channels` (paginado)
- `POST /channels`
- `PATCH /channels/:id`
- `POST /channels/:id/archive` (soft)

### Posts (morador participa; síndico modera)
- `GET  /channels/:id/posts` (paginado)
- `POST /channels/:id/posts`
  body: `{ body, attachmentIds?: string[] }`
  - criar post
  - links: target_type='CHANNEL_POST'
  - audit: `CHANNEL_POST_CREATED`
- `PATCH /channels/:id/posts/:postId` (autor ou síndico)
- `POST /channels/:id/posts/:postId/delete` (soft)
  - audit: `CHANNEL_POST_DELETED`

### Comentários
- `GET  /channels/:id/posts/:postId/comments` (paginado)
- `POST /channels/:id/posts/:postId/comments`
- `PATCH /channels/:id/posts/:postId/comments/:commentId`
- `POST /channels/:id/posts/:postId/comments/:commentId/delete` (soft)
  - audit: `CHANNEL_COMMENT_DELETED`

### Moderação (síndico)
- `POST /channels/:id/moderation/silence-user`
  body `{ userId, minutes?, reason? }`
  - criar `moderation_actions`
  - audit: `MODERATION_SILENCE_USER`
- `POST /channels/:id/moderation/remove-content`
  body `{ contentType, contentId, reason? }`
  - soft delete do conteúdo
  - audit: `MODERATION_REMOVE_CONTENT`

## A3) Atendimento privado por Unit (Inbox)
Regras:
- morador: só sua unit (use `assertSameUnit`)
- síndico: todas

- `GET  /unit/inbox`
  - morador: retorna thread da própria unit + mensagens
  - síndico: lista threads (paginado) + filtros por status/unitId
- `POST /unit/inbox/messages`
  body `{ threadId?, message, attachmentIds?: string[] }`
  - se thread não existir (morador): criar thread para a unit
  - inserir mensagem
  - links: target_type='INBOX_MESSAGE'
  - audit: `INBOX_MESSAGE_CREATED`
- `POST /unit/inbox/status` (síndico)
  body `{ threadId, status }` (ABERTO/EM_ATENDIMENTO/RESOLVIDO/ARQUIVADO)
  - audit: `INBOX_STATUS_CHANGED`

---

# B) Tickets (Chamados)

Permissões:
- `tickets:create`
- `tickets:read:any` (síndico)
- `tickets:read:unit` (morador)
- `tickets:update`

- `POST /tickets`
  body: `{ category?, location?, description, attachmentIds?: string[] }`
  Regras:
  - morador cria na própria `unitId` do ctx
  - síndico pode criar para unitId informado
  - calcular `dueAt` (regra simples MVP)
  - links: target_type='TICKET'
  - audit: `TICKET_CREATED`

- `GET /tickets` (paginado + filtros: status, unitId, assignedTo, overdue)
  - síndico: vê todos
  - morador: filtra por `ctx.actor.unitId`

- `GET /tickets/:id` (mesmas regras)

- `POST /tickets/:id/messages`
  body `{ message, attachmentId?: string }`
  - inserir `ticket_messages`
  - se attachmentId: link target_type='TICKET_MESSAGE'
  - audit: `TICKET_MESSAGE_CREATED`

- `POST /tickets/:id/assign` (síndico)
  body `{ userId }`
  - audit: `TICKET_ASSIGNED`

- `POST /tickets/:id/status`
  body `{ status }`
  Regras:
  - síndico pode tudo
  - manutenção só se `assigned_to_user_id == actor.userId` (use `assertAssigned`)
  Obrigatório:
  - inserir `ticket_status_history` (from/to)
  - audit: `TICKET_STATUS_CHANGED`

- `POST /tickets/:id/reopen`
  body `{ reason? }`
  - statusHistory
  - audit: `TICKET_REOPENED`

---

# C) Entregas/Encomendas

Permissões:
- `deliveries:manage`
- `deliveries:read:any`
- `deliveries:read:unit`
- `deliveries:deliver`

- `POST /deliveries` (chegada)
  body `{ unitId, recipientName?, attachmentIdEvidence?: string }`
  - cria delivery status=CHEGOU
  - cria `delivery_events` (CREATED)
  - audit: `DELIVERY_CREATED`

- `GET /deliveries` (síndico, paginado + filtros)
- `GET /deliveries/:id`
  - síndico: qualquer
  - morador: somente da sua unit (assertSameUnit)

- `GET /deliveries/queue` (entregador)
  - retorna atribuídas ao entregador em CHEGOU/EM_DISTRIBUICAO (regra simples MVP)

- `POST /deliveries/:id/assign` (síndico)
  body `{ userId }`
  - evento ASSIGNED
  - audit: `DELIVERY_ASSIGNED`

## Turnos
- `POST /turns/start`
  - cria `delivery_turns`
  - audit: `DELIVERY_TURN_STARTED`
- `POST /turns/end`
  - encerra turno aberto
  - audit: `DELIVERY_TURN_ENDED`

## Finalização (QR forte)
- `POST /deliveries/:id/complete`
  body `{ qrToken, evidenceAttachmentId, deliveredToName?, deliveredToUserId? }`

Regra CRÍTICA:
1) chamar `QrService.verify(ctx, { token: qrToken })`
2) se inválido → negar + audit `DELIVERY_QR_INVALID` + evento `QR_INVALID`
3) se `verify.unitId != delivery.unit_id` → negar + audit `DELIVERY_QR_MISMATCH` + evento `QR_MISMATCH`
4) se ok → status ENTREGUE + recebedor + evidência + evento `DELIVERED` + audit `DELIVERY_DELIVERED`

- `POST /deliveries/:id/fail`
  body `{ reason, evidenceAttachmentId? }`
  - status NAO_ENTREGUE
  - evento `FAILED`
  - audit `DELIVERY_FAILED`

---

# D) Dashboard summary
- `GET /dashboard/summary` (síndico)
Retornar:
- tickets abertos/atrasados
- entregas pendentes/em distribuição
- acks pendentes do mural (requireAck)
- logs recentes (opcional)

---

## 6) Onde plugar suas rotas
No `src/routes/v1/tenant.ts`, montar:
- `/announcements`
- `/channels`
- `/unit/inbox`
- `/tickets`
- `/deliveries`
- `/turns`
- `/dashboard`

---

## 7) Arquivos que você pode/deve tocar (para evitar conflito)
Você é dono de:
- `src/modules/communication/*`
- `src/modules/tickets/*`
- `src/modules/deliveries/*`
- `src/modules/dashboard/*`
- e do “plugar rotas” em `src/routes/v1/tenant.ts`

Evite mexer em:
- IAM/admin/structure/users/invites/uploads/qr/logs (Dev 1)
- `src/core/contract/*` (só com alinhamento)

---

## 8) Milestones sugeridos (PRs)
1) Comunicação completa
2) Tickets completo (SLA + statusHistory + audit)
3) Entregas completo (turnos + fila + QR forte + events)
4) Dashboard summary

---

## 9) DoD Dev 2 (final)
- Comunicação completa com moderação + inbox por unit
- Tickets completo com SLA + statusHistory
- Entregas completo com turnos + fila + QR forte + events + evidência
- Dashboard summary funcionando
- Multi-instância por `ctx.instanceId`
- Morador sem vazamento (escopo unit)
- Audit em toda ação crítica
