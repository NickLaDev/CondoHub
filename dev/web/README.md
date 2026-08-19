# CondoHub — Admin Global (Super Admin Console)

Painel de governança da plataforma: gestão de instâncias (condomínios), planos e suporte.
React 19 + Vite + TypeScript + Tailwind.

> Setup rápido do monorepo inteiro: veja o [README raiz](../../README.md#início-rápido-2-comandos).

## Instalação e execução

```bash
cd dev/web
npm install
cp .env.example .env.local   # aponta VITE_API_BASE_URL pro backend local
npm run dev                   # http://localhost:5173
```

Login em `/admin/login` com o Super Admin do [seed local](../../README.md#seed--dados-de-demonstração)
(`admin@condohub.com` / `admin123`).

## Scripts

| Comando         | O que faz                          |
| --------------- | ----------------------------------- |
| `npm run dev`    | servidor de desenvolvimento (Vite)  |
| `npm run build`  | typecheck (`tsc -b`) + build de produção |
| `npm run preview`| serve o build de produção localmente |
| `npm run lint`   | ESLint                              |

## Páginas

| Rota                        | Conteúdo                                  |
| ---------------------------- | ------------------------------------------ |
| `/admin/login`                | Login do Super Admin                       |
| `/admin/dashboard`            | Indicadores gerais da plataforma           |
| `/admin/instances`            | Lista e detalhe de instâncias (condomínios) — suspender/reativar |
| `/admin/plans`                | Planos disponíveis (criar, editar, arquivar) |
| `/admin/support`              | Ferramentas de suporte (reset de síndico)  |
| `/admin/logs`                 | Logs de auditoria da plataforma            |

## Estrutura

```
src/
  pages/            # Uma pasta por rota (login, dashboard, instances, plans, support, logs)
  components/
    layout/          # Shell/layout autenticado
    ui/               # Componentes de UI reutilizáveis
  services/
    api/              # Client HTTP (axios/fetch), config, tipos, paginação
    auth.ts            # Login/sessão do Super Admin
    adminStats.ts       # Indicadores do dashboard
```

## Variáveis de ambiente

| Variável              | Default                  | Descrição                    |
| ---------------------- | ------------------------- | ------------------------------ |
| `VITE_API_BASE_URL`     | `http://localhost:3000`   | Base URL da API (`dev/backend`) |

Ver [`.env.example`](.env.example).
