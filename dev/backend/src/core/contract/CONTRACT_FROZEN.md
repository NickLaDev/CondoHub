# CONTRATO CONGELADO — CondoHub Backend

> **NÃO ALTERAR SEM ALINHAMENTO entre todos os devs e o líder técnico.**
> Qualquer mudança aqui exige PR específico com justificativa.

---

## 1. Rotas base

- Instância (tenant): `/api/v1/:instanceKey/...`
- Admin global: `/api/v1/admin/...`
- Refresh (único): `/api/v1/auth/refresh`

## 2. Auth (Access + Refresh)

- Access JWT expira em **5 minutos**
- Refresh ~**30 dias**, rotacionável
- Sessões no DB guardam hash do refresh + revoke/logout

## 3. Claims do Access JWT (fixas)

```json
{
  "sub": "userId",
  "iid": "instanceId|null (admin global)",
  "uid": "unitId|null",
  "roles": ["SINDICO_ADMIN"],
  "tv": 1,
  "iat": 0,
  "exp": 0
}
```

## 4. Roles (fixo)

- `ADMIN_GLOBAL`
- `SINDICO_ADMIN`
- `FUNC_ENTREGAS`
- `FUNC_MANUTENCAO`
- `MORADOR`

## 5. Enums (fixo)

**Tickets:** `ABERTO` | `EM_ANALISE` | `EM_EXECUCAO` | `RESOLVIDO` | `FECHADO` | `REABERTO`

**Encomendas:** `CHEGOU` | `EM_DISTRIBUICAO` | `ENTREGUE` | `NAO_ENTREGUE`

## 6. Erro padrão (fixo)

```json
{
  "error": true,
  "code": "SOME_CODE",
  "message": "Human message",
  "details": {}
}
```

## 7. Paginação padrão (fixo)

**Request:** `page`, `limit`, `sort`, `order` (+ filtros via querystring)

**Response:**
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

## 8. RequestContext (interface fixa)

```typescript
type RequestContext = {
  instanceId: string;
  actor?: {
    userId: string;
    roles: string[];
    unitId?: string;
  };
  requestMeta?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
  };
};
```

## 9. Permission strings (fixas) — base mínima

```
structure:manage
users:manage
invites:manage
communication:manage
tickets:create
tickets:read:any
tickets:read:unit
tickets:update
deliveries:manage
deliveries:deliver
deliveries:read:any
deliveries:read:unit
logs:read
admin:manage
```
