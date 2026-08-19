# Contribuindo com o CondoHub

Obrigado pelo interesse em contribuir! Este é um monorepo com backend Node/TypeScript,
dois frontends React (web e web-sindico) e um app Flutter (app-mobile).

## Antes de começar

1. Leia o [README](README.md) para subir o ambiente local (backend + Postgres em Docker + frontends).
2. Dê uma olhada em [docs/architecture](docs/architecture) para entender o modelo de dados,
   e em [docs/specs](docs/specs) para o escopo detalhado de cada módulo.
3. Abra uma issue antes de começar mudanças grandes, para alinhar escopo e evitar retrabalho.

## Fluxo de contribuição

1. Fork do repositório e branch a partir de `main`: `git checkout -b feat/minha-mudanca`.
2. Commits pequenos e no padrão `tipo(escopo): assunto` (ex.: `feat(app-mobile): tela de mural`,
   `fix(backend): corrige validação de convite`).
3. Rode lint/testes do projeto que você tocou antes de abrir o PR:
   - `backend`, `web`, `web-sindico`: `npm run lint` (e `npm test` quando houver testes no diretório)
   - `app-mobile`: `flutter analyze`
4. Abra o Pull Request descrevendo o que mudou e por quê. Referencie a issue relacionada, se houver.

## Padrões de código

- Siga o estilo já usado no arquivo/módulo que você está editando.
- Nomes claros, funções pequenas, sem duplicação — reaproveite código existente antes de criar novo.
- Nunca commitar `.env`, chaves, tokens ou credenciais reais. Use `.env.example` como referência
  e mantenha seus próprios `.env`/`.env.local` fora do git (já estão no `.gitignore`).

## Dúvidas

Abra uma [issue](../../issues) ou comente no PR — respondemos por lá.
