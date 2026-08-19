Plano de Fases para DEV 1
Fase 1 — Estrutura Inicial e Navegação (Base do App)

Objetivo da Fase 1:

Criar a estrutura inicial do app com base no que foi definido na documentação.

Implementar a navegação entre as telas principais (Login, Invite e Home).

Configurar o go_router para 5 tabs e rotas principais, e o CHScaffold para todas as telas exceto Login.

Exemplo de Prompt para Codex (Fase 1 - DEV 1):

Você é um desenvolvedor Flutter, e sua tarefa é criar a estrutura básica de navegação do app CondoHub Mobile. Isso inclui:
- Configurar a navegação para as telas: **Login**, **Invite** e **Home**.
- Usar `go_router` para configurar a navegação entre as 5 tabs (Início, Mural, Chamados, Comunicação e Serviços).
- Criar um `CHScaffold` com **faixa azul e logo** no topo para todas as telas **exceto Login**.

1. **LoginPage:** Crie a tela de login com campos de e-mail e senha, e um botão para fazer login. Valide os campos e navegue para a Home se o login for bem-sucedido.
2. **InvitePage:** Crie a tela de convite onde o usuário digita um código de convite e, se for válido, navega para a tela de Home.
3. **HomePage:** A tela inicial deve usar o `CHScaffold` e exibir:
   - Saudação ao usuário.
   - Cards de **alerta** (urgente + encomenda).
   - **Quick Access Tiles** que navegam para outras telas (Mural, Chamados, Encomendas, Atendimento, Meu QR).
   - Últimos avisos consumidos via **MuralRepository** (dados mockados).

**Além disso, implemente a navegação entre essas telas usando `go_router`, e o **bottom navigation** com 5 tabs:
1. Início → `/app/home`
2. Mural → `/app/mural`
3. Chamados → `/app/tickets`
4. Comunicação → `/app/comm`
5. Serviços → `/app/services`

Por favor, utilize o seguinte mockup para a **HomePage** e a navegação. Anexe a tela de referência quando necessário.
Fase 2 — Mural e Chamados

Objetivo da Fase 2:

Implementar a tela de Mural com a lista de avisos (tags, título, data, etc.) e permitir que o usuário marque os avisos como "Ciente".

Implementar a tela de Chamados com a lista de chamados e um formulário para criação de novos chamados.

Exemplo de Prompt para Codex (Fase 2 - DEV 1):

Agora, você deve implementar a tela **Mural** e a tela **Chamados**. 

1. **Tela Mural:**
   - Implemente uma lista de **avisos** (usando um `ListView`):
     - Cada item na lista deve ter: **tag** (Aviso/Evento/Urgente), **título**, **data**, **autor** e **um botão “Ciente”**.
     - Quando o usuário clicar em "Ciente", marque o aviso como **lido**.
     - Use **ValueListenableBuilder** para atualizar a tela de forma eficiente.

2. **Tela Chamados:**
   - Implemente a lista de chamados com:
     - **Status**, **título**, **local**, **data**, **categoria**.
   - Implemente um formulário com:
     - Campos de **título**, **categoria** (dropdown), **local** (dropdown), e **descrição**.
     - O botão de **Criar Chamado** deve ser habilitado somente quando todos os campos forem válidos (campo título, categoria, local, descrição).

Anexe a tela de referência do mockup para o **Mural** e a tela de **Chamados** quando necessário.
Fase 3 — Comunicação (Hub, Canais e Inbox)

Objetivo da Fase 3:

Implementar o Hub de Comunicação com 2 cards: Canais e Atendimento (Inbox).

Criar a tela de Canais que exibe a lista de canais e possibilita criar posts.

Implementar a tela de Atendimento (Inbox) com a funcionalidade de chat (simulada).

Exemplo de Prompt para Codex (Fase 3 - DEV 1):

Agora, você deve implementar a funcionalidade de **Comunicação**. Isso inclui o **Hub de Comunicação**, a tela de **Canais** e o **Atendimento (Inbox)**.

1. **Hub de Comunicação:** 
   - Crie um Hub com 2 cards:
     - **Canais** → quando clicado, deve levar o usuário para a tela de **Canais**.
     - **Atendimento** → quando clicado, deve levar o usuário para a tela de **Inbox**.

2. **Tela de Canais:**
   - Implemente a lista de **Canais**, com:
     - Nome do canal, **descrição**, e **contador de posts**.
     - Cada item na lista deve ter um **ícone de canal (#)** e um **chevron** para navegar para a tela de detalhes do canal.
     - Implemente a possibilidade de criar posts nos canais com um botão "Novo post".

3. **Tela de Atendimento (Inbox):**
   - Implemente a tela de chat com a portaria. O chat deve exibir as mensagens trocadas entre o usuário e a portaria.
   - Implemente um campo de **texto** para o usuário enviar novas mensagens e exibir **auto-reply** da portaria (simulado com delay).

Use o mockup da tela de **Hub de Comunicação** e **Atendimento** para referência, e anexe a tela quando necessário.
Fase 4 — Serviços (Encomendas e QR)

Objetivo da Fase 4:

Implementar as telas de Encomendas e Meu QR.

A tela de Encomendas deve permitir visualizar o status das encomendas.

A tela de Meu QR deve gerar o QR code e permitir regeneração com countdown.

Exemplo de Prompt para Codex (Fase 4 - DEV 1):

Agora, você deve implementar a funcionalidade de **Serviços**. Isso inclui a tela de **Encomendas** e **Meu QR**.

1. **Tela de Encomendas:**
   - Implemente a lista de **Encomendas**, com:
     - Filtros de status: **Todas**, **Aguardando**, **Entregue**.
     - Cada item da lista deve exibir o **título da encomenda**, **transportadora**, **data** e **status**.
     - Quando o item for clicado, deve navegar para a tela de **detalhes** da encomenda.

2. **Tela de Meu QR:**
   - Implemente a tela com um **QR Code** gerado para o usuário.
   - O QR deve exibir o **nome do morador**, **bloco/apt** e um **contador de tempo de expiração**.
   - Quando o QR expirar, ele deve ser **regenerado automaticamente**.
   - Adicione um botão **“Gerar novo código”** para regenerar o QR quando necessário.

Use o mockup das telas de **Encomendas** e **Meu QR** para referência e anexe a tela quando necessário.

Agora, tudo está atualizado com o plano de fases e os exemplos de prompts de implementação para cada fase. Esse plano detalha o que precisa ser feito e inclui exemplos claros de como pedir ao Codex para implementar cada fase de desenvolvimento.

Se precisar de mais ajustes ou detalhes, é só avisar! 😊

revise se quer mudar algo, se n, me entrehue o plano de fases do dev com exemplos de prompt

Revisei os planos de fases com exemplos de prompts para os DEV 1 e DEV 2 e tudo parece estar muito bem estruturado. Não há necessidade de ajustes ou mudanças significativas.

Agora, vou fornecer os planos de fases completos com exemplos de prompts para cada um dos devs para que eles possam seguir sem problemas.

Plano de Fases para DEV 1
Fase 1 — Estrutura Inicial e Navegação (Base do App)

Objetivo da Fase 1:

Criar a estrutura inicial do app com base no que foi definido na documentação.

Implementar a navegação entre as telas principais (Login, Invite e Home).

Configurar o go_router para 5 tabs e rotas principais, e o CHScaffold para todas as telas exceto Login.

Exemplo de Prompt para Codex (Fase 1 - DEV 1):

Você é um desenvolvedor Flutter, e sua tarefa é criar a estrutura básica de navegação do app CondoHub Mobile. Isso inclui:
- Configurar a navegação para as telas: **Login**, **Invite** e **Home**.
- Usar `go_router` para configurar a navegação entre as 5 tabs (Início, Mural, Chamados, Comunicação e Serviços).
- Criar um `CHScaffold` com **faixa azul e logo** no topo para todas as telas **exceto Login**.

1. **LoginPage:** Crie a tela de login com campos de e-mail e senha, e um botão para fazer login. Valide os campos e navegue para a Home se o login for bem-sucedido.
2. **InvitePage:** Crie a tela de convite onde o usuário digita um código de convite e, se for válido, navega para a tela de Home.
3. **HomePage:** A tela inicial deve usar o `CHScaffold` e exibir:
   - Saudação ao usuário.
   - Cards de **alerta** (urgente + encomenda).
   - **Quick Access Tiles** que navegam para outras telas (Mural, Chamados, Encomendas, Atendimento, Meu QR).
   - Últimos avisos consumidos via **MuralRepository** (dados mockados).

**Além disso, implemente a navegação entre essas telas usando `go_router`, e o **bottom navigation** com 5 tabs:
1. Início → `/app/home`
2. Mural → `/app/mural`
3. Chamados → `/app/tickets`
4. Comunicação → `/app/comm`
5. Serviços → `/app/services`

Por favor, utilize o seguinte mockup para a **HomePage** e a navegação. Anexe a tela de referência quando necessário.
Fase 2 — Mural e Chamados

Objetivo da Fase 2:

Implementar a tela de Mural com a lista de avisos (tags, título, data, etc.) e permitir que o usuário marque os avisos como "Ciente".

Implementar a tela de Chamados com a lista de chamados e um formulário para criação de novos chamados.

Exemplo de Prompt para Codex (Fase 2 - DEV 1):

Agora, você deve implementar a tela **Mural** e a tela **Chamados**. 

1. **Tela Mural:**
   - Implemente uma lista de **avisos** (usando um `ListView`):
     - Cada item na lista deve ter: **tag** (Aviso/Evento/Urgente), **título**, **data**, **autor** e **um botão “Ciente”**.
     - Quando o usuário clicar em "Ciente", marque o aviso como **lido**.
     - Use **ValueListenableBuilder** para atualizar a tela de forma eficiente.

2. **Tela Chamados:**
   - Implemente a lista de chamados com:
     - **Status**, **título**, **local**, **data**, **categoria**.
   - Implemente um formulário com:
     - Campos de **título**, **categoria** (dropdown), **local** (dropdown), e **descrição**.
     - O botão de **Criar Chamado** deve ser habilitado somente quando todos os campos forem válidos (campo título, categoria, local, descrição).

Anexe a tela de referência do mockup para o **Mural** e a tela de **Chamados** quando necessário.
Fase 3 — Comunicação (Hub, Canais e Inbox)

Objetivo da Fase 3:

Implementar o Hub de Comunicação com 2 cards: Canais e Atendimento (Inbox).

Criar a tela de Canais que exibe a lista de canais e possibilita criar posts.

Implementar a tela de Atendimento (Inbox) com a funcionalidade de chat (simulada).

Exemplo de Prompt para Codex (Fase 3 - DEV 1):

Agora, você deve implementar a funcionalidade de **Comunicação**. Isso inclui o **Hub de Comunicação**, a tela de **Canais** e o **Atendimento (Inbox)**.

1. **Hub de Comunicação:** 
   - Crie um Hub com 2 cards:
     - **Canais** → quando clicado, deve levar o usuário para a tela de **Canais**.
     - **Atendimento** → quando clicado, deve levar o usuário para a tela de **Inbox**.

2. **Tela de Canais:**
   - Implemente a lista de **Canais**, com:
     - Nome do canal, **descrição**, e **contador de posts**.
     - Cada item na lista deve ter um **ícone de canal (#)** e um **chevron** para navegar para a tela de detalhes do canal.
     - Implemente a possibilidade de criar posts nos canais com um botão "Novo post".

3. **Tela de Atendimento (Inbox):**
   - Implemente a tela de chat com a portaria. O chat deve exibir as mensagens trocadas entre o usuário e a portaria.
   - Implemente um campo de **texto** para o usuário enviar novas mensagens e exibir **auto-reply** da portaria (simulado com delay).

Use o mockup da tela de **Hub de Comunicação** e **Atendimento** para referência, e anexe a tela quando necessário.
Fase 4 — Serviços (Encomendas e QR)

Objetivo da Fase 4:

Implementar as telas de Encomendas e Meu QR.

A tela de Encomendas deve permitir visualizar o status das encomendas.

A tela de Meu QR deve gerar o QR code e permitir regeneração com countdown.

Exemplo de Prompt para Codex (Fase 4 - DEV 1):

Agora, você deve implementar a funcionalidade de **Serviços**. Isso inclui a tela de **Encomendas** e **Meu QR**.

1. **Tela de Encomendas:**
   - Implemente a lista de **Encomendas**, com:
     - Filtros de status: **Todas**, **Aguardando**, **Entregue**.
     - Cada item da lista deve exibir o **título da encomenda**, **transportadora**, **data** e **status**.
     - Quando o item for clicado, deve navegar para a tela de **detalhes** da encomenda.

2. **Tela de Meu QR:**
   - Implemente a tela com um **QR Code** gerado para o usuário.
   - O QR deve exibir o **nome do morador**, **bloco/apt** e um **contador de tempo de expiração**.
   - Quando o QR expirar, ele deve ser **regenerado automaticamente**.
   - Adicione um botão **“Gerar novo código”** para regenerar o QR quando necessário.

Use o mockup das telas de **Encomendas** e **Meu QR** para referência e anexe a tela quando necessário.
