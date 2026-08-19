# Padrão de Repositories Tenant-Scoped no Mobile

## Objetivo

Todo repository remoto de domínio no app mobile deve usar `TenantApiContext` para acessar endpoints tenant-scoped do backend. Esse padrão centraliza sessão, `instanceKey`, bearer token, montagem de path e delegação para o `ApiClient`.

O objetivo é evitar que cada módulo reinvente autenticação, refresh, headers ou paths tenant-scoped.

## Regra Principal

- Nunca pedir `instanceKey` manualmente ao usuário.
- Nunca passar `instanceKey` manual como parâmetro do repository.
- Sempre usar a sessão atual, incluindo `AuthSession.instanceKey`/`AuthState.instanceKey`, via `TenantApiContext`.
- Sempre usar `ApiClient` indiretamente via `TenantApiContext`.
- Não usar HTTP direto fora do `ApiClient`.
- Não duplicar lógica de refresh.

## Como Funciona o TenantApiContext

`TenantApiContext`:

- lê o `AuthState` no momento da chamada;
- valida se há sessão autenticada;
- valida se há `accessToken`;
- valida se há `instanceKey`;
- monta paths no formato `/{instanceKey}/recurso`;
- remove barras duplicadas no path recebido;
- delega chamadas HTTP para o `ApiClient`;
- mantém o auto-refresh global em 401 como responsabilidade do `ApiClient`.

Exemplo: uma chamada para `_tenantApi.get('/tickets')` com `instanceKey = demo` usa o path `/demo/tickets`. O `ApiClient` resolve esse path contra a base URL configurada, que já contém `/api/v1`.

## Exemplo de Repository Remoto com GET

```dart
class RemoteAnnouncementsRepository implements AnnouncementsRepository {
  RemoteAnnouncementsRepository(this._tenantApi);

  final TenantApiContext _tenantApi;

  Future<List<Announcement>> list() async {
    final json = await _tenantApi.get('/announcements');
    // Mapear json para model.
  }
}
```

## Exemplo de POST

```dart
Future<void> createTicket(CreateTicketInput input) async {
  await _tenantApi.post(
    '/tickets',
    body: input.toJson(),
  );
}
```

## Exemplo de PATCH/PUT

```dart
await _tenantApi.patch(
  '/tickets/$ticketId/status',
  body: {'status': 'IN_PROGRESS'},
);
```

Use `put` apenas quando o contrato do endpoint exigir substituição completa do recurso. Para atualização parcial, prefira `patch`.

## Provider de Repository Remoto

O provider do repository remoto deve receber `tenantApiContextProvider`.

```dart
final announcementsRepositoryProvider = Provider<AnnouncementsRepository>((ref) {
  return RemoteAnnouncementsRepository(
    ref.watch(tenantApiContextProvider),
  );
});
```

A troca de provider deve acontecer apenas na branch do módulo em integração. Não troque todos os providers de domínio de uma vez.

## Tratamento de Erros

`TenantApiContext` lança erros locais usando `ApiException` antes de chamar a rede:

- `AUTH_SESSION_REQUIRED`: não há sessão autenticada.
- `AUTH_ACCESS_TOKEN_REQUIRED`: a sessão não possui `accessToken` válido.
- `AUTH_INSTANCE_REQUIRED`: a sessão não possui `instanceKey` válido.

Erros vindos do `ApiClient` e do backend devem ser preservados:

- `401`: token ausente, inválido ou expirado; pode disparar auto-refresh quando o request tinha bearer token.
- `403`: usuário autenticado, mas sem permissão para o recurso.
- `NETWORK_ERROR`: falha de conexão.
- `VALIDATION_ERROR`: erro de validação de payload retornado pela API.
- outros erros de API devem manter `statusCode`, `code`, `message`, `error` e `body` do `ApiException`.

Não envolva chamadas remotas em `try/catch` genérico que engole `ApiException`. A tela pode transformar erros conhecidos em mensagens amigáveis, mas o repository deve preservar o erro técnico.

## Auto-Refresh

O repository não deve chamar refresh manualmente.

O fluxo é responsabilidade do `ApiClient`:

- um request autenticado que retorna `401` tenta refresh;
- endpoints `/auth/login`, `/auth/select-instance` e `/auth/refresh` são excluídos do auto-refresh;
- o retry acontece uma vez;
- refresh inválido limpa a sessão;
- erro de rede durante o refresh não limpa a sessão imediatamente.

Para manter esse comportamento, todo repository tenant-scoped deve chamar `TenantApiContext`, que passa o `accessToken` atual para o `ApiClient`.

## O que NÃO Fazer

- Não hardcodar `instanceKey`.
- Não usar `instanceKey` digitado.
- Não criar novo client HTTP direto.
- Não passar `accessToken` manual vindo de fora da sessão.
- Não duplicar lógica de refresh.
- Não duplicar `try/catch` genérico que engole `ApiException`.
- Não trocar provider para remoto sem testes.
- Não integrar módulo sem validar endpoints no Postman quando aplicável.
- Não incluir `/api/v1` no path do repository; a base URL do `ApiClient` já contém esse prefixo.

## Checklist para PR de Integração de Módulo

- Repository remoto usa `TenantApiContext`.
- Provider aponta para repository remoto somente na branch do módulo.
- Paths não incluem `/api/v1` manualmente se o `ApiClient` já possui base URL.
- Paths começam pelo recurso, por exemplo `/tickets`.
- Nenhum `instanceKey` manual foi adicionado.
- Nenhum HTTP direto foi adicionado fora do `ApiClient`.
- Loading e error foram tratados na tela.
- `401` e `403` têm comportamento controlado.
- Testes unitários/widget foram atualizados.
- `flutter analyze` passou.
- `flutter test` passou.
- `.codex/scripts/verify_mobile.sh` passou.
- Endpoint foi validado no Postman quando aplicável.

## Ordem Recomendada para Integrar um Módulo

1. Validar endpoint no Postman.
2. Criar models/dtos.
3. Criar `RemoteRepository`.
4. Adicionar testes do repository.
5. Trocar provider do módulo.
6. Ajustar tela.
7. Testar manualmente.
8. Rodar `flutter analyze`.
9. Rodar `flutter test`.
10. Rodar `.codex/scripts/verify_mobile.sh`.

## Observação sobre Mocks

Os mocks atuais continuam existindo e seguem úteis para desenvolvimento isolado, testes e comparação de comportamento.

Cada branch de módulo deve trocar apenas o provider do seu próprio módulo. Não troque `MockMuralRepository`, `MockTicketsRepository`, `MockChannelsRepository`, `MockInboxRepository`, `MockDeliveriesRepository` e `MockQrRepository` todos de uma vez.

## Observação sobre Home/Dashboard

Dados como `Residencial das Flores` e `Bloco A - Apt 101` são mocks/fallbacks. Eles devem ser removidos na branch de integração da Home/Dashboard, não na base de repositories tenant-scoped.
