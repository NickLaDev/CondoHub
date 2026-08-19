Plano de Fases para DEV 2
Fase 1 — Comunicação (Hub, Canais e Inbox)

Objetivo da Fase 1:

Implementar o Hub de Comunicação com 2 cards: Canais e Atendimento (Inbox).

Criar a tela de Canais que exibe a lista de canais e possibilita criar posts.

Implementar a tela de Atendimento (Inbox) com a funcionalidade de chat (simulada).

Exemplo de Prompt para Codex (Fase 1 - DEV 2):

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
Fase 2 — Serviços (Encomendas e QR)

Objetivo da Fase 2:

Implementar as telas de Encomendas e Meu QR.

A tela de Encomendas deve permitir visualizar o status das encomendas.

A tela de Meu QR deve gerar o QR code e permitir regeneração com countdown.

Exemplo de Prompt para Codex (Fase 2 - DEV 2):

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
Fase 3 — Comunicação (Posts, Detalhes e Comentários)

Objetivo da Fase 3:

Criar a tela de Posts de canais, com a possibilidade de criar novos posts.

Implementar a tela de Detalhe de Post, onde o usuário pode visualizar o conteúdo completo do post e adicionar comentários.

Exemplo de Prompt para Codex (Fase 3 - DEV 2):

Agora, você deve implementar a funcionalidade de **Posts** e **Comentários**.

1. **Tela de Posts do Canal:**
   - Implemente a lista de **posts** de cada canal, com:
     - Cada post deve exibir o **título**, **descrição** e **data**.
     - Cada item deve ter um **chevron** para navegar até o **Detalhe do Post**.

2. **Tela de Detalhe do Post:**
   - Implemente a tela de **detalhe do post**, que exibe:
     - O **título**, **descrição completa** e **data**.
     - A lista de **comentários** do post.
     - Um campo de **comentário** onde o usuário pode digitar e adicionar sua mensagem.

3. **Tela de Comentários:**
   - Implemente a funcionalidade de adicionar e visualizar comentários no post.
   - Os comentários devem ser listados abaixo do post e o **campo de texto** deve permitir a criação de novos.

Anexe o mockup da tela de **Post** e **Comentários** para referência quando necessário.
Fase 4 — Atendimento (Inbox e Mensagens)

Objetivo da Fase 4:

Implementar a tela de Inbox, onde o usuário pode visualizar e enviar mensagens para a portaria.

Implementar a funcionalidade de auto-reply para simular a interação com a portaria.

Exemplo de Prompt para Codex (Fase 4 - DEV 2):

Agora, você deve implementar a funcionalidade de **Inbox** e mensagens para o atendimento da portaria.

1. **Tela de Inbox (Atendimento):**
   - Implemente a tela de **Inbox** com:
     - A lista de **mensagens** trocadas entre o usuário e a portaria.
     - Exiba mensagens enviadas pela **portaria** à esquerda e mensagens enviadas pelo **usuário** à direita.
     - Um campo de **texto** para o usuário enviar mensagens à portaria.

2. **Auto-reply da Portaria:**
   - Simule um **auto-reply** da portaria a cada 2 segundos (usando `Future.delayed`).
   - As mensagens devem ser trocadas de forma dinâmica.

Anexe o mockup da tela de **Inbox** para referência e utilize-o ao implementar.
