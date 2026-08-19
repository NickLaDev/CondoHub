# CondoHub Mobile

App do morador e da portaria. Flutter, `go_router` + `flutter_riverpod`.

> Setup rápido do monorepo inteiro: veja o [README raiz](../../README.md#início-rápido-2-comandos).

## Instalação e execução

```bash
cd dev/app-mobile
flutter pub get
# Suba a API local antes: ./scripts/db-local.sh (na raiz) + backend rodando (npm run dev)
flutter run --dart-define=CONDOHUB_API_BASE_URL=http://localhost:3000/api/v1
```

Precisa de um emulador Android, simulador iOS ou dispositivo conectado (`flutter devices`).
Sem `--dart-define`, o app usa o default de `lib/core/config/app_config.dart`:
`10.0.2.2:3000` no Android emulator, `localhost:3000` no iOS/desktop.

> O Flutter **não lê arquivos `.env`**. `.env.local`/`.env.online` neste diretório são só
> referência de valores — a URL real é sempre injetada via `--dart-define`.

## Rodando a versão web (Flutter Web)

```bash
flutter build web --dart-define=CONDOHUB_API_BASE_URL=http://localhost:3000/api/v1
```

A build web roda numa moldura de celular (`web/app.html`) — ver `web/index.html` +
`web/app.html` no source, que sobrevivem a todo `flutter build web`.

## Login de demonstração

Instance `demo` — ver [seed local](../../README.md#seed--dados-de-demonstração). Ex.: Morador
Demo (`morador@demo.com` / `morador123`) ou Porteiro Demo (`porteiro@demo.com` / `porteiro123`).

## Funcionalidades

| Área            | Conteúdo                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `home`             | Início — resumo de urgentes, encomendas e chamados                  |
| `announcements`     | Mural de comunicados, com confirmação de leitura                    |
| `communication`     | Canais (posts/comentários) e inbox morador ↔ síndico                |
| `tickets`           | Abertura e acompanhamento de chamados                                |
| `packages`          | Encomendas/entregas da unidade                                       |
| `services`          | Visitantes, acessos, QR, câmeras, documentos, entregas               |
| `support`           | Suporte                                                              |
| `settings`          | Configurações da conta                                               |
| `auth`              | Login, seleção de instância                                          |

> `visitors`, `documentos`, `acessos liberados` e `câmeras` são **locais ao device**
> (`shared_preferences`), não populados via API — sempre começam vazios.

## Estrutura

```
lib/
  app/
    shell/            # Shell de navegação (bottom nav / go_router)
  core/
    api/                # Cliente HTTP
    config/               # AppConfig (base URL via --dart-define)
    models/                 # Modelos de domínio
    network/                  # Interceptors, tratamento de erro
    providers/                  # Providers Riverpod
    repositories/                 # Repositories tenant-scoped (ver ../../docs/specs/mobile_tenant_repositories.md)
    storage/                       # shared_preferences (dados locais do device)
    theme/                          # Tema visual
    ui/                              # Componentes de UI compartilhados
    util/                             # Helpers
  features/                          # Um diretório por área (ver tabela acima)
```

## Testes

```bash
flutter analyze
flutter test
```
