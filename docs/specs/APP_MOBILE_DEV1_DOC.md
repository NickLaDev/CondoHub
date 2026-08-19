# CondoHub Mobile (Flutter) — DEV 1

## 0) Missão do DEV 1
Você é responsável pela **base técnica** do app, entregando o **app funcional em mock** com as seguintes funcionalidades já implementadas e a estrutura do projeto pronta para ser consumida pelo DEV 2.

Você deve entregar:
- Estrutura de pastas organizada
- Navegação (bottom nav com 5 tabs) configurada
- Tela de Login funcional, com fluxo de "Esqueci minha senha" e "Tenho um convite"
- Tela Home com quick access tiles e lista de últimos avisos (dados mock)
- **Componente compartilhado:** `CHScaffold` e `CHTopBand` (faixa azul com logo central)
- **Repositórios de dados mockados** (sem backend) com **mocks** e **providers** configurados

---

## 1) O que já foi implementado

### 1.1 Estrutura do Projeto
A estrutura de pastas já foi configurada conforme os requisitos. O projeto possui:
- `lib/app/` com arquivos de **router** e **shell**.
- `lib/core/` com os temas, componentes UI compartilhados e mocks de dados.
- `lib/features/` com **autenticação** (login + convite) e **home** já implementados.

### 1.2 Dependências
As dependências essenciais estão configuradas no `pubspec.yaml`:
- `go_router`
- `flutter_riverpod`
- `intl`
- `uuid`

### 1.3 Tela de Login
A tela de **Login** foi implementada com:
- Validação de e-mail e senha.
- Navegação para **Home** após login bem-sucedido.
- Funcionalidade de "Esqueci minha senha" com modal.

### 1.4 Tela de Invite
A tela de **Invite** está configurada para autenticar via código de convite e navegar para a tela de **Home** após sucesso.

### 1.5 Tela Home
A **Home** contém:
- Header com saudação e informações do condomínio.
- Cards de alerta (urgente + encomenda).
- **Quick Access Tiles** que navegam para outras telas (Mural, Chamados, Encomendas, Atendimento, Meu QR).
- Últimos avisos consumidos via **MuralRepository** mock.

---

## 2) O que precisa ser feito:
### 2.1 Corrigir Repositórios de Mocks
Os repositórios de mocks **não preservam o estado** entre atualizações. Isso precisa ser corrigido implementando **instâncias singleton** para os repositórios, garantindo que o estado seja persistido (ex.: tickets criados, ack nos avisos, etc.).

### 2.2 Padronizar componente `OutlineButton`
O componente custom de botão de contorno deve seguir a convenção de nome da documentação como **`OutlineButton`**.

---

## 3) Entregáveis para DEV 2
O DEV 2 pode **consumir a base** fornecida para implementar as telas e funcionalidades restantes. A estrutura de navegação e a tela **Home** já estão configuradas, e todos os mocks estão prontos para serem consumidos.

**Nota:** O DEV 1 deve garantir que todas as **rotas de detalhe** já estão configuradas para o DEV 2, incluindo `/app/mural/:id`, `/app/tickets/:id`, `/app/channels/:id`, etc.

---

## 4) Próximos passos
- Corrigir o problema de persistência de estado nos repositórios mock (P6.1).
- Garantir o nome `OutlineButton` para o componente de botão de contorno.
- Corrigir a tela **QR** para seguir a convenção de `CHScaffold` (se necessário, criar uma variante).
