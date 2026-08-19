# CondoHub Backend — Passo 0 (Bootstrap)

Backend multi-instância para plataforma de condomínios.
Este passo configura a base do projeto: contrato congelado, mock modes, middlewares, interfaces de serviço (stubs) e rotas placeholder.

## Instalação

```bash
cd dev/backend
npm install
```

## Execução

```bash
# Desenvolvimento (hot reload)
npm run dev

# Build de produção
npm run build

# Rodar build
npm start
```

## Variáveis de ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

| Variável | Valores | Default | Descrição |
|---|---|---|---|
| `AUTH_MODE` | `mock` / `jwt` | `mock` | Mock: headers X-Dev-*. JWT: Authorization Bearer |
| `TENANT_MODE` | `mock` / `path` | `mock` | Mock: header X-Dev-InstanceId. Path: `:instanceKey` na URL |
| `UPLOAD_MODE` | `local` / `supabase` | `local` | Local: salva em `var/uploads/`. Supabase: bucket privado com signed upload URLs |
| `AUDIT_MODE` | `console` / `db` | `console` | Console: log no stdout. DB: stub (TODO) |
| `PORT` | número | `3000` | Porta do servidor |
| `CORS_ORIGIN` | `*` ou CSV de origins | `*` | Origins permitidas |
| `JWT_ACCESS_SECRET` | string | `dev_secret` | Secret para verificar JWT (só se AUTH_MODE=jwt) |
| `RATE_LIMIT_ENABLED` | `true` / `false` | `true` | Ativa rate limit nas rotas de auth |
| `SUSPENDED_INSTANCE_KEYS` | CSV | `` | Instance keys bloqueadas (403 INST_SUSPENDED) |
| `SUPABASE_URL` | URL | `` | URL do projeto Supabase (obrigatório se `UPLOAD_MODE=supabase`) |
| `SUPABASE_SERVICE_ROLE_KEY` | string | `` | Service role key (obrigatório se `UPLOAD_MODE=supabase`) |
| `SUPABASE_STORAGE_BUCKET` | string | `attachments` | Nome do bucket no Supabase Storage |
| `SUPABASE_STORAGE_SIGNED_UPLOAD_TTL_SEC` | número | `7200` | TTL informativo da signed URL (~2h, controlado pelo Supabase) |

## Supabase Storage (UPLOAD_MODE=supabase)

### 1. Criar o bucket `attachments`

No painel do Supabase: **Storage → New bucket**
- Nome: `attachments`
- **Public bucket: OFF** (manter privado — acesso via signed URLs)

Ou via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false);
```

Permissão mínima para o service_role fazer upload (normalmente já é o default):
```sql
-- service_role tem bypass de RLS, nenhuma policy adicional necessária
```

### 2. Adicionar as vars ao `.env`

```env
UPLOAD_MODE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
SUPABASE_STORAGE_BUCKET=attachments
```

### 3. Fluxo de upload (client → Supabase Storage diretamente)

```
App  →  POST /uploads/presign  →  Backend  →  createSignedUploadUrl  →  Supabase
App  ←  { signedUrl, token, path, bucket, attachmentId }  ←  Backend

App  →  uploadToSignedUrl(path, token, fileBuffer)  →  Supabase Storage (direto)

App  →  POST /uploads/complete  →  Backend  →  verifica objeto  →  Supabase
App  ←  { ok: true, bucket, path }  ←  Backend
```

### 4. Testar localmente (script)

**Pré-requisito:** o servidor deve estar rodando com `UPLOAD_MODE=supabase`. Se estiver rodando com `UPLOAD_MODE=local`, o `/presign` não retorna `token/bucket/path` e o script falhará.

```bash
# Terminal 1 — configure .env com UPLOAD_MODE=supabase e credenciais Supabase,
# depois (re)inicie o servidor:
UPLOAD_MODE=supabase npm run dev
# ou edite .env e rode: npm run dev

# Terminal 2 — com o servidor no ar, rode o script:
npx tsx scripts/test_signed_upload.ts
```

O script:
1. Lê as credenciais do `.env` automaticamente
2. Chama `/uploads/presign` com mock headers
3. Usa `supabase-js` → `uploadToSignedUrl` para enviar um PNG 1×1 px diretamente ao Supabase Storage
4. Chama `/uploads/complete` para confirmar a existência do arquivo no bucket

### Exemplo de curl — presign (UPLOAD_MODE=supabase)

```bash
curl -X POST http://localhost:3000/api/v1/test/uploads/presign \
  -H "Content-Type: application/json" \
  -H "X-Dev-InstanceId: inst_001" \
  -H "X-Dev-UserId: user_01" \
  -H "X-Dev-Roles: MORADOR" \
  -d '{"filename":"foto.jpg","contentType":"image/jpeg","size":102400}'
```

Resposta:
```json
{
  "attachmentId": "uuid-gerado",
  "bucket": "attachments",
  "path": "inst_001/uuid-gerado_foto.jpg",
  "uploadUrl": "https://<project>.supabase.co/storage/v1/object/upload/sign/attachments/...",
  "signedUrl": "https://<project>.supabase.co/storage/v1/object/upload/sign/attachments/...",
  "token": "signed-token"
}
```

### Exemplo de curl — complete

```bash
curl -X POST http://localhost:3000/api/v1/test/uploads/complete \
  -H "Content-Type: application/json" \
  -H "X-Dev-InstanceId: inst_001" \
  -H "X-Dev-UserId: user_01" \
  -H "X-Dev-Roles: MORADOR" \
  -d '{"attachmentId":"uuid-gerado","bucket":"attachments","path":"inst_001/uuid-gerado_foto.jpg"}'
```

Resposta:
```json
{ "ok": true, "bucket": "attachments", "path": "inst_001/uuid-gerado_foto.jpg" }
```

## Mock mode (desenvolvimento)

Com `AUTH_MODE=mock` e `TENANT_MODE=mock`, você controla o contexto via headers:

| Header | Obrigatório | Descrição |
|---|---|---|
| `X-Dev-InstanceId` | Sim (rotas tenant) | ID da instância |
| `X-Dev-UserId` | Sim (para ter actor) | ID do usuário |
| `X-Dev-Roles` | Sim (para ter actor) | Roles CSV (ex: `SINDICO_ADMIN,MORADOR`) |
| `X-Dev-UnitId` | Não | ID da unidade |

## Exemplos curl

### Health check

```bash
curl http://localhost:3000/health
# {"ok":true}

curl http://localhost:3000/ready
# {"ok":true}
```

### Ver contexto (debug)

```bash
curl http://localhost:3000/api/v1/test/_debug/ctx \
  -H "X-Dev-InstanceId: inst_001" \
  -H "X-Dev-UserId: user_42" \
  -H "X-Dev-Roles: SINDICO_ADMIN,MORADOR" \
  -H "X-Dev-UnitId: APT301"
```

Resposta:
```json
{
  "instanceId": "inst_001",
  "actor": {
    "userId": "user_42",
    "roles": ["SINDICO_ADMIN", "MORADOR"],
    "unitId": "APT301"
  },
  "requestMeta": {
    "ip": "::ffff:127.0.0.1",
    "userAgent": "curl/7.88.1",
    "requestId": "uuid-gerado"
  }
}
```

### Gerar assinatura QR

```bash
curl -X POST http://localhost:3000/api/v1/test/qr/signature \
  -H "Content-Type: application/json" \
  -H "X-Dev-InstanceId: inst_001" \
  -H "X-Dev-UserId: user_01" \
  -H "X-Dev-Roles: MORADOR" \
  -H "X-Dev-UnitId: UNIT123"
```

Resposta:
```json
{
  "token": "dev:UNIT123",
  "expiresAt": "2026-02-23T20:00:00.000Z"
}
```

### Verificar QR (com audit log)

```bash
curl -X POST http://localhost:3000/api/v1/test/qr/verify \
  -H "Content-Type: application/json" \
  -H "X-Dev-InstanceId: inst_001" \
  -H "X-Dev-UserId: user_01" \
  -H "X-Dev-Roles: FUNC_ENTREGAS" \
  -d '{"token":"dev:UNIT123"}'
```

Resposta:
```json
{
  "ok": true,
  "unitId": "UNIT123",
  "reason": "dev_mode_verified"
}
```

No console do servidor aparece:
```
[AUDIT] {"timestamp":"...","instanceId":"inst_001","actorId":"user_01","action":"ACCESS_QR_VERIFIED","targetType":"qr_access","targetId":"dev:UNIT123","unitId":"UNIT123","metadata":{"reason":"dev_mode_verified"}}
```

### Upload presign

```bash
curl -X POST http://localhost:3000/api/v1/test/uploads/presign \
  -H "Content-Type: application/json" \
  -H "X-Dev-InstanceId: inst_001" \
  -H "X-Dev-UserId: user_01" \
  -H "X-Dev-Roles: MORADOR" \
  -d '{"filename":"foto.jpg","contentType":"image/jpeg","size":1024}'
```

### Testar erro padrão (rota não implementada)

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh
# {"error":true,"code":"NOT_IMPLEMENTED","message":"This endpoint is not yet implemented","details":{}}
```

### Testar validação Zod

```bash
curl -X POST http://localhost:3000/api/v1/test/uploads/presign \
  -H "Content-Type: application/json" \
  -H "X-Dev-InstanceId: inst_001" \
  -H "X-Dev-UserId: user_01" \
  -H "X-Dev-Roles: MORADOR" \
  -d '{"filename":""}'
# {"error":true,"code":"VALIDATION_ERROR","message":"Validation failed","details":{"issues":[...]}}
```

## Estrutura de pastas

```
src/
  app.ts                          # Pipeline Express
  server.ts                       # Boot
  config/
    env.ts                        # Env parsing com Zod
  core/
    contract/
      CONTRACT_FROZEN.md          # Contrato congelado (NÃO ALTERAR)
      roles.ts                    # Roles fixas
      enums.ts                    # Enums de tickets e deliveries
      permissions.ts              # Permission strings
      requestContext.ts           # Type RequestContext
      errors.ts                   # AppError + error shape padrão
      pagination.ts               # parsePagination + respondPaginated
    services/
      audit/                      # AuditService (console / db stub)
      uploads/                    # UploadService (local / supabase real)
      qr/                         # QrService (stub dev)
      notifications/              # NotificationService (stub)
  middleware/
    requestId.ts                  # X-Request-Id ou uuid
    contextBuilder.ts             # Monta RequestContext (mock ou jwt/path)
    errorHandler.ts               # Catch-all para error shape padrão
    cors.ts                       # CORS por CORS_ORIGIN env
    rateLimit.ts                  # Rate limit para rotas de auth
  routes/
    health.ts                     # /health e /ready
    v1/
      index.ts                    # Router principal /api/v1
      admin.ts                    # /api/v1/admin/*
      tenant.ts                   # /api/v1/:instanceKey/*
      stubs.ts                    # Handler 501 genérico
  types/
    express.d.ts                  # Extensão do Express Request (ctx, id)
```

## Roles disponíveis

`ADMIN_GLOBAL` | `SINDICO_ADMIN` | `FUNC_ENTREGAS` | `FUNC_MANUTENCAO` | `MORADOR`

## Próximos passos

Este é o Passo 0 (bootstrap). Os módulos de domínio (tickets, deliveries, channels, etc.) serão plugados nas próximas etapas.
