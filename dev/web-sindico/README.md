# CondoHub — Painel do Síndico (Tenant Admin)

Painel administrativo por instância (condomínio): estrutura física, moradores, comunicação,
chamados, entregas, portaria e convites. React 19 + Vite + TypeScript + React Query + Zustand.

> Setup rápido do monorepo inteiro: veja o [README raiz](../../README.md#início-rápido-2-comandos).

## Instalação e execução

```bash
cd dev/web-sindico
npm install
npm run dev               # http://localhost:5173
```

Por padrão sobe em **FULL MOCK** (`VITE_ENABLE_FULL_MOCK=true`), funcionando **sem** backend nem
banco — ótimo pra mexer só na UI. Para bater na API local real:

```bash
cp .env.example .env.local
# no .env.local: VITE_ENABLE_FULL_MOCK=false
```

Requer dados no banco — veja [seed local](../../README.md#seed--dados-de-demonstração). Login em
`/:instanceKey/login` (instance de demo: `demo`), com o Síndico Demo (`sindico@demo.com` /
`sindico123`).

## Scripts

| Comando         | O que faz                                |
| --------------- | ------------------------------------------ |
| `npm run dev`    | servidor de desenvolvimento (Vite)          |
| `npm run build`  | typecheck (`tsc -b`) + build de produção    |
| `npm run preview`| serve o build de produção localmente        |
| `npm run lint`   | ESLint                                      |

## Módulos / rotas (`/:instanceKey/...`)

| Rota                    | Módulo                                    |
| ------------------------ | ------------------------------------------- |
| `dashboard`               | Indicadores da instância                   |
| `condo/profile`           | Perfil do condomínio                       |
| `structure/blocks`        | Blocos                                     |
| `structure/units`         | Unidades                                   |
| `users/residents`         | Moradores                                  |
| `users/staff`             | Funcionários (portaria, manutenção)        |
| `invites`                  | Convites (link e código/QR)                |
| `announcements`            | Comunicados / mural                        |
| `channels`                 | Canais e posts                             |
| `inbox`                    | Inbox morador ↔ síndico                    |
| `tickets`                  | Chamados de manutenção/ocorrências          |
| `deliveries`               | Entregas                                   |
| `turns`                    | Turnos de portaria                         |
| `logs`                     | Logs de auditoria da instância              |

## Variáveis de ambiente

| Variável                      | Default                  | Descrição                                    |
| ------------------------------ | ------------------------- | ----------------------------------------------- |
| `VITE_API_BASE_URL`             | `http://localhost:3000`   | Base URL da API (`dev/backend`)                |
| `VITE_APP_MODE`                 | `real`                    | `real` usa a API; `mock` usa dados falsos embutidos |
| `VITE_ENABLE_FULL_MOCK`         | `false`                   | Roda o painel inteiro sem backend/banco         |
| `VITE_ENABLE_DEV_MOCKS`         | `false`                   | Toggle legado (dev)                             |
| `VITE_ENABLE_DEV_AUTH_BYPASS`   | `false`                   | Toggle legado (dev)                             |

Ver [`.env.example`](.env.example).

## Estrutura

```
src/
  app/
    tenant/            # TenantContextProvider — resolve instanceKey, sessão
    queryClient.ts       # React Query
    providers/            # Composição de providers
  routes/
    AppRoutes.tsx         # Árvore de rotas por :instanceKey
    guards/                 # RequireTenantAuth, bootstrap de tenant
  modules/                 # Um diretório por domínio (api, hooks, componentes, páginas)
    dashboard/ condo/ structure/ users/ invites/
    announcements/ channels/ inbox/ tickets/ deliveries/ turns/ logs/
  components/               # UI compartilhada
  services/                   # Client HTTP
  store/                       # Zustand
  mocks/                        # Dados de FULL MOCK
```
