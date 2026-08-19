# Announcements / Mural

Esta feature implementa o Mural mobile com:

- lista de comunicados
- detalhe de comunicado
- ACK de leitura com atualizacao otimista
- retry para falhas de rede
- suporte basico a corpo em HTML simples

## Endpoints usados

O app chama os caminhos relativos abaixo:

- `GET /announcements`
- `GET /announcements/{id}`
- `POST /announcements/{id}/ack`

No mobile, as chamadas passam por `TenantApiContext`, entao a URL efetiva segue o padrao tenant do projeto:

- `/api/v1/:instanceKey/announcements`
- `/api/v1/:instanceKey/announcements/{id}`
- `/api/v1/:instanceKey/announcements/{id}/ack`

O token autenticado do app e enviado automaticamente via header:

- `Authorization: Bearer <token>`

## Estrutura

- `lib/core/api/announcements_api.dart`: wrapper HTTP tenant-aware
- `lib/core/repositories/announcements_repository.dart`: repositorio remoto com cache e deduplicacao de ACK
- `lib/features/announcements/announcements_providers.dart`: providers e controller Riverpod
- `lib/features/announcements/announcements_page.dart`: lista principal
- `lib/features/announcements/announcement_detail_page.dart`: detalhe + ACK automatico

## Observacoes do contrato

- A lista aceita tanto resposta em array puro quanto paginada em `{ "items": [...] }`.
- O corpo pode vir como texto simples ou HTML simples; a renderizacao mobile normaliza tags basicas para texto legivel.
- Se o backend nao devolver `attachments`, a UI simplesmente oculta a secao de anexos.

## Como testar

Na raiz de `dev/app-mobile`:

```bash
flutter test test/announcements_api_test.dart
flutter test test/announcements_pages_test.dart
flutter test
```
