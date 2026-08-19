# CondoHub Mobile (Flutter) — DEV 2

## 0) Missão do DEV 2
Você é responsável por implementar **todas as funcionalidades restantes** do app, utilizando a **base** já fornecida pelo DEV 1. Seu escopo abrange:

- **Mural**: lista de avisos + detalhe + ação "Ciente"
- **Chamados**: lista + criação de chamado + detalhe
- **Comunicação**: hub de canais + atendimento (chat/inbox)
- **Serviços**: encomendas (lista + status) + meu QR (countdown e regeneração)

Tudo deve ser **integrado com o mockado**, já com **navegação** e **estrutura de telas** definidas pelo DEV 1.

---

## 1) O que já foi implementado

### 1.1 Estrutura e Navegação
A navegação já está configurada com **5 tabs** (Início, Mural, Chamados, Comunicação, Serviços). O **`CHScaffold`** e **`CHTopBand`** estão configurados para a estrutura de todas as telas, exceto Login.

### 1.2 Modelos e Repositórios Mock
Todos os **models** e **repositórios mock** já foram implementados:
- **Models**: Announcement, Ticket, Channel, Inbox, Delivery, QrState
- **Repositórios mock** para simulação de dados (com método `Stream` e `Future` mockados).

### 1.3 Telas Implementadas por DEV 1
- **Login** e **Invite** já estão implementados com validações e navegação.
- **Home** já está funcional com cards de alerta, quick access tiles e últimos avisos consumidos via `MuralRepository`.

---

## 2) O que precisa ser feito
### 2.1 Mural
- **Tela de Mural**: Implementar lista de **avisos** com tag chip (Aviso/Evento/Urgente/Comunicado).
- **Detalhe do aviso**: Implementar exibição completa com possibilidade de marcar como "Ciente".

### 2.2 Chamados (Tickets)
- **Tela de Chamados**: Implementar lista com status, categoria, e descrição.
- **Novo chamado**: Criar o formulário com campos obrigatórios (título, categoria, local, descrição).
- **Detalhe do chamado**: Implementar exibição detalhada de chamados.

### 2.3 Comunicação
- **Hub de Comunicação**: Tela inicial com cards para **Canais** e **Atendimento**.
- **Canais**: Implementar lista de canais, visualização de posts e comentar.
- **Atendimento (Inbox)**: Tela de chat com mensagens entre usuário e portaria (com auto-reply).

### 2.4 Serviços
- **Encomendas**: Implementar lista com status "Aguardando", "Entregue", "Retiradas".
- **Meu QR**: Implementar tela com QR code e countdown, além da funcionalidade de regeneração de código.

---

## 3) O que já foi feito
- **Navegação** já está configurada para todas as áreas.
- **Mock de dados** já está implementado e pode ser consumido diretamente.
- **Telas de Login, Invite e Home** já estão implementadas.

---

## 4) Próximos passos para você
- Desenvolver a implementação das telas de **Mural**, **Chamados**, **Comunicação**, e **Serviços**.
- Implementar todas as interações com os repositórios mock.
- Garantir que todas as telas usem `CHScaffold` (faixa azul + logo) como base, exceto o Login.
