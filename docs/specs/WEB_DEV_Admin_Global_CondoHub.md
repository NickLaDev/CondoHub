# CondoHub — Documentação de Desenvolvimento Web Admin Global

## 1. Objetivo

Esta documentação define o escopo, a arquitetura de páginas, as regras de navegação e os critérios de entrega do **Painel Web Admin Global** do CondoHub.

Este painel é o contexto SaaS corporativo da plataforma. Ele **não** é o mesmo produto do painel do síndico. Sua função é administrar o ecossistema inteiro do CondoHub: planos, instâncias, autenticação global, suporte operacional e logs globais.

O backend separa explicitamente esse contexto do contexto tenant. No backend, o módulo do Dev 1 cobre `adminGlobal`, `iam`, `tenantResolver`, `auditLogs`, `uploads`, `attachments`, `notifications`, `structure`, `users`, `invites` e `condoProfile`, e expõe rotas próprias para o Admin Global em `/api/v1/admin/*` e autenticação em `/api/v1/admin/auth/*`. O refresh é único em `/api/v1/auth/refresh`. A modelagem também separa claramente `PLAN`, `INSTANCE`, `USER` e `SESSION`, incluindo `USER.instance_id` nulo para `ADMIN_GLOBAL`. 

---

## 2. Responsabilidade deste dev

Este dev é dono de todo o frontend do contexto **Admin Global**.

### 2.1 Inclui
- login global;
- sessão global;
- dashboard executivo do SaaS;
- gestão de planos;
- gestão de instâncias;
- visualização de detalhes da instância;
- ações de suspensão e reativação;
- suporte operacional;
- logs globais;
- shell/layout próprio do painel global.

### 2.2 Não inclui
- dashboard do condomínio;
- condo profile;
- blocos e unidades;
- moradores, funcionários e convites tenant;
- mural, canais, atendimento;
- tickets, encomendas e turnos;
- logs da instância.

Esses itens pertencem ao painel do síndico/dono da instância e devem ser desenvolvidos no outro documento.

---

## 3. Princípio de separação entre os dois painéis

O CondoHub deve ser tratado como **dois produtos web administrativos diferentes**:

1. **Admin Global SaaS**
   - controla a plataforma inteira;
   - trabalha com múltiplas instâncias;
   - usa rotas `/api/v1/admin/*`;
   - autentica com `/api/v1/admin/auth/*`.

2. **Admin da Instância / Síndico**
   - controla apenas um condomínio;
   - trabalha com `:instanceKey`;
   - usa rotas `/api/v1/:instanceKey/*`.

O painel global não deve reutilizar a navegação lateral do tenant como se fosse apenas “mais um módulo”. A experiência precisa ser própria.

---

## 4. Base visual obrigatória

Embora o mock enviado represente o tenant, o Admin Global deve seguir a mesma identidade visual do CondoHub.

### 4.1 Paleta
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

### 4.3 Diretriz visual do painel global
O painel global deve transmitir:
- visão corporativa SaaS;
- leitura de métricas e operação central;
- clareza administrativa;
- menos foco operacional de condomínio e mais foco em governança.

### 4.4 Componentes visuais esperados
- sidebar escura à esquerda;
- topbar clara com breadcrumb, alertas e perfil;
- cards KPI;
- tabelas administrativas paginadas;
- filtros de status e período;
- drawers ou modais para criação/edição;
- badges de status para planos e instâncias.

---

## 5. Perfis atendidos

Este painel atende somente o perfil **ADMIN_GLOBAL**.

Regras:
- usuário global não depende de `instanceKey` para autenticação;
- `instance_id` do usuário pode ser nulo;
- sessão global também pode ter `instance_id` nulo;
- toda rota protegida do global exige `ADMIN_GLOBAL` + `admin:manage` quando aplicável.

---

## 6. Contratos de autenticação e sessão

### 6.1 Fluxos obrigatórios
- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`
- `POST /api/v1/auth/refresh`

### 6.2 Padrão de resposta esperado
O frontend global deve consumir o mesmo shape de autenticação recomendado pelo backend:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresInSec": 300,
  "user": {
    "id": "uuid",
    "instanceId": null,
    "unitId": null,
    "roles": ["ADMIN_GLOBAL"],
    "name": "string",
    "email": "string|null",
    "phone": "string|null"
  }
}
```

### 6.3 Regras de frontend
- guardar sessão em store central;
- renovar token silenciosamente com refresh único;
- invalidar sessão se refresh falhar;
- redirecionar para login quando `401` persistir;
- carregar `me` no bootstrap do app;
- não misturar sessão do global com sessão tenant.

---

## 7. Arquitetura de informação do painel global

### 7.1 Menu lateral recomendado

**Principal**
- Dashboard

**SaaS**
- Instâncias
- Planos
- Estatísticas

**Operação**
- Suporte
- Logs Globais

**Conta**
- Perfil / Sessão

### 7.2 Rotas sugeridas
- `/admin/login`
- `/admin/dashboard`
- `/admin/instances`
- `/admin/instances/:id`
- `/admin/plans`
- `/admin/plans/:id`
- `/admin/stats`
- `/admin/support`
- `/admin/logs`
- `/admin/profile`

---

## 8. Especificação das telas

## 8.1 Login Global

### Objetivo
Autenticar o administrador global da plataforma.

### Conteúdo da tela
- logo CondoHub;
- título do painel global;
- campo e-mail;
- campo senha;
- botão principal de entrar;
- mensagens de erro de autenticação.

### Regras
- chamar `POST /api/v1/admin/auth/login`;
- em sucesso, salvar tokens e redirecionar para `/admin/dashboard`;
- em falha, mostrar feedback claro;
- bootstrap posterior com `GET /api/v1/admin/auth/me`.

---

## 8.2 Dashboard Global

### Objetivo
Dar visão executiva da saúde da operação SaaS.

### Fonte principal
- `GET /api/v1/admin/stats`
- agregações complementares vindas de instâncias, planos e logs.

### Conteúdo sugerido
- total de instâncias;
- instâncias ativas;
- instâncias suspensas;
- total de planos;
- distribuição por plano;
- uso total estimado da plataforma;
- cards de alertas operacionais;
- lista de últimas ações globais;
- atalhos para suporte e instâncias recentes.

### Componentes
- cards KPI;
- tabela resumida de instâncias recentes;
- bloco de atividade recente;
- filtros rápidos por status.

### Observação
Mesmo que o backend exponha `/stats` inicialmente como básico, o frontend já deve ser preparado para crescimento futuro sem refatoração estrutural.

---

## 8.3 Listagem de Instâncias

### Objetivo
Permitir administração completa das instâncias do SaaS.

### Endpoint principal
- `GET /api/v1/admin/instances`

### Recursos da tela
- tabela paginada;
- busca textual;
- filtros por status;
- filtro por plano;
- ação de criar instância;
- acesso ao detalhe;
- ação de suspender;
- ação de reativar.

### Colunas sugeridas
- nome da instância;
- `instance_key`;
- plano;
- status;
- data de criação;
- última atualização;
- ações.

### Ações
- criar nova instância;
- editar dados da instância;
- suspender;
- reativar;
- abrir detalhe da instância.

---

## 8.4 Criar Instância

### Endpoint
- `POST /api/v1/admin/instances`

### Campos sugeridos
- nome da instância;
- plano;
- status inicial, quando aplicável.

### Regras
- `instance_key` deve ser tratado como dado gerado pelo backend;
- após criação, redirecionar para o detalhe da instância;
- feedback de sucesso com identificação da instância criada.

---

## 8.5 Detalhe da Instância

### Endpoint
- `GET /api/v1/admin/instances/:id`

### Objetivo
Concentrar a visão administrativa da instância.

### Conteúdo da tela
- cabeçalho com nome, `instance_key`, status e plano;
- metadados de criação/atualização;
- bloco de informações institucionais;
- atalhos para ações administrativas;
- histórico resumido ou link para logs filtrados;
- bloco de suporte.

### Ações da tela
- editar instância;
- suspender;
- reativar;
- acionar suporte;
- navegar para logs globais filtrados por `instance_id`, quando suportado.

---

## 8.6 Editar Instância

### Endpoint
- `PATCH /api/v1/admin/instances/:id`

### Regras
- alteração parcial;
- feedback otimista apenas quando seguro;
- manter histórico visual de status;
- proteger ações destrutivas com modal de confirmação.

---

## 8.7 Suspender / Reativar Instância

### Endpoints
- `POST /api/v1/admin/instances/:id/suspend`
- `POST /api/v1/admin/instances/:id/reactivate`

### Regras de UX
- sempre exigir confirmação;
- sempre mostrar impacto da ação;
- após sucesso, atualizar badge e tabelas relacionadas;
- bloquear múltiplos cliques durante request.

### Mensagens de confirmação sugeridas
- suspender: informar que o tenant ficará bloqueado;
- reativar: informar que o acesso será restabelecido.

---

## 8.8 Listagem de Planos

### Endpoint principal
- `GET /api/v1/admin/plans`

### Objetivo
Gerenciar a camada comercial/técnica de planos do CondoHub.

### Recursos
- tabela paginada;
- criar plano;
- editar plano;
- arquivar plano;
- visualizar detalhe.

### Colunas sugeridas
- nome;
- limites de unidades;
- limites de usuários;
- armazenamento máximo;
- status;
- data de criação;
- ações.

### Observação
`features_json` deve ser tratado com UI legível. No MVP, pode ser editor estruturado simples ou painel de chaves/valores.

---

## 8.9 Criar / Editar Plano

### Endpoints
- `POST /api/v1/admin/plans`
- `PATCH /api/v1/admin/plans/:id`

### Campos esperados
- nome;
- features;
- max_units;
- max_users;
- max_storage_mb.

### Regras
- validação client-side e server-side;
- nome único;
- campos numéricos com máscara adequada;
- mudanças refletidas imediatamente na listagem.

---

## 8.10 Arquivar Plano

### Endpoint
- `POST /api/v1/admin/plans/:id/archive`

### Regras
- confirmar ação antes do envio;
- exibir plano como arquivado, não removido;
- manter histórico visível na interface.

---

## 8.11 Estatísticas

### Endpoint
- `GET /api/v1/admin/stats`

### Objetivo
Fornecer leitura mais analítica do SaaS.

### Visualizações recomendadas
- cards resumo;
- gráfico por plano;
- gráfico por status de instância;
- indicadores de crescimento;
- indicadores de uso por limite contratado;
- ranking de instâncias por volume, se o backend evoluir para isso.

### Observação
No MVP, o backend pode devolver um payload enxuto. O frontend deve prever placeholders e estados vazios para evolução futura.

---

## 8.12 Suporte Operacional

### Endpoint conhecido
- `POST /api/v1/admin/support/reset-sindico`

### Objetivo
Permitir ação administrativa central sobre a conta gestora da instância.

### Estrutura da tela
- busca de instância;
- resumo da instância selecionada;
- formulário de ação de suporte;
- histórico visual de últimas ações executadas, se disponível.

### Caso de uso MVP
- reset de senha do síndico ou emissão de novo convite administrativo;
- sempre exigir confirmação;
- sempre exibir resposta de sucesso/erro;
- sempre assumir geração de audit log no backend.

---

## 8.13 Logs Globais

### Endpoint
- `GET /api/v1/admin/logs`

### Objetivo
Consultar o histórico append-only da plataforma.

### Filtros recomendados
- período;
- ação;
- actor_user_id;
- entity_type;
- entity_id;
- texto livre;
- instância, quando houver esse dado no payload.

### Colunas sugeridas
- data/hora;
- ator;
- ação;
- entidade;
- request_id;
- contexto;
- ações para abrir detalhe.

### Tela de detalhe opcional
Pode existir drawer/modal com:
- `details_json` formatado;
- IP;
- user agent;
- request id;
- referência da entidade.

---

## 8.14 Perfil / Sessão

### Objetivo
Exibir dados da conta global autenticada.

### Conteúdo
- nome;
- e-mail;
- papéis;
- informações da sessão atual;
- ação de logout.

### Regras
- consumir `GET /api/v1/admin/auth/me`;
- logout deve limpar store e redirecionar para login;
- refresh nunca deve ficar acoplado a esta tela.

---

## 9. Componentes compartilhados obrigatórios

- `AdminGlobalAppShell`
- `SidebarNav`
- `Topbar`
- `PageHeader`
- `KpiCard`
- `DataTable`
- `FilterBar`
- `StatusBadge`
- `ConfirmActionModal`
- `EntityDrawer`
- `EmptyState`
- `ErrorState`
- `PermissionGuard`

---

## 10. Requisitos técnicos de frontend

### 10.1 Estrutura recomendada
- módulo de auth global separado do auth tenant;
- cliente HTTP com interceptors;
- store central para sessão;
- organização por domínio de tela;
- roteamento protegido;
- layout persistente com breadcrumbs.

### 10.2 Estados padrão por tela
Toda tela precisa prever:
- loading inicial;
- loading de ação;
- vazio;
- erro;
- sem permissão;
- sucesso transacional.

### 10.3 Paginação e filtros
Listas administrativas devem nascer com:
- paginação server-side;
- persistência de filtros na URL;
- busca com debounce;
- ordenação previsível.

### 10.4 Segurança de UI
- esconder ações sem permissão;
- não depender só de esconder botão; tratar também respostas `403`;
- limpar store ao trocar contexto de autenticação;
- nunca reutilizar token de tenant no global.

---

## 11. Integração com backend

## 11.1 Endpoints obrigatórios deste dev
- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/admin/instances`
- `POST /api/v1/admin/instances`
- `GET /api/v1/admin/instances/:id`
- `PATCH /api/v1/admin/instances/:id`
- `POST /api/v1/admin/instances/:id/suspend`
- `POST /api/v1/admin/instances/:id/reactivate`
- `GET /api/v1/admin/plans`
- `POST /api/v1/admin/plans`
- `GET /api/v1/admin/plans/:id`
- `PATCH /api/v1/admin/plans/:id`
- `POST /api/v1/admin/plans/:id/archive`
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/logs`
- `POST /api/v1/admin/support/reset-sindico`

## 11.2 Dependências externas do dev global
Nenhuma dependência funcional do tenant deve bloquear o desenvolvimento deste painel.

---

## 12. Milestones sugeridos

### Milestone 1 — Base do painel global
- login global;
- bootstrap de sessão;
- app shell;
- dashboard placeholder;
- proteção de rotas.

### Milestone 2 — Instâncias
- listagem;
- detalhe;
- criação;
- edição;
- suspender/reativar.

### Milestone 3 — Planos
- listagem;
- criação;
- edição;
- arquivamento.

### Milestone 4 — Operação central
- stats;
- logs globais;
- suporte.

---

## 13. Critérios de aceite

O painel global será considerado pronto quando:
- autenticação global estiver funcional;
- refresh único estiver integrado;
- navegação do painel global estiver separada do tenant;
- instâncias puderem ser listadas, criadas, editadas, suspensas e reativadas;
- planos puderem ser listados, criados, editados e arquivados;
- stats globais estiverem renderizados;
- logs globais estiverem consultáveis com filtros;
- suporte operacional mínimo estiver disponível;
- layout seguir a identidade CondoHub;
- estados de erro, vazio e loading estiverem tratados.

---

## 14. Fora do escopo deste documento

- painel do síndico;
- painel de morador;
- app mobile;
- app smart TV;
- configuração de infra;
- modelagem de banco;
- implementação de backend.

---

## 15. Resultado esperado

Ao final, este dev entrega um painel web corporativo, separado do tenant, com linguagem visual alinhada ao CondoHub e aderente ao backend já definido para o contexto global do SaaS.
