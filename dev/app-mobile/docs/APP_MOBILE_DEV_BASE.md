# CondoHub Mobile - Base Técnica (DEV 2)

## Objetivo deste documento
Este guia resume como a base do app está organizada e como continuar a implementação sem alterar a arquitetura principal.

## Estrutura principal
- `lib/main.dart`: bootstrap com `ProviderScope`.
- `lib/app/app.dart`: configuração do `MaterialApp.router`.
- `lib/app/router.dart`: definição de rotas (`go_router`) e redirecionamento por autenticação.
- `lib/app/routes.dart`: catálogo central de rotas (inclui helpers para rotas com `:id`).
- `lib/app/shell/`: shell de navegação (`AppShell`) e `BottomNav` com 5 tabs.
- `lib/core/theme/`: tema, cores e tipografia compartilhados.
- `lib/core/ui/`: componentes compartilhados (incluindo `CHScaffold` e `CHTopBand`).
- `lib/core/models/`: modelos de domínio mockados.
- `lib/core/repositories/`: contratos dos repositórios.
- `lib/core/mock/`: implementações mock (sem backend).
- `lib/core/providers/providers.dart`: providers Riverpod e estado global (incluindo auth e acesso aos repositórios mock).
- `lib/features/`: telas por domínio (`auth`, `home`, `mural`, `tickets`, `communication`, `services`, `packages`, `support`).

## O que já está pronto
- Login e Invite com fluxo básico de autenticação mock.
- Home com quick access tiles e lista de avisos.
- Navegação principal com bottom nav (5 tabs) e shell.
- Componentes base reutilizáveis: `CHScaffold` e `CHTopBand`.
- Persistência dos mocks já implementada (estado em instâncias singleton nos providers).
- Rotas de detalhe e páginas placeholder para continuidade do desenvolvimento.

## Rotas de detalhe disponíveis
- `/app/mural/:id`
- `/app/tickets/:id`
- `/app/channels/:id`
- `/app/packages/:id`
- `/app/support/:id`

## Como o DEV 2 deve continuar
- Implementar telas reais a partir das rotas placeholder já existentes.
- Consumir dados via providers e repositórios de `lib/core/providers/providers.dart`.
- Manter `lib/app/router.dart` e `lib/app/routes.dart` como ponto único de navegação.
- Reutilizar componentes de `lib/core/ui/` antes de criar novos widgets base.
- Evitar refatorações arquiteturais amplas sem necessidade (priorizar incrementos por feature).

## Execução rápida
```bash
flutter pub get
flutter run
flutter analyze
flutter test
```
