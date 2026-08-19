# CondoHub — Documentação de Desenvolvimento Web Admin da Instância (Síndico / Dono da Instância)

## 1. Objetivo

Esta documentação define o escopo, a arquitetura de páginas, os módulos, as regras de navegação e os critérios de entrega do **Painel Web Admin da Instância** do CondoHub.

Este é o painel usado pelo **síndico / dono da instância**, operando dentro de um único condomínio. Ele deve seguir o modelo visual enviado pelo usuário, porém adaptado ao escopo real do backend e da modelagem do banco.

O backend separa claramente o contexto tenant do contexto global. No tenant, tudo opera com `:instanceKey` e reúne fundações do condomínio, gestão de usuários, convites, comunicação, inbox por unidade, tickets, entregas, turnos, dashboard e logs da instância.

---

## 2. Responsabilidade deste dev

Este dev é dono de todo o frontend do contexto **Admin da Instância / Síndico**.

### 2.1 Inclui
- login tenant;
- sessão tenant;
- dashboard do condomínio;
- perfil do condomínio;
- blocos e unidades;
- moradores;
- funcionários;
- convites;
- mural;
- canais;
- atendimento privado por unidade;
- tickets;
- encomendas/entregas;
- turnos de entrega;
- logs da instância;
- integração visual com anexos.

### 2.2 Não inclui
- login global;
- dashboard do SaaS;
- planos;
- instâncias;
- suporte global;
- logs globais.

Esses itens pertencem ao painel Admin Global.

---

## 3. Contexto funcional do painel tenant

Este painel existe para operar **um condomínio por vez**.

Ele deve assumir como base:
- multi-tenant por `instanceKey`;
- autenticação tenant via `/api/v1/:instanceKey/auth/*`;
- refresh único via `/api/v1/auth/refresh`;
- RBAC por role e permission string;
- escopo por unidade quando o usuário for morador;
- escopo operacional para entregador e manutenção quando aplicável.

Perfis relevantes ao contexto:
- `SINDICO_ADMIN`
- `FUNC_ENTREGAS`
- `FUNC_MANUTENCAO`
- `MORADOR`

O foco principal deste painel, porém, é a experiência do **SINDICO_ADMIN**.

---

## 4. Base visual oficial

O mock enviado deve ser usado como base principal do tenant, com pequenos ajustes para cobrir 100% do sistema.

### 4.1 Paleta obrigatória
- Azul principal: `#0F2A56`
- Cinza secundário: `#8A9099`
- Grafite: `#1C1F26`
- Azul accent: `#2F5DFF`
- Branco

### 4.2 Tipografia
- Fonte: **Inter**
- H1: 24px / 700 / azul principal
- H2: 20px / 600
- H3: 18px / 600

### 4.3 Diretriz visual
- sidebar vertical escura;
- topbar clara;
- breadcrumb;
- cards KPI;
- tabelas limpas;
- badges de status;
- modais/drawers para formulários;
- linguagem visual corporativa, limpa e estável.

### 4.4 Uso da logo
A logo CondoHub enviada deve ser usada:
- na tela de login;
- no cabeçalho lateral do painel;
- em splash/loading institucional, se existir.

---

## 5. Estrutura de navegação aprovada

### 5.1 Menu lateral recomendado

**Principal**
- Dashboard

**Condomínio**
- Perfil do Condomínio
- Blocos
- Unidades

**Usuários**
- Moradores
- Funcionários
- Convites

**Comunicação**
- Mural
- Canais
- Atendimento

**Operacional**
- Tickets
- Encomendas
- Turnos

**Sistema**
- Logs

### 5.2 Observação sobre o mock
O mock original já estava muito aderente ao tenant, mas precisava de ajustes:
- incluir **Perfil do Condomínio**;
- separar melhor **moradores** e **funcionários**;
- prever **turnos** como módulo próprio;
- prever **atendimento privado** com regra de 1 thread por unidade;
- prever anexos genéricos em múltiplos módulos.

---

## 6. Perfis e comportamento por papel

## 6.1 SINDICO_ADMIN
Perfil principal do painel.
Pode gerir:
- estrutura;
- usuários;
- convites;
- comunicação;
- tickets;
- entregas;
- dashboard;
- logs.

## 6.2 FUNC_ENTREGAS
Pode ter visão limitada em versões futuras do web tenant para:
- fila de entregas;
- turnos;
- finalização com QR forte.

## 6.3 FUNC_MANUTENCAO
Pode ter visão limitada para:
- tickets atribuídos;
- atualização de status em escopo.

## 6.4 MORADOR
Não é o foco deste painel, mas o frontend precisa respeitar regras de escopo nos módulos compartilhados quando houver reaproveitamento de componentes.

---

## 7. Contratos de autenticação e sessão

### 7.1 Endpoints obrigatórios
- `POST /api/v1/:instanceKey/auth/login`
- `POST /api/v1/:instanceKey/auth/logout`
- `GET /api/v1/:instanceKey/auth/me`
- `POST /api/v1/auth/refresh`

### 7.2 Padrão de resposta esperado

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresInSec": 300,
  "user": {
    "id": "uuid",
    "instanceId": "uuid",
    "unitId": "uuid|null",
    "roles": ["SINDICO_ADMIN"],
    "name": "string",
    "email": "string|null",
    "phone": "string|null"
  }
}
```

### 7.3 Regras de frontend
- `instanceKey` deve estar no contexto da aplicação;
- sessão tenant deve ser separada da sessão global;
- refresh único deve ser centralizado;
- em falha de refresh, redirecionar para login da instância;
- bootstrap inicial com `auth/me`.

---

## 8. Arquitetura de rotas sugerida

- `/:instanceKey/login`
- `/:instanceKey/dashboard`
- `/:instanceKey/condo/profile`
- `/:instanceKey/structure/blocks`
- `/:instanceKey/structure/units`
- `/:instanceKey/users/residents`
- `/:instanceKey/users/staff`
- `/:instanceKey/invites`
- `/:instanceKey/announcements`
- `/:instanceKey/channels`
- `/:instanceKey/inbox`
- `/:instanceKey/tickets`
- `/:instanceKey/tickets/:id`
- `/:instanceKey/deliveries`
- `/:instanceKey/turns`
- `/:instanceKey/logs`
- `/:instanceKey/profile`

---

## 9. Especificação das telas

## 9.1 Login da Instância

### Objetivo
Autenticar usuários da instância usando o `instanceKey` da URL.

### Conteúdo
- logo CondoHub;
- nome da instância, se disponível;
- campo e-mail;
- campo senha;
- botão entrar;
- feedback de erro.

### Regras
- chamar `POST /api/v1/:instanceKey/auth/login`;
- em sucesso, salvar tokens e redirecionar para dashboard;
- carregar `GET /api/v1/:instanceKey/auth/me` no bootstrap;
- logout via `POST /api/v1/:instanceKey/auth/logout`.

---

## 9.2 Dashboard do Condomínio

### Objetivo
Dar visão geral da operação do condomínio.

### Endpoint principal
- `GET /api/v1/:instanceKey/dashboard/summary`

### Conteúdo obrigatório
- card de tickets abertos;
- card de SLA atrasado;
- card de tickets reabertos;
- card de encomendas pendentes;
- tabela de tickets críticos;
- tabela de encomendas em distribuição;
- bloco de logs recentes;
- atalhos para listas completas.

### Observação
A estrutura deve seguir o mock enviado, com ajuste dos dados reais do backend.

---

## 9.3 Perfil do Condomínio

### Endpoint
- `GET /api/v1/:instanceKey/condo/profile`
- `PATCH /api/v1/:instanceKey/condo/profile`

### Objetivo
Administrar os dados institucionais do condomínio.

### Campos
- nome;
- endereço;
- telefone.

### UX esperada
- modo visualização;
- modo edição;
- feedback de sucesso/erro;
- proteção para múltiplos envios.

---

## 9.4 Blocos

### Endpoints
- `GET /api/v1/:instanceKey/structure/blocks`
- `POST /api/v1/:instanceKey/structure/blocks`
- `PATCH /api/v1/:instanceKey/structure/blocks/:id`
- `POST /api/v1/:instanceKey/structure/blocks/:id/archive`

### Recursos da tela
- listagem paginada;
- busca;
- criar bloco;
- editar bloco;
- arquivar bloco.

### Colunas sugeridas
- nome;
- data de criação;
- status;
- ações.

---

## 9.5 Unidades

### Endpoints
- `GET /api/v1/:instanceKey/structure/units`
- `POST /api/v1/:instanceKey/structure/units`
- `PATCH /api/v1/:instanceKey/structure/units/:id`
- `POST /api/v1/:instanceKey/structure/units/:id/archive`

### Recursos da tela
- listagem paginada;
- filtros por bloco;
- busca por número;
- criar unidade;
- editar unidade;
- arquivar unidade.

### Regras de domínio
- unidade pertence a bloco;
- identidade operacional considera bloco + número.

---

## 9.6 Moradores

### Endpoints
- `GET /api/v1/:instanceKey/users/residents`
- `POST /api/v1/:instanceKey/users/residents`
- `PATCH /api/v1/:instanceKey/users/residents/:id`
- `POST /api/v1/:instanceKey/users/residents/:id/disable`

### Objetivo
Gerenciar os moradores do condomínio.

### Recursos
- listagem paginada;
- filtro por bloco;
- filtro por unidade;
- filtro por status;
- busca textual;
- criar morador;
- editar morador;
- desativar morador.

### Regras
- `unitId` obrigatório na criação;
- respeitar status do usuário;
- ações destrutivas com confirmação.

---

## 9.7 Funcionários

### Endpoints
- `GET /api/v1/:instanceKey/users/staff`
- `POST /api/v1/:instanceKey/users/staff`
- `PATCH /api/v1/:instanceKey/users/staff/:id`
- `POST /api/v1/:instanceKey/users/staff/:id/disable`

### Objetivo
Gerenciar funcionários dos papéis operacionais.

### Papéis suportados
- `FUNC_ENTREGAS`
- `FUNC_MANUTENCAO`

### Recursos
- filtro por papel;
- filtro por status;
- criar funcionário;
- editar funcionário;
- desativar funcionário.

---

## 9.8 Convites

### Endpoints
- `POST /api/v1/:instanceKey/invites`
- `GET /api/v1/:instanceKey/invites`
- `POST /api/v1/:instanceKey/invites/:id/revoke`
- `POST /api/v1/:instanceKey/invites/accept` (público)

### Objetivo
Controlar convites de acesso ao condomínio.

### Recursos
- emitir convite;
- listar convites;
- revogar convite;
- acompanhar status de expiração/uso;
- separar convites de morador e administrativos.

### Regras de domínio
- convite para `MORADOR` exige `unitId`;
- convites administrativos não dependem de unidade.

---

## 9.9 Mural

### Endpoints
- `GET /api/v1/:instanceKey/announcements`
- `POST /api/v1/:instanceKey/announcements`
- `PATCH /api/v1/:instanceKey/announcements/:id`
- `POST /api/v1/:instanceKey/announcements/:id/archive`
- `POST /api/v1/:instanceKey/announcements/:id/ack`

### Objetivo
Administrar comunicados oficiais do condomínio.

### Recursos
- listagem paginada;
- filtros por arquivado e `requireAck`;
- criar comunicado;
- editar comunicado;
- arquivar comunicado;
- exibir anexos;
- ver status de confirmação quando necessário.

### Campos de criação/edição
- título;
- corpo;
- `requireAck`;
- anexos.

---

## 9.10 Canais

### Endpoints principais
- `GET /api/v1/:instanceKey/channels`
- `POST /api/v1/:instanceKey/channels`
- `PATCH /api/v1/:instanceKey/channels/:id`
- `POST /api/v1/:instanceKey/channels/:id/archive`

### Subfluxos
- posts;
- comentários;
- moderação.

### Objetivo
Permitir interação comunitária controlada.

### Estrutura recomendada de UI
- listagem de canais na lateral ou coluna mestre;
- detalhe do canal selecionado;
- feed de posts;
- painel de comentários;
- ações de moderação no contexto do síndico.

### Recursos adicionais
- anexos em posts;
- exclusão lógica;
- silêncio de usuário;
- remoção de conteúdo.

---

## 9.11 Atendimento Privado por Unidade

### Endpoints
- `GET /api/v1/:instanceKey/unit/inbox`
- `POST /api/v1/:instanceKey/unit/inbox/messages`
- `POST /api/v1/:instanceKey/unit/inbox/status`

### Objetivo
Gerenciar o inbox privado entre unidade e administração.

### Regras de domínio
- existe 1 thread por unidade;
- síndico vê todas;
- morador vê somente sua unidade.

### Recursos da tela do síndico
- listagem paginada de threads;
- filtros por status;
- filtro por unidade;
- visualização das mensagens;
- resposta com anexos;
- alteração de status do thread.

### Status previstos
- `ABERTO`
- `EM_ATENDIMENTO`
- `RESOLVIDO`
- `ARQUIVADO`

---

## 9.12 Tickets

### Endpoints
- `POST /api/v1/:instanceKey/tickets`
- `GET /api/v1/:instanceKey/tickets`
- `GET /api/v1/:instanceKey/tickets/:id`
- `POST /api/v1/:instanceKey/tickets/:id/messages`
- `POST /api/v1/:instanceKey/tickets/:id/assign`
- `POST /api/v1/:instanceKey/tickets/:id/status`
- `POST /api/v1/:instanceKey/tickets/:id/reopen`

### Objetivo
Administrar chamados do condomínio.

### Recursos da listagem
- filtros por status;
- unidade;
- responsável;
- overdue;
- prioridade visual;
- SLA visual;
- paginação;
- busca.

### Recursos do detalhe
- timeline do ticket;
- mensagens;
- anexos;
- histórico de status;
- responsável atual;
- ações rápidas.

### Ações esperadas
- criar ticket;
- enviar mensagem;
- atribuir responsável;
- trocar status;
- reabrir ticket.

---

## 9.13 Encomendas / Entregas

### Endpoints
- `POST /api/v1/:instanceKey/deliveries`
- `GET /api/v1/:instanceKey/deliveries`
- `GET /api/v1/:instanceKey/deliveries/:id`
- `GET /api/v1/:instanceKey/deliveries/queue`
- `POST /api/v1/:instanceKey/deliveries/:id/assign`
- `POST /api/v1/:instanceKey/deliveries/:id/complete`
- `POST /api/v1/:instanceKey/deliveries/:id/fail`

### Objetivo
Controlar chegada, distribuição e conclusão das encomendas.

### Recursos da listagem
- busca por código ou destinatário;
- filtros por status;
- tabela com unidade, entregador, data e status;
- ação de registrar chegada;
- ação de distribuir;
- ação de concluir;
- ação de falha.

### Estados previstos
- `CHEGOU`
- `EM_DISTRIBUICAO`
- `ENTREGUE`
- `NAO_ENTREGUE`

### Regras críticas
- conclusão usa **QR forte**;
- falha exige motivo;
- evidências podem ser anexadas.

---

## 9.14 Turnos de Entrega

### Endpoints
- `POST /api/v1/:instanceKey/turns/start`
- `POST /api/v1/:instanceKey/turns/end`

### Objetivo
Controlar jornada operacional do entregador.

### Recursos da tela
- iniciar turno;
- encerrar turno;
- indicar turno aberto atual;
- histórico resumido, se disponível;
- relação com fila de entregas.

---

## 9.15 Logs da Instância

### Endpoint
- `GET /api/v1/:instanceKey/logs`

### Objetivo
Consultar auditoria append-only da instância.

### Filtros recomendados
- período;
- unidade;
- ação;
- ator;
- texto livre.

### Colunas sugeridas
- data/hora;
- ator;
- ação;
- entidade;
- request_id;
- contexto.

### Detalhe opcional
- `details_json` formatado;
- IP;
- user agent;
- request id.

---

## 9.16 Perfil / Sessão do Usuário

### Objetivo
Exibir dados do síndico autenticado.

### Conteúdo
- nome;
- e-mail;
- telefone;
- roles;
- logout.

---

## 10. Regras de anexos

Os anexos são genéricos e devem ser tratados de forma transversal no frontend.

### 10.1 Fluxo obrigatório
1. chamar `/uploads/presign`;
2. realizar upload do arquivo;
3. chamar `/uploads/complete`;
4. usar `attachmentId` nas rotas do domínio;
5. recuperar URL assinada via `/attachments/:id/url` quando necessário.

### 10.2 Módulos que podem usar anexos
- mural;
- canais;
- inbox;
- tickets;
- entregas.

### 10.3 Componentização recomendada
Criar componente reutilizável `AttachmentUploader` para evitar lógica duplicada.

---

## 11. Componentes compartilhados obrigatórios

- `TenantAdminAppShell`
- `SidebarNav`
- `Topbar`
- `PageHeader`
- `KpiCard`
- `DataTable`
- `FilterBar`
- `StatusBadge`
- `FormModal`
- `DrawerDetail`
- `AttachmentUploader`
- `AuditList`
- `ConfirmActionModal`
- `PermissionGuard`
- `EmptyState`
- `ErrorState`

---

## 12. Requisitos técnicos de frontend

### 12.1 Estrutura recomendada
- cliente HTTP com `instanceKey` injetado;
- store central de autenticação tenant;
- interceptors para refresh;
- roteamento protegido;
- módulos por domínio;
- persistência de filtros em query string.

### 12.2 Estados padrão por tela
Toda tela deve prever:
- loading inicial;
- loading de ação;
- vazio;
- erro;
- sem permissão;
- sucesso transacional.

### 12.3 Segurança de UI
- esconder ações sem permissão;
- tratar `403` explicitamente;
- não permitir cruzamento de contexto entre instâncias;
- limpar store ao trocar tenant ou sair da sessão.

### 12.4 Paginação e filtros
Listagens devem nascer com:
- paginação server-side;
- filtros persistidos na URL;
- busca com debounce;
- ordenação previsível.

---

## 13. Integração com backend

## 13.1 Endpoints do Dev 1 consumidos por este frontend
- auth tenant;
- refresh único;
- condo profile;
- structure;
- users residents;
- users staff;
- invites;
- uploads;
- attachments;
- logs da instância;
- qr;
- notifications, quando o frontend passar a usá-las.

## 13.2 Endpoints do Dev 2 consumidos por este frontend
- announcements;
- channels;
- unit inbox;
- tickets;
- deliveries;
- turns;
- dashboard summary.

---

## 14. Milestones sugeridos

### Milestone 1 — Base do tenant
- login;
- bootstrap de sessão;
- app shell;
- menu lateral;
- dashboard inicial.

### Milestone 2 — Fundacionais
- perfil do condomínio;
- blocos;
- unidades;
- moradores;
- funcionários;
- convites.

### Milestone 3 — Comunicação
- mural;
- canais;
- atendimento.

### Milestone 4 — Operacional
- tickets;
- encomendas;
- turnos.

### Milestone 5 — Sistema
- logs;
- anexos transversais;
- refino de estados e UX.

---

## 15. Critérios de aceite

O painel tenant será considerado pronto quando:
- autenticação tenant estiver funcional;
- refresh único estiver integrado;
- dashboard estiver aderente ao backend e ao mock;
- perfil do condomínio, blocos e unidades estiverem operacionais;
- moradores, funcionários e convites estiverem operacionais;
- mural, canais e atendimento estiverem operacionais;
- tickets estiverem operacionais com detalhe e histórico;
- entregas e turnos estiverem operacionais;
- logs da instância estiverem consultáveis;
- anexos estiverem integrados nos módulos previstos;
- layout seguir a identidade CondoHub;
- estados de erro, loading e vazio estiverem tratados.

---

## 16. Fora do escopo deste documento

- painel Admin Global;
- app mobile;
- app smart TV;
- modelagem de banco;
- backend;
- observabilidade e deploy.

---

## 17. Resultado esperado

Ao final, este dev entrega um painel web completo para administração do condomínio, aderente ao backend tenant, coerente com o mock aprovado, visualmente alinhado ao CondoHub e preparado para expansão futura sem ruptura arquitetural.
