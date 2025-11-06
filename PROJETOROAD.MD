Entendido, meu amigo. Você não quer apenas *usar* uma ferramenta, você quer *construir* a sua própria plataforma, um "ManyChat-like" focado em WhatsApp Não-Oficial, com liberdade total para simular interações humanas.

Este é um projeto de software robusto e empolgante. A grande vantagem é o controle total. O grande desafio é a instabilidade da "API" (o *conector*) que você terá que gerenciar.

Para desenhar o roadmap, precisamos quebrar a aplicação em seus componentes principais (arquitetura) e depois detalhar as telas e funcionalidades de cada um.

---

### 1. 🏛️ Arquitetura de Alto Nível do Projeto

Sua aplicação não será uma coisa só (monolito). Ela será composta por, no mínimo, 3 partes:

1.  **Frontend (O "Painel"):** A aplicação web (em React, Vue, etc.) onde *você* (ou seus usuários) irá configurar tudo. É aqui que moram as "telas".
2.  **Backend (A "Inteligência"):** Uma API (em Node.js, Python, etc.) que gerencia usuários, salva os funis, armazena o histórico de chat e decide o que fazer.
3.  **Serviço de Conexão (O "Conector"):** Um ou mais serviços separados (provavelmente em Node.js usando **Baileys**) que mantêm a conexão *real* com o WhatsApp Web. É a parte instável.

**Por que separar o "Conector"?** Porque ele vai travar e cair. Você precisa poder reiniciá-lo, ou até mesmo ter *vários* (um para cada número de WhatsApp conectado), sem derrubar seu Backend ou Frontend.

---

### 2. 💻 Telas e Funcionalidades Detalhadas (O Roadmap de Features)

Aqui está o detalhamento das "telas" (módulos) que você precisará construir no seu **Frontend** e as funcionalidades de **Backend** correspondentes.

#### Módulo 1: Gerenciamento de Conexões (O Onboarding)

É a primeira coisa que seu usuário vê.

* **Tela: "Instâncias" ou "Conexões"**
    * **Visual:** Uma lista (cards ou tabela) de todas as contas de WhatsApp conectadas.
    * **Funcionalidades:**
        * Botão "Adicionar nova conexão".
        * Status da conexão (ex: `Conectado`, `Aguardando leitura do QR`, `Desconectado`).
        * Botão "Reconectar" (que gera um novo QR Code).
        * Botão "Desconectar" (faz o logout).

* **Tela: "Conectar Novo WhatsApp" (Modal ou Página)**
    * **Visual:** Um QR Code grande.
    * **Funcionalidade (Backend/Conector):**
        1.  O Frontend pede ao Backend: "quero um novo QR Code".
        2.  O Backend inicia uma nova instância do seu `Serviço de Conexão` (Baileys).
        3.  O Baileys gera um QR Code.
        4.  O Backend envia esse QR Code para o Frontend exibir.
        5.  O Frontend fica "ouvindo" (via WebSocket ou polling) o status: "QR Lido", "Conectado com Sucesso".

#### Módulo 2: Contatos (Mini-CRM)

Onde você gerencia as pessoas que falaram com o bot.

* **Tela: "Lista de Contatos"**
    * **Visual:** Uma tabela com: `Nome`, `Número`, `Tags` (ex: "Lead Frio", "Agendado"), `Responsável` (se tiver múltiplos usuários).
    * **Funcionalidades:**
        * Pesquisar contatos.
        * Filtrar por tags.
        * Adicionar/Remover tags em massa.
        * Importar/Exportar contatos.

* **Tela: "Detalhe do Contato"**
    * **Visual:** Dividida em duas colunas.
    * **Coluna 1 (Dados):**
        * Campos do contato: `Nome`, `Email`, `Empresa`, etc. (Campos personalizados são importantes).
        * Lista de `Tags` do contato.
        * Notas internas.
    * **Coluna 2 (Histórico):**
        * O histórico completo da conversa (mensagens do bot e do usuário).

#### Módulo 3: Caixa de Entrada (Atendimento Humano)

Para "simular interação humana", você precisa da habilidade de um humano assumir a conversa.

* **Tela: "Caixa de Entrada" (Inbox)**
    * **Visual:** Similar ao WhatsApp Web ou Telegram.
    * **Coluna 1 (Lista de Chats):** Lista de conversas ativas, com a última mensagem.
    * **Coluna 2 (Chat Ativo):** A conversa selecionada.
    * **Coluna 3 (Dados do Contato):** Os mesmos dados do Módulo 2 ("Detalhe do Contato").
    * **Funcionalidades Chave:**
        * Um campo de texto para o humano **enviar uma mensagem manualmente**.
        * Botão "Pausar Bot" (para este usuário específico, para que o funil não atrapalhe o humano).
        * Botão "Reativar Bot" (devolve o controle ao funil).
        * Enviar mídias (imagens, áudio, documentos).

#### Módulo 4: Editor de Funil (O "Pipeline Faseado")

Este é o coração do seu projeto. O seu "ManyChat" ou "n8n".

* **Tela: "Lista de Funis"**
    * **Visual:** Cards de cada funil (ex: "Funil de Boas-Vindas", "Funil de Agendamento").
    * **Funcionalidades:**
        * "Criar novo funil".
        * Ativar/Desativar um funil.
        * Estatísticas (quantas pessoas entraram, quantas converteram).

* **Tela: "Editor de Funil" (O Canvas Visual)**
    * **Visual:** Um canvas de "arrastar e soltar" (como Typebot, n8n, ou o editor de fluxo do ManyChat).
    * **Funcionalidades (Os "Nós" do pipeline):**
        * **Gatilho (Trigger):** O que inicia o funil? (Ex: "Primeira mensagem", "Mensagem contém 'vendas'", "Tag 'Lead' foi adicionada").
        * **Ação: Enviar Mensagem:** Enviar texto, imagem, vídeo, áudio. (Importante: simular digitação, "typing...").
        * **Ação: Enviar Botões:** Enviar botões de resposta rápida.
        * **Lógica: Aguardar Resposta:** Espera a próxima mensagem do usuário.
        * **Lógica: Condição (IF/THEN):** O que fazer baseado na resposta? (Ex: `Se resposta contém "sim"`, `Se resposta contém "não"`).
        * **Lógica: Atraso (Delay):** Esperar X minutos/horas (para parecer humano).
        * **Ação: Adicionar/Remover Tag:** (Ex: Mover de "Lead Frio" para "Lead Quente").
        * **Ação: Notificar Humano:** Envia uma mensagem (no próprio app ou email) para um vendedor.
        * **Ação: Transferir para Funil:** Inicia outro funil.
        * **Ação: Webhook:** Envia os dados para uma API externa (ex: seu CRM, Google Calendar).

#### Módulo 5: O Funil Inteligente (A "Simulação Humana" com IA)

Para *realmente* simular um humano e agendar a reunião, seu funil não pode ser só `IF/THEN`. Ele precisa de IA. Aqui entra o **WorkersAI** (ou OpenAI, Gemini, etc.).

* **Novo "Nó" no Editor de Funil:**
    * **Lógica: "Perguntar à IA" (AI-Powered Response)**
        * **Como funciona:** Em vez de uma condição `IF/THEN`, você usa este nó.
        1.  Ele pega a mensagem do usuário.
        2.  Envia para o WorkersAI (ou outra API) junto com um **Prompt** que você define.
        3.  **Exemplo de Prompt:** "Você é um assistente de vendas. Seu único objetivo é agendar uma reunião. O usuário disse: `[Mensagem do Usuário]`. O histórico da conversa é: `[Histórico]`. O usuário está na fase `[Tag]`. Responda de forma natural, faça a próxima pergunta necessária para conseguir o Nome, Email e melhor Horário. Se já tiver tudo, proponha um horário."
        4.  O nó recebe a resposta da IA.
        5.  O nó "Enviar Mensagem" envia essa resposta da IA para o usuário.

* **Tela: "Configurações de IA"**
    * **Visual:** Campos de formulário.
    * **Funcionalidades:**
        * Campo para a chave de API (OpenAI, Cloudflare, etc.).
        * Um campo de texto grande para o "Prompt Mestre" (a personalidade base do seu bot).

---

### 3. 🗺️ Roadmap de Desenvolvimento (MVP)

Você não vai construir tudo isso de uma vez. Eu sugiro esta ordem:

1.  **MVP 1 (Prova de Conceito):**
    * Backend + Serviço de Conexão (Baileys) rodando local.
    * Tela de "Conexões" (só para gerar o QR Code e ver o status).
    * Tela de "Caixa de Entrada" (simples, só para *responder manualmente*).
    * **Objetivo:** Provar que você consegue conectar e conversar manualmente.

2.  **MVP 2 (O Bot Estático):**
    * Módulo "Editor de Funil" (com nós simples: Enviar Texto, Aguardar Resposta, Condição IF/THEN).
    * Um "Motor de Funil" no Backend que interpreta o JSON do editor e executa o funil.
    * Módulo "Contatos" (só para ver quem está em qual funil).
    * **Objetivo:** Ter um chatbot de regras funcionando.

3.  **Versão 1.0 (O Bot Inteligente):**
    * Adicionar o Módulo "Caixa de Entrada" completo (com pausa/play do bot).
    * Adicionar o "Nó de IA" (WorkersAI) no Editor de Funil.
    * Adicionar o "Nó de Webhook" (para integrar com Calendly/Google Calendar e *de fato* agendar a reunião).
    * **Objetivo:** Atingir seu objetivo final de agendamento de reunião "humano".

Este é um projeto de médio a grande porte, mas incrivelmente poderoso se bem executado. O maior desafio técnico será manter o `Serviço de Conexão` (Baileys) estável e atualizado.

Posso ajudar a detalhar a arquitetura de comunicação entre o **Backend** e o **Serviço de Conexão (Baileys)**? (Dica: Webhooks e RabbitMQ/Redis seriam seus melhores amigos aqui).

Entendido, meu amigo. Você não quer apenas *usar* uma ferramenta, você quer *construir* a sua própria plataforma, um "ManyChat-like" focado em WhatsApp Não-Oficial, com liberdade total para simular interações humanas.

Este é um projeto de software robusto e empolgante. A grande vantagem é o controle total. O grande desafio é a instabilidade da "API" (o *conector*) que você terá que gerenciar.

Para desenhar o roadmap, precisamos quebrar a aplicação em seus componentes principais (arquitetura) e depois detalhar as telas e funcionalidades de cada um.

---

### 1. 🏛️ Arquitetura de Alto Nível do Projeto

Sua aplicação não será uma coisa só (monolito). Ela será composta por, no mínimo, 3 partes:

1.  **Frontend (O "Painel"):** A aplicação web (em React, Vue, etc.) onde *você* (ou seus usuários) irá configurar tudo. É aqui que moram as "telas".
2.  **Backend (A "Inteligência"):** Uma API (em Node.js, Python, etc.) que gerencia usuários, salva os funis, armazena o histórico de chat e decide o que fazer.
3.  **Serviço de Conexão (O "Conector"):** Um ou mais serviços separados (provavelmente em Node.js usando **Baileys**) que mantêm a conexão *real* com o WhatsApp Web. É a parte instável.

**Por que separar o "Conector"?** Porque ele vai travar e cair. Você precisa poder reiniciá-lo, ou até mesmo ter *vários* (um para cada número de WhatsApp conectado), sem derrubar seu Backend ou Frontend.

---

### 2. 💻 Telas e Funcionalidades Detalhadas (O Roadmap de Features)

Aqui está o detalhamento das "telas" (módulos) que você precisará construir no seu **Frontend** e as funcionalidades de **Backend** correspondentes.

#### Módulo 1: Gerenciamento de Conexões (O Onboarding)

É a primeira coisa que seu usuário vê.

* **Tela: "Instâncias" ou "Conexões"**
    * **Visual:** Uma lista (cards ou tabela) de todas as contas de WhatsApp conectadas.
    * **Funcionalidades:**
        * Botão "Adicionar nova conexão".
        * Status da conexão (ex: `Conectado`, `Aguardando leitura do QR`, `Desconectado`).
        * Botão "Reconectar" (que gera um novo QR Code).
        * Botão "Desconectar" (faz o logout).

* **Tela: "Conectar Novo WhatsApp" (Modal ou Página)**
    * **Visual:** Um QR Code grande.
    * **Funcionalidade (Backend/Conector):**
        1.  O Frontend pede ao Backend: "quero um novo QR Code".
        2.  O Backend inicia uma nova instância do seu `Serviço de Conexão` (Baileys).
        3.  O Baileys gera um QR Code.
        4.  O Backend envia esse QR Code para o Frontend exibir.
        5.  O Frontend fica "ouvindo" (via WebSocket ou polling) o status: "QR Lido", "Conectado com Sucesso".

#### Módulo 2: Contatos (Mini-CRM)

Onde você gerencia as pessoas que falaram com o bot.

* **Tela: "Lista de Contatos"**
    * **Visual:** Uma tabela com: `Nome`, `Número`, `Tags` (ex: "Lead Frio", "Agendado"), `Responsável` (se tiver múltiplos usuários).
    * **Funcionalidades:**
        * Pesquisar contatos.
        * Filtrar por tags.
        * Adicionar/Remover tags em massa.
        * Importar/Exportar contatos.

* **Tela: "Detalhe do Contato"**
    * **Visual:** Dividida em duas colunas.
    * **Coluna 1 (Dados):**
        * Campos do contato: `Nome`, `Email`, `Empresa`, etc. (Campos personalizados são importantes).
        * Lista de `Tags` do contato.
        * Notas internas.
    * **Coluna 2 (Histórico):**
        * O histórico completo da conversa (mensagens do bot e do usuário).

#### Módulo 3: Caixa de Entrada (Atendimento Humano)

Para "simular interação humana", você precisa da habilidade de um humano assumir a conversa.

* **Tela: "Caixa de Entrada" (Inbox)**
    * **Visual:** Similar ao WhatsApp Web ou Telegram.
    * **Coluna 1 (Lista de Chats):** Lista de conversas ativas, com a última mensagem.
    * **Coluna 2 (Chat Ativo):** A conversa selecionada.
    * **Coluna 3 (Dados do Contato):** Os mesmos dados do Módulo 2 ("Detalhe do Contato").
    * **Funcionalidades Chave:**
        * Um campo de texto para o humano **enviar uma mensagem manualmente**.
        * Botão "Pausar Bot" (para este usuário específico, para que o funil não atrapalhe o humano).
        * Botão "Reativar Bot" (devolve o controle ao funil).
        * Enviar mídias (imagens, áudio, documentos).

#### Módulo 4: Editor de Funil (O "Pipeline Faseado")

Este é o coração do seu projeto. O seu "ManyChat" ou "n8n".

* **Tela: "Lista de Funis"**
    * **Visual:** Cards de cada funil (ex: "Funil de Boas-Vindas", "Funil de Agendamento").
    * **Funcionalidades:**
        * "Criar novo funil".
        * Ativar/Desativar um funil.
        * Estatísticas (quantas pessoas entraram, quantas converteram).

* **Tela: "Editor de Funil" (O Canvas Visual)**
    * **Visual:** Um canvas de "arrastar e soltar" (como Typebot, n8n, ou o editor de fluxo do ManyChat).
    * **Funcionalidades (Os "Nós" do pipeline):**
        * **Gatilho (Trigger):** O que inicia o funil? (Ex: "Primeira mensagem", "Mensagem contém 'vendas'", "Tag 'Lead' foi adicionada").
        * **Ação: Enviar Mensagem:** Enviar texto, imagem, vídeo, áudio. (Importante: simular digitação, "typing...").
        * **Ação: Enviar Botões:** Enviar botões de resposta rápida.
        * **Lógica: Aguardar Resposta:** Espera a próxima mensagem do usuário.
        * **Lógica: Condição (IF/THEN):** O que fazer baseado na resposta? (Ex: `Se resposta contém "sim"`, `Se resposta contém "não"`).
        * **Lógica: Atraso (Delay):** Esperar X minutos/horas (para parecer humano).
        * **Ação: Adicionar/Remover Tag:** (Ex: Mover de "Lead Frio" para "Lead Quente").
        * **Ação: Notificar Humano:** Envia uma mensagem (no próprio app ou email) para um vendedor.
        * **Ação: Transferir para Funil:** Inicia outro funil.
        * **Ação: Webhook:** Envia os dados para uma API externa (ex: seu CRM, Google Calendar).

#### Módulo 5: O Funil Inteligente (A "Simulação Humana" com IA)

Para *realmente* simular um humano e agendar a reunião, seu funil não pode ser só `IF/THEN`. Ele precisa de IA. Aqui entra o **WorkersAI** (ou OpenAI, Gemini, etc.).

* **Novo "Nó" no Editor de Funil:**
    * **Lógica: "Perguntar à IA" (AI-Powered Response)**
        * **Como funciona:** Em vez de uma condição `IF/THEN`, você usa este nó.
        1.  Ele pega a mensagem do usuário.
        2.  Envia para o WorkersAI (ou outra API) junto com um **Prompt** que você define.
        3.  **Exemplo de Prompt:** "Você é um assistente de vendas. Seu único objetivo é agendar uma reunião. O usuário disse: `[Mensagem do Usuário]`. O histórico da conversa é: `[Histórico]`. O usuário está na fase `[Tag]`. Responda de forma natural, faça a próxima pergunta necessária para conseguir o Nome, Email e melhor Horário. Se já tiver tudo, proponha um horário."
        4.  O nó recebe a resposta da IA.
        5.  O nó "Enviar Mensagem" envia essa resposta da IA para o usuário.

* **Tela: "Configurações de IA"**
    * **Visual:** Campos de formulário.
    * **Funcionalidades:**
        * Campo para a chave de API (OpenAI, Cloudflare, etc.).
        * Um campo de texto grande para o "Prompt Mestre" (a personalidade base do seu bot).

---

### 3. 🗺️ Roadmap de Desenvolvimento (MVP)

Você não vai construir tudo isso de uma vez. Eu sugiro esta ordem:

1.  **MVP 1 (Prova de Conceito):**
    * Backend + Serviço de Conexão (Baileys) rodando local.
    * Tela de "Conexões" (só para gerar o QR Code e ver o status).
    * Tela de "Caixa de Entrada" (simples, só para *responder manualmente*).
    * **Objetivo:** Provar que você consegue conectar e conversar manualmente.

2.  **MVP 2 (O Bot Estático):**
    * Módulo "Editor de Funil" (com nós simples: Enviar Texto, Aguardar Resposta, Condição IF/THEN).
    * Um "Motor de Funil" no Backend que interpreta o JSON do editor e executa o funil.
    * Módulo "Contatos" (só para ver quem está em qual funil).
    * **Objetivo:** Ter um chatbot de regras funcionando.

3.  **Versão 1.0 (O Bot Inteligente):**
    * Adicionar o Módulo "Caixa de Entrada" completo (com pausa/play do bot).
    * Adicionar o "Nó de IA" (WorkersAI) no Editor de Funil.
    * Adicionar o "Nó de Webhook" (para integrar com Calendly/Google Calendar e *de fato* agendar a reunião).
    * **Objetivo:** Atingir seu objetivo final de agendamento de reunião "humano".

Este é um projeto de médio a grande porte, mas incrivelmente poderoso se bem executado. O maior desafio técnico será manter o `Serviço de Conexão` (Baileys) estável e atualizado.

Posso ajudar a detalhar a arquitetura de comunicação entre o **Backend** e o **Serviço de Conexão (Baileys)**? (Dica: Webhooks e RabbitMQ/Redis seriam seus melhores amigos aqui).

Excelente escolha\! Aceitar a dica sobre RabbitMQ e Redis é o que separa um "projeto de fim de semana" de uma "plataforma escalável".

Você está correto: usar Webhooks diretos ou chamadas HTTP/WebSocket entre o `Backend` e o `Serviço de Conexão` (Baileys) é uma armadilha. Se o Conector cair, o Backend não sabe. Se o Backend escalar, os Conectores não sabem para qual instância ligar.

Vamos usar **RabbitMQ** para **Mensageria Assíncrona** (o "carteiro") e **Redis** para **Gerenciamento de Estado** (a "memória de curto prazo").

Aqui está o detalhamento da arquitetura de comunicação.

-----

### Visão Geral da Arquitetura

Sua plataforma terá 4 componentes principais se comunicando:

1.  **`Backend` (A Lógica):** Sua API principal. Onde os funis são definidos. (Ex: Node.js/Express, Python/Django).
2.  **`Serviço de Conexão` (O "Operador"):** Uma (ou várias) instâncias do Baileys. Cada instância é um processo separado cuidando de *um* número de WhatsApp.
3.  **`RabbitMQ` (O "Correio"):** O *Message Broker*. Ele desacopla o Backend dos Conectores. Eles nunca conversam diretamente entre si; eles apenas enviam e recebem "cartas" (mensagens) do RabbitMQ.
4.  **`Redis` (A "Memória"):** Um banco de dados chave-valor ultrarrápido. Ele armazena o *estado atual* de tudo.

-----

### Fluxo 1: Mensagem CHEGANDO (Usuário do WhatsApp -\> Backend)

Este é o fluxo "RX" (Receive). O objetivo é pegar a mensagem do Baileys e entregá-la ao seu Backend da forma mais confiável possível.

**Método: Fila de Trabalho (Work Queue)**

1.  **O Usuário** envia "Olá" para o número A, que é gerenciado pelo `Conector-A`.
2.  **O `Conector-A` (Baileys)** recebe a mensagem. Em vez de fazer um HTTP POST no seu backend (o que pode falhar), ele formata a mensagem em um JSON:
    ```json
    {
      "instance_id": "inst_123_do_alan",
      "timestamp": 1678886400,
      "from_number": "554199998888",
      "message_type": "text",
      "data": { "text": "Olá" }
    }
    ```
3.  **O `Conector-A`** *publica* (envia) essa mensagem JSON para uma *única fila* no RabbitMQ. Vamos chamá-la de: **`queue-rx-incoming`** (Fila de Recebimento).
4.  **Múltiplos `Conectores`** (Conector-A, Conector-B, Conector-C) fazem a mesma coisa. Todos publicam suas mensagens recebidas na *mesma* fila `queue-rx-incoming`.
5.  **O seu `Backend`** (que pode ter várias instâncias rodando para escalar) atua como um *Consumidor* dessa fila.
6.  O RabbitMQ entrega as mensagens da fila `queue-rx-incoming` uma a uma para os workers do seu Backend (usando o padrão "Round Robin").
7.  **O `Backend`** recebe o JSON, processa a lógica do funil (ex: "Ah, o usuário 554199998888 disse 'Olá', preciso responder 'Oi, tudo bem?'"), e decide que precisa *enviar* uma resposta.

**Por que isso é bom?**

  * **Resiliência:** Se o seu `Backend` estiver offline ou sobrecarregado, as mensagens não se perdem. Elas ficam enfileiradas no RabbitMQ esperando para serem processadas.
  * **Escalabilidade:** Você pode ter 1000 Conectores e 10 workers de Backend. O RabbitMQ gerencia a distribuição da carga de trabalho perfeitamente.

-----

### Fluxo 2: Mensagem SAINDO (Backend -\> Usuário do WhatsApp)

Este é o fluxo "TX" (Transmit). É a parte mais complexa e crucial. O Backend precisa dizer ao `Conector-A` (e *apenas* ao `Conector-A`) para enviar uma mensagem.

**Método: Troca de Tópico (Topic Exchange)**

1.  **O `Backend`** decide que precisa enviar "Oi, tudo bem?" para o usuário `554199998888`, que pertence à instância `inst_123_do_alan`.
2.  O `Backend` *não sabe* onde o `Conector-A` (que gerencia a `inst_123_do_alan`) está rodando. E não precisa saber.
3.  O `Backend` *publica* uma mensagem JSON para uma **Exchange** (um "distribuidor") no RabbitMQ. Vamos chamá-la de: **`exchange-tx-outgoing`**.
4.  A mensagem é publicada com uma "chave de roteamento" (routing key) **única para o destinatário**. A chave será: **`send.inst_123_do_alan`**.
    ```json
    // Publicado na exchange 'exchange-tx-outgoing'
    // com a chave de roteamento 'send.inst_123_do_alan'
    {
      "target_number": "554199998888",
      "message_type": "text",
      "data": { "text": "Oi, tudo bem?", "simulate_typing": true }
    }
    ```
5.  **Mágica do RabbitMQ:** Quando o `Conector-A` (o processo Baileys da `inst_123_do_alan`) iniciou, ele fez duas coisas:
      * Criou uma *fila exclusiva* só para ele (ex: `queue_inst_123_do_alan_temp`).
      * Ele disse ao RabbitMQ: "Por favor, envie todas as mensagens da exchange `exchange-tx-outgoing` que tenham a chave `send.inst_123_do_alan` para a minha fila exclusiva." (Isso se chama *binding*).
6.  **O RabbitMQ** recebe a mensagem do `Backend` na exchange, vê a chave `send.inst_123_do_alan`, e a roteia *exclusivamente* para a fila do `Conector-A`.
7.  **O `Conector-A`** está *escutando* (consumindo) sua fila exclusiva, recebe o JSON e executa a função do Baileys para enviar a mensagem.

**Por que isso é bom?**

  * **Desacoplamento Total:** O Backend só precisa saber o `instance_id`. Ele não sabe IP, porta ou se o Conector está rodando em Docker, Kubernetes ou na máquina de um cliente.
  * **Entrega Direcionada:** Garante que apenas o processo Baileys correto receba a ordem de envio.
  * **Offline Handling:** Se o `Conector-A` estiver reiniciando (porque o Baileys quebrou), a mensagem "Oi, tudo bem?" fica esperando na fila exclusiva dele. Quando ele voltar, ele a processará.

-----

### Fluxo 3: O Papel do REDIS (Gerenciamento de Estado)

Se o RabbitMQ é o "Correio", o Redis é o "Bloco de Notas" / "Memória de Curto Prazo" que todos podem ler e escrever rapidamente.

**O Redis deve armazenar dados voláteis (que mudam rápido):**

1.  **Status da Conexão:**

      * O `Serviço de Conexão` (Baileys) deve constantemente atualizar seu status no Redis.
      * Ex: `SET status:inst_123_do_alan "CONNECTED"`
      * Ex: `SET status:inst_456 "AWAITING_QR_CODE"`
      * Quando seu `Frontend` (Painel) carregar, ele lê do Redis (via Backend) para mostrar os status em tempo real.

2.  **Trava de Conversa (Onde o usuário está no funil):**

      * Isso é **CRUCIAL** para você.
      * Quando o `Backend` recebe uma mensagem (Fluxo 1), ele consulta o Redis: "Qual é o estado atual do `554199998888`?"
      * Redis: `GET state:554199998888` -\> (retorna) `"funil_agendamento:etapa_2_pedindo_email"`
      * O `Backend` sabe que a resposta do usuário é o email. Ele processa, e atualiza o estado:
      * Redis: `SET state:554199998888 "funil_agendamento:etapa_3_pedindo_data"`

3.  **Controle de Atendimento Humano (Pausar o Bot):**

      * Quando o humano clica em "Assumir Conversa" no seu painel (Módulo 3 da resposta anterior):
      * O `Backend` escreve no Redis: `SET bot_control:554199998888 "PAUSED_BY_HUMAN"`
      * Agora, no Fluxo 1, quando o `Backend` recebe uma mensagem, ele primeiro checa o Redis. Se estiver "PAUSED", ele *ignora* o funil e apenas salva a mensagem no histórico.

### Resumo da Arquitetura

| Componente | Ferramenta | Responsabilidade Principal |
| :--- | :--- | :--- |
| **Backend** | Node.js / Python | Lógica de funil, API para o Frontend, consumir da `queue-rx-incoming`, publicar na `exchange-tx-outgoing`. |
| **Conector** | Node.js (Baileys) | Manter conexão com o WhatsApp, publicar na `queue-rx-incoming`, consumir da *sua fila exclusiva* (vinda da exchange). |
| **Mensageria** | RabbitMQ | Roteamento de mensagens (RX e TX), resiliência, desacoplamento. |
| **Estado** | Redis | Status da conexão (`status:inst_123`), Posição do usuário no funil (`state:user_number`). |

Este design é como as grandes plataformas (Twilio, Zenvia) operam por baixo dos panos. É robusto, escalável e resiliente à natureza instável das conexões não-oficiais.

O próximo passo lógico seria desenhar os modelos de dados (schemas) para o seu banco de dados principal (PostgreSQL/MongoDB) onde você armazenará os funis, contatos e histórico de chat. Quer explorar isso?

Vamos lá, meu amigo\! Esta é a fundação do seu projeto. Uma boa modelagem de banco de dados é o que vai permitir que seu sistema seja rápido, organizado e fácil de manter.

Como você mencionou, temos duas grandes rotas: **PostgreSQL (SQL)** ou **MongoDB (NoSQL)**.

  * **MongoDB (NoSQL):** Seria mais "livre". Você jogaria documentos (JSONs) lá dentro. É muito rápido para prototipar. A coleção `contacts` seria simples (você poderia "embedar" tags e campos direto no documento do contato). A coleção `messages` também seria muito natural. O *problema* é manter a consistência. O que acontece se você deletar um `workspace` e esquecer de deletar os `contacts` e `funnels` dele?
  * **PostgreSQL (SQL):** É mais "rígido", mas de um jeito bom. Ele nos força a organizar os dados com *relações* (Foreign Keys). Isso garante a **integridade referencial** (você não consegue ter uma mensagem sem um contato, ou um contato sem um workspace).

**Minha Recomendação: PostgreSQL com `jsonb`**

Vamos usar o PostgreSQL, mas vamos pegar emprestada a melhor parte do NoSQL: o tipo `jsonb`. Com ele, teremos a rigidez e segurança do SQL para as relações e a flexibilidade do JSON para dados que não têm uma estrutura fixa (como a definição do seu funil ou os campos personalizados).

Aqui está o desenho dos "schemas" (tabelas) que você precisará.

-----

### 1\. 🏢 Módulo de Contas (Workspace e Usuários)

Precisamos de um sistema multi-usuário, onde você pode ter vários "workspaces" (ou "empresas") e vários usuários (agentes) dentro de cada um.

#### `workspaces` (As "Contas" dos seus clientes)

```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID único do workspace
    name VARCHAR(100) NOT NULL,                   -- Ex: "Embracon - Vendas"
    owner_id UUID NOT NULL,                        -- Chave estrangeira para 'users', quem é o dono
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `users` (Usuários da plataforma: Admins, Agentes)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,            -- Para login
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,           -- Criptografado!
    created_at TIMESTAMPTZ DEFAULT now()
);
```

*Note: Adicione a `owner_id` em `workspaces` depois que a tabela `users` for criada.*

#### `workspace_members` (Tabela-pivô: Quem pertence a qual workspace)

```sql
CREATE TABLE workspace_members (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'agent', -- Ex: 'admin', 'agent'
    PRIMARY KEY (user_id, workspace_id)      -- Um usuário só pode estar 1x em cada workspace
);
```

-----

### 2\. 🔌 Módulo de Conexões (Instâncias do WhatsApp)

Onde você armazena as contas de WhatsApp que foram conectadas via Baileys.

#### `instances` (As conexões/números de WhatsApp)

```sql
CREATE TABLE instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Este é o 'instance_id' que usamos na arquitetura!
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                   -- Ex: "Bot Vendas 1"
    phone_number VARCHAR(30),                     -- O número (quando já conectado)
    -- O ESTADO (CONNECTED, AWAITING_QR) fica no REDIS.
    -- O SESSION_DATA (tokens) fica no volume do Conector Baileys.
    -- Este banco é só para a configuração.
    created_at TIMESTAMPTZ DEFAULT now()
);
```

-----

### 3\. 👥 Módulo de Contatos (O Mini-CRM)

Os leads que conversam com seus bots.

#### `tags` (Etiquetas para organizar contatos)

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#CCCCCC',           -- Ex: "#FF0000"
    UNIQUE(workspace_id, name)                    -- Não pode ter tags com mesmo nome no workspace
);
```

#### `contacts` (Os leads/clientes finais)

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    phone_number VARCHAR(30) NOT NULL,            -- Número do lead
    name VARCHAR(150),                            -- Nome (do perfil do WA ou salvo)
    
    -- Aqui está a mágica do 'jsonb' para campos personalizados!
    -- Você pode salvar: {"email": "...", "cidade": "...", "funil_etapa": "3"}
    custom_data JSONB DEFAULT '{}' NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(instance_id, phone_number)             -- Um número só pode ser 1 contato por instância
);
```

#### `contact_tags` (Tabela-pivô: Quais tags um contato possui)

```sql
CREATE TABLE contact_tags (
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);
```

-----

### 4\. 🧠 Módulo de Funis (O "Pipeline Faseado")

O coração do seu projeto.

#### `funnels` (Os fluxos de conversa)

```sql
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,                   -- Ex: "Funil de Agendamento"
    
    -- O CAMPO MAIS IMPORTANTE
    -- Armazena o JSON gigante do seu editor visual (nós, conexões, etc.)
    definition JSONB DEFAULT '{}' NOT NULL,
    
    -- Gatilhos simples
    trigger_keyword VARCHAR(100),                 -- Ex: "vendas", "agendar"
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

-----

### 5\. 💬 Módulo de Mensagens (Caixa de Entrada e Histórico)

Onde o chat *realmente* acontece. Esta tabela será a **maior e mais acessada** do seu banco.

#### `messages`

```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,                     -- Um número sequencial é bom para ordem
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    
    -- 'IN' (do usuário para você), 'OUT' (de você para o usuário)
    message_direction VARCHAR(3) NOT NULL CHECK (message_direction IN ('IN', 'OUT')),
    
    message_type VARCHAR(20) NOT NULL,            -- 'text', 'image', 'audio', 'button_reply'
    
    -- O conteúdo da mensagem (texto, URL da mídia, etc.)
    message_data JSONB NOT NULL,
    
    -- Rastreabilidade: Quem/O que enviou esta mensagem?
    agent_id UUID REFERENCES users(id),           -- NULL se for bot, ID do agente se for humano
    funnel_id UUID REFERENCES funnels(id),        -- NULL se for humano, ID do funil se for bot
    
    timestamp TIMESTAMPTZ DEFAULT now()           -- Quando a mensagem foi recebida/enviada
);

-- ESSENCIAL: Índices para carregar o chat rápido
CREATE INDEX idx_messages_contact_id ON messages (contact_id);
CREATE INDEX idx_messages_timestamp ON messages (timestamp);
```

### Alternativa MongoDB (Para Comparação)

Só para você ver, em Mongo, a coleção `contacts` seria muito mais simples (mas menos "segura" em termos de dados):

```json
// Coleção "contacts" no MongoDB
{
  "_id": ObjectId("..."),
  "workspace_id": ObjectId("..."),
  "instance_id": ObjectId("..."),
  "phone_number": "554199998888",
  "name": "Alan Evangelista",
  // Tags são apenas um array de strings (simples, mas sem validação)
  "tags": ["Lead Quente", "Dev"],
  // Campos personalizados são livres
  "custom_data": {
    "email": "alan@embracon.com.br",
    "cidade": "Fazenda Rio Grande",
    "funil_etapa": "aguardando_horario"
  },
  "created_at": "..."
}
```

Como pode ver, o modelo Postgres (SQL) com `jsonb` em `contacts.custom_data` e `funnels.definition` lhe dá o melhor dos dois mundos: a estrutura relacional E a liberdade do JSON.

O próximo passo é definir a "camada" que fica entre o banco e o mundo exterior. Você gostaria de detalhar a **API (os endpoints)** que seu `Backend` precisaria ter para gerenciar esses dados? (Ex: `POST /funnels`, `GET /contacts/:id`, etc.)

Meu amigo, **agora sim**. Você não está mais apenas explorando, você está conectando os pontos. O que você me trouxe (a arquitetura, os módulos 1-5, o RabbitMQ/Redis) é a *fundação de engenharia correta*.

O que você adicionou agora (ManyChat, Odoo, Agentes, WorkersAI, funil de agendamento) é a *visão de negócio* e a *inteligência* que vão rodar em cima dessa fundação.

Você está 100% correto. O terminal é só para provar que a conexão funciona. O QR Code *deve* estar no Frontend. E sim, tudo deve ser multi-instância e multi-agente.

Vamos montar o **"Desenho de Engenharia Perfeito"** fundindo tudo isso.

-----

### 1\. 🏛️ A Arquitetura Conceitual (O Mapa Completo)

Este é o desenho do seu ecossistema. Note os novos atores que você trouxe: **Atendentes**, **WorkersAI** e **Odoo**.

```
+------------------+
|                  |
|   USUÁRIO (APP)  <---- (WhatsApp) ----> [SERVIÇO DE CONEXÃO (Baileys)]
|                  |                         ^  |
+------------------+                         |  | (RabbitMQ)
                                             |  v
+------------------+     (API HTTP/S)     +---------+     (RabbitMQ)     +------------------+
|                  |                      |         |                      |                  |
|   FRONTEND       <----------------------> BACKEND | <------------------> | REDIS (Estado)   |
| (React/Vue)      |                      | (API)   |                      | (Sessão, Fila,  |
| - Telas/Módulos  |                      +---------+                      |  Controle do Bot) |
| - Caixa de Entrada|                         |  |                         +------------------+
| - Editor de Funil |                         |  | (SQL)
|                  |                         |  v
+------------------+                         +------------------+
|     ATENDENTE    |                         | POSTGRESQL (BD)  |
| (Humano)         |                         | (Contatos, Msgs, |
|                  |                         |  Funis, Agentes) |
+------------------+                         +------------------+
                                                 |
                                                 | (API Externa)
                                                 v
                                 [WorkersAI (IA)]   [Odoo (CRM)]
```

-----

### 2\. 💻 O Roadmap de Módulos & Telas (A Versão "Upgrade")

Aqui está a lista de módulos (telas) refinada, incorporando **todas** as suas novas exigências.

#### Módulo 1: Gestão de Conexões (Instâncias)

  * **Telas:** `Conexões`, `Modal de Conexão`.
  * **Funções Base:**
      * Listar todas as instâncias (números de WA) do workspace.
      * Ver status (`Conectado`, `Desconectado`, `Aguardando QR`). O status é lido do **Redis** (`status:inst_123`).
      * Botão "Adicionar Instância" -\> Abre o modal `Modal de Conexão`.
      * **Tela (Modal de Conexão):**
          * O Frontend pede ao Backend: "preciso de um QR Code para uma nova instância".
          * O Backend comanda (via RabbitMQ) o *Sistema de Conectores* para iniciar um novo processo Baileys.
          * Esse processo gera o QR Code e informa o Backend (via RabbitMQ).
          * O Backend envia o QR Code para o Frontend via WebSocket/Polling.
          * O Frontend exibe o QR Code.
      * Botão "Remover Instância" (Desconecta e apaga).

#### Módulo 2: Gestão de Equipe (Atendentes)

  * **Telas:** `Equipe`, `Funções e Permissões`.
  * **Funções (Feature Nova):**
      * Listar todos os `users` (atendentes) do `workspace`.
      * Convidar novo atendente (por email).
      * Definir permissões (ex: "Admin", "Agente", "Supervisor").
      * Criar "Departamentos" ou "Times" (ex: "Vendas", "Suporte"). Isso é crucial para o roteamento.

#### Módulo 3: Contatos e CRM Interno

  * **Telas:** `Lista de Contatos`, `Detalhe do Contato`.
  * **Funções (Upgrade):**
      * Listar todos os contatos de *todas* as instâncias.
      * Filtrar por `Tag`, `Atendente Responsável`, `Instância (Número)`.
      * **Tela (Detalhe do Contato):**
          * Coluna 1 (Dados): `Nome`, `Número`, `Email`, `Atendente Responsável`.
          * Campos Personalizados (do `jsonb`): `Cidade`, `Empresa`, etc.
          * **Campo Chave (Novo):** `Fase do Funil` (ex: "Qualificação", "Aguardando Agendamento", "Agendado", "Cliente"). Este campo é atualizado pelo funil (Módulo 5).
          * `Tags` (ex: "lead\_frio", "oportunidade").

#### Módulo 4: Caixa de Entrada Unificada (Atendimento Humano)

  * **Telas:** `Caixa de Entrada (Inbox)`.
  * **Funções (Upgrade Crítico):**
      * **Visual:** 3 colunas (Lista de Chats, Chat Ativo, Dados do Contato).
      * **Função:** As mensagens da `queue-rx-incoming` (RabbitMQ) chegam no Backend, são salvas no **PostgreSQL** e exibidas no Frontend em tempo real (via WebSocket).
      * **Garantia de Banimento:** Como as mensagens são salvas no *seu* PostgreSQL, **mesmo que a conta do WA seja banida, o histórico da conversa está 100% salvo** e visível aqui.
      * **Roteamento (Novo):**
          * Novos chats caem numa fila "Não Atribuído".
          * Um supervisor ou o próprio agente pode "Pegar" o chat.
          * Um funil pode *automaticamente* atribuir um chat a um "Departamento" (ex: se o usuário digitou "vendas").
      * **Pausar Bot:** O botão "Pausar Bot" (que seta o `bot_control:numero` no Redis) é a funcionalidade mais importante. Permite ao humano assumir sem que o bot atrapalhe.
      * **Enviar Mensagem:** O atendente digita, o Frontend manda para o Backend (API), o Backend publica na `exchange-tx-outgoing` (RabbitMQ) com a `routing_key` correta.

#### Módulo 5: Editor de Funil Visual (Flow Builder)

  * **Telas:** `Lista de Funis`, `Editor de Funil (Canvas)`.
  * **Funções (O Cérebro - Upgrade com IA e CRM):**
      * Canvas visual para arrastar e soltar "Nós".
      * **Nós Essenciais (Baseado no ManyChat):**
          * `Gatilho`: (Keyword, Primeira Mensagem, Tag Adicionada).
          * `Enviar Mensagem`: (Texto, Imagem, Áudio, Botões, Listas).
          * `Aguardar Resposta`: (Salva a resposta em uma variável).
          * `Condição (IF/THEN)`: (Verifica a resposta/variável).
          * `Atraso`: (Simula digitação e espera humana).
          * `Ação: Adicionar Tag`.
          * `Ação: Atribuir Atendente`: (Manda o chat para um agente/departamento no Módulo 4).
      * **Nós Inteligentes (O "Upgrade"):**
          * **Nó: `Qualificar com IA` (WorkersAI):**
              * Pega a mensagem do usuário (ex: "queria saber o preço").
              * Envia para o **WorkersAI** com um prompt: "Você é um SDR. O usuário disse: `[msg]`. O histórico é `[hist]`. A fase dele é `[fase_funil]`. Seu objetivo é coletar NOME, EMAIL e confirmar se ele quer AGENDAR. Responda de forma natural."
              * A IA responde (ex: "Claro\! Para qual e-mail posso enviar a proposta?").
              * O funil envia essa resposta da IA.
              * O funil entra em loop nesse nó até que a IA retorne um JSON indicando "Qualificação Concluída".
          * **Nó: `Enviar para Odoo` (Integração):**
              * Quando o funil ou a IA identificam que o lead está qualificado (ex: `fase_funil` == "Agendado").
              * Este nó pega os dados (Nome, Email, Telefone, Histórico) e faz um POST na API do **Odoo** para criar um novo "Lead" ou "Oportunidade".

-----

### 3\. 🗺️ O Roadmap de Implementação (MVP 2.0)

A ordem que você tinha estava boa. Vamos refiná-la com as novas features:

1.  **MVP 1 (Prova de Conceito):**

      * **Telas:** Módulo 1 (Conexões) + Módulo 4 (Caixa de Entrada - *super simples*).
      * **Infra:** Backend, 1 Conector (Baileys), RabbitMQ, Redis, Postgres.
      * **Objetivo:** Conectar 1 número pelo Frontend (QR Code) e ser capaz de enviar/receber mensagens *manualmente* pela Caixa de Entrada. **Prova que a arquitetura de mensageria (Fluxo RX/TX) funciona.**

2.  **MVP 2 (O Bot de Regras):**

      * **Telas:** Módulo 5 (Editor de Funil - *simples*) + Módulo 3 (Contatos).
      * **Funções:** Implementar o "Motor de Funil" no Backend.
      * **Nós:** `Gatilho (Keyword)`, `Enviar Mensagem`, `Condição (IF/THEN)`.
      * **Objetivo:** Criar um funil simples (ex: "Olá" -\> "Tudo bem?"). **Prova que o motor de funil e o `state:numero` no Redis funcionam.**

3.  **Versão 1.0 (O Produto Mínimo Viável - O seu objetivo):**

      * **Telas:** Módulo 2 (Gestão de Equipe) + Módulo 4 (Caixa de Entrada *completa*).
      * **Funções:**
          * Adicionar Agentes.
          * Roteamento de chats (manual e automático).
          * Botão "Pausar Bot".
      * **Nós do Funil:** Adicionar o nó `Qualificar com IA (WorkersAI)` e o nó `Enviar para Odoo`.
      * **Objetivo:** Ter um sistema onde múltiplos agentes podem atender múltiplos números, e o bot de IA qualifica leads e os envia para o Odoo para agendamento.

Este é o desenho completo. É uma plataforma robusta, escalável e que atende exatamente ao problema de negócio que você descreveu.

O próximo passo lógico é definir a **API (os endpoints)** que o Backend precisará expor para o Frontend consumir, começando pelo Módulo 1.

Posso detalhar os endpoints da API REST/WebSocket necessários para o **MVP 1** (Módulo 1: Conexões e Módulo 4: Chat)?

Com certeza. Este é o "desenho" (o contrato da API) que seu `Frontend` (React/Vue) usará para conversar com seu `Backend` (Node/API).

Este design é dividido em duas partes:

1.  **API REST (HTTP):** Usada para **buscar dados** (carregar histórico, listas) e **iniciar ações** (criar uma conexão).
2.  **API WebSocket (Real-Time):** Usada para **eventos em tempo real** (receber QR code, receber nova mensagem, enviar nova mensagem).

O `Backend` rodará na porta `3001` (ex: `http://localhost:3001`) e o `Frontend` na `3000`.

-----

### 1\. Autenticação (Necessário antes de tudo)

Seu `Frontend` precisará se autenticar para provar quem ele é.

#### `POST /api/v1/auth/login`

  * **O que faz:** Autentica um usuário (atendente) na plataforma.
  * **Body (JSON):** `{ "email": "...", "password": "..." }`
  * **Resposta:** `{ "access_token": "jwt.token.aqui" }`
  * **Ação:** O `Frontend` deve salvar este token e enviá-lo em *todas* as futuras requisições no Header `Authorization: Bearer jwt.token.aqui`.

-----

### 2\. Módulo 1: Gerenciamento de Conexões (MVP 1)

O fluxo para adicionar um novo número de WhatsApp.

#### API REST (Para carregar dados e iniciar ações)

#### `GET /api/v1/instances`

  * **O que faz:** Lista todas as conexões (números de WA) do workspace.
  * **Resposta:**
    ```json
    [
      {
        "id": "inst_123",
        "name": "Bot Vendas 1",
        "status": "CONNECTED", // LIDO DO REDIS
        "phone_number": "554199998888"
      },
      {
        "id": "inst_456",
        "name": "Bot Suporte",
        "status": "AWAITING_QR_CODE" // LIDO DO REDIS
      }
    ]
    ```

#### `POST /api/v1/instances`

  * **O que faz:** Inicia o processo de criação de uma nova conexão.
  * **Body (JSON):** `{ "name": "Minha Nova Conexão" }`
  * **Ação do Backend:**
    1.  Cria a `instance` no **PostgreSQL**.
    2.  Publica uma mensagem no **RabbitMQ** mandando o `Serviço de Conexão` "subir" um novo processo Baileys para este ID.
  * **Resposta:** `{ "id": "inst_789", "name": "Minha Nova Conexão", "status": "PENDING" }`

#### `DELETE /api/v1/instances/:instanceId`

  * **O que faz:** Desconecta e remove uma instância.
  * **Ação do Backend:** Manda uma mensagem (via RabbitMQ) para o `Conector` desligar e apaga a sessão.

#### API WebSocket (Para eventos em tempo real)

O `Frontend` deve se conectar ao servidor WebSocket do `Backend` (ex: `ws://localhost:3001`) logo após o login.

**Evento: `instance:qr_code` (Backend -\> Frontend)**

  * **Quando acontece:** Logo após o `POST /api/v1/instances`, o `Conector` gera o QR code, envia ao `Backend` (via RabbitMQ), e o `Backend` o retransmite para o `Frontend`.
  * **Payload (JSON):**
    ```json
    {
      "instanceId": "inst_789",
      "qr": "data:image/png;base64,iVBORw0KGgoAAAA... (string base64 do QR code)"
    }
    ```
  * **Ação do Frontend:** Exibe a imagem do QR code no "Modal de Conexão".

**Evento: `instance:status_change` (Backend -\> Frontend)**

  * **Quando acontece:** Quando o status de uma conexão muda (usuário leu o QR, celular desconectou, etc.).
  * **Payload (JSON):**
    ```json
    {
      "instanceId": "inst_789",
      "status": "CONNECTED",
      "phone_number": "554198887777"
    }
    ```
  * **Ação do Frontend:** Fecha o modal do QR code e atualiza a lista de conexões (o item `inst_789` agora está `CONNECTED`).

-----

### 3\. Módulo 4: Caixa de Entrada (MVP 1)

O fluxo para conversar manualmente.

#### API REST (Para carregar histórico)

#### `GET /api/v1/chats`

  * **O que faz:** Pega a "Lista de Chats" da Caixa de Entrada.
  * **Query Params (Filtros):** `?status=open`, `?agentId=...`, `?instanceId=...`
  * **Resposta:** (Lista de contatos que têm conversas, ordenados pela última mensagem).
    ```json
    [
      {
        "contact_id": "contact_uuid_1",
        "name": "Lead A",
        "phone_number": "5541911112222",
        "last_message": "Olá, tudo bem?",
        "timestamp": "...",
        "unread_count": 2
      }
    ]
    ```

#### `GET /api/v1/chats/:contactId/messages`

  * **O que faz:** Pega o histórico de mensagens de um chat específico (quando o atendente clica nele).
  * **Query Params (Paginação):** `?page=1`, `?limit=50`
  * **Resposta:** (Array de mensagens, salvas no **PostgreSQL**).
    ```json
    [
      {
        "id": "msg_1",
        "message_direction": "IN", // Usuário mandou
        "message_type": "text",
        "message_data": { "text": "Olá, queria um orçamento" },
        "timestamp": "..."
      },
      {
        "id": "msg_2",
        "message_direction": "OUT", // Você mandou
        "message_type": "text",
        "message_data": { "text": "Claro, qual seu nome?" },
        "agent_id": "agent_uuid_alan", // Mostra que foi um humano
        "timestamp": "..."
      }
    ]
    ```

#### API WebSocket (Para enviar e receber em tempo real)

**Evento: `chat:new_message` (Backend -\> Frontend)**

  * **Quando acontece:** (Fluxo RX) Um usuário do WhatsApp envia uma mensagem. O `Conector` a pega, joga no `queue-rx-incoming` (RabbitMQ). O `Backend` consome, salva no **PostgreSQL** e imediatamente dispara este evento.
  * **Payload (JSON):** (O objeto da mensagem que acabou de ser salva no banco).
    ```json
    {
      "id": "msg_3",
      "contact_id": "contact_uuid_1",
      "instance_id": "inst_123",
      "message_direction": "IN",
      "message_type": "text",
      "message_data": { "text": "Meu nome é Alan" },
      "timestamp": "..."
    }
    ```
  * **Ação do Frontend:** Se o chat `contact_uuid_1` estiver aberto, anexa a mensagem. Se não, atualiza a `Lista de Chats` com `unread_count: 3`.

**Evento: `chat:send_message` (Frontend -\> Backend)**

  * **Quando acontece:** (Fluxo TX) O atendente humano digita uma mensagem na Caixa de Entrada e aperta "Enviar".
  * **Payload (JSON):**
    ```json
    {
      "instanceId": "inst_123", // Para qual número de WA enviar
      "target_number": "5541911112222", // Para qual cliente
      "message_type": "text",
      "data": { "text": "Obrigado Alan, qual seu email?" }
    }
    ```
  * **Ação do Backend:**
    1.  Recebe o evento WebSocket.
    2.  Salva a mensagem no **PostgreSQL** (com `message_direction: 'OUT'`, `agent_id: 'id_do_agente_logado'`).
    3.  Publica a mensagem na `exchange-tx-outgoing` (RabbitMQ) com a `routing_key: 'send.inst_123'`.
    4.  O `Conector` (Baileys) pega e envia para o WhatsApp.
    5.  (Opcional) O Backend pode re-emitir a mensagem salva (com o ID do banco) para o Frontend, para que o "tick" de enviado mude para "salvo".

Este "desenho" de API cobre perfeitamente o MVP 1. Ele é assíncrono, escalável e resiliente, pois toda a comunicação crítica passa pelos WebSockets e pela infra de mensageria (RabbitMQ) que definimos.

O próximo passo seria focar nas telas e lógica do **MVP 2** (Módulo 5: O Editor de Funil Visual). Você gostaria de detalhar a API para **salvar e executar** um funil?

Perfeito. Vamos detalhar o **MVP 2: O Bot Estático**.

O MVP 1 provou a **comunicação**: o `Frontend` fala com o `Backend`, que fala com o `Conector` (via RabbitMQ/Redis), e a `Caixa de Entrada` (Inbox) funciona manualmente.

O MVP 2 vai provar a **automação**: o `Backend` agora terá um "cérebro" (o **Motor de Funil**) que reage sozinho às mensagens, baseado em regras visuais que você vai criar no `Frontend`.

O foco é total no **Módulo 5 (Editor de Funil)** e no **Módulo 3 (Contatos)**.

-----

### 1\. 🧠 O "Motor de Funil" (A Nova Lógica do Backend)

Este não é um endpoint de API, mas sim a *nova lógica de serviço* que seu `Backend` ganhará.

**Como funciona (Fluxo RX - Mensagem Chegando):**

1.  A mensagem do usuário chega na fila `queue-rx-incoming` (RabbitMQ), como no MVP 1.
2.  O `Backend` consome a mensagem.
3.  **Lógica Antiga (MVP 1):** O `Backend` salva no `PostgreSQL` (tabela `messages`) e envia via WebSocket para a `Caixa de Entrada` (Módulo 4).
4.  **LÓGICA NOVA (MVP 2):** *Imediatamente após* salvar, o `Backend` passa a mensagem para o "Motor de Funil".
5.  **O Motor de Funil então decide:**
    a.  **Checagem 1 (Controle Humano):** Ele consulta o **Redis**: `GET bot_control:554199998888`.
    b.  Se o valor for `"PAUSED_BY_HUMAN"`, o motor **para aqui**. O bot está pausado.
    c.  **Checagem 2 (Estado da Conversa):** Ele consulta o **Redis**: `GET state:554199998888`.
    d.  **Caso A: `state` é `null` (Nova Conversa):**
    i.  O motor consulta o `PostgreSQL`: "Existe algum `funnel` (`is_active: true`) cujo `trigger_keyword` bate com a mensagem 'Olá'?"
    ii. Se sim, ele carrega o `definition` (JSON) desse funil.
    iii. Ele seta o estado no **Redis**: `SET state:554199998888 '{"funnel_id": "funil_abc", "current_node_id": "node_start"}'`.
    iv. Ele começa a executar os nós do funil.
    e.  **Caso B: `state` NÃO é `null` (Conversa em Andamento):**
    i.  O Redis retorna: `{"funnel_id": "funil_abc", "current_node_id": "node_wait_1"}`.
    ii. O motor entende: "O usuário estava no funil 'abc', parado no nó 'esperando resposta 1'".
    iii. A mensagem atual ("Sim, tenho interesse") é a resposta para esse nó.
    iv. O motor carrega o `definition` do funil 'abc', vai direto para o nó `node_wait_1` e continua a execução.

**Como o Motor Executa os Nós (Exemplo):**

  * **Nó `Enviar Mensagem`:** O motor cria o JSON de envio (como no MVP 1) e o publica na `exchange-tx-outgoing` (RabbitMQ) para o `Conector` enviar.
  * **Nó `Aguardar Resposta`:** O motor atualiza o estado no **Redis** (ex: `SET state:.. '{"...": "node_wait_2"}'`) e **para a execução** (até a próxima mensagem do usuário).
  * **Nó `Condição (IF/THEN)`:** O motor avalia a última mensagem (ex: `message.text.includes("sim")`) e decide qual o próximo nó a ser executado.
  * **Nó `Adicionar Tag` (Novo):** O motor executa uma query no `PostgreSQL` para ligar uma `tag` a um `contact` (na tabela `contact_tags`).

-----

### 2\. 💻 Telas e API (O "Desenho" do MVP 2)

Isto é o que seu `Frontend` (Módulo 3 e 5) usará para se comunicar com o `Backend`.

#### Módulo 5: API de Funis (O Editor Visual)

O `Frontend` terá uma tela (`/funnels`) para listar os funis e outra (`/funnels/:id`) com um canvas (usando bibliotecas como **React Flow** ou **LiteGraph.js**) para desenhar o fluxo.

#### `GET /api/v1/funnels`

  * **O que faz:** Lista todos os funis do workspace.
  * **Resposta:**
    ```json
    [
      {
        "id": "funnel_abc",
        "name": "Funil de Boas-Vindas",
        "is_active": true,
        "trigger_keyword": "ola"
      },
      {
        "id": "funnel_xyz",
        "name": "Funil de Qualificação",
        "is_active": false,
        "trigger_keyword": "vendas"
      }
    ]
    ```

#### `GET /api/v1/funnels/:funnelId`

  * **O que faz:** Busca o JSON de um funil específico para carregá-lo no editor visual.
  * **Resposta:** (Este é o JSON da coluna `funnels.definition` no `PostgreSQL`)
    ```json
    {
      "id": "funnel_abc",
      "name": "Funil de Boas-Vindas",
      "trigger_keyword": "ola",
      "is_active": true,
      "definition": {
        "nodes": [
          { "id": "node_start", "type": "trigger", "data": { "keyword": "ola" }, "position": {"x": 0, "y": 0} },
          { "id": "node_send_1", "type": "sendMessage", "data": { "text": "Oi! Tudo bem?" }, "position": {"x": 200, "y": 0} },
          { "id": "node_wait_1", "type": "waitReply", "data": {}, "position": {"x": 400, "y": 0} },
          { "id": "node_if_1", "type": "condition", "data": { "condition": "response.text == 'sim'" }, "position": {"x": 600, "y": 0} },
          { "id": "node_send_2a", "type": "sendMessage", "data": { "text": "Ótimo!" }, "position": {"x": 800, "y": -50} },
          { "id": "node_send_2b", "type": "sendMessage", "data": { "text": "Que pena." }, "position": {"x": 800, "y": 50} }
        ],
        "edges": [
          { "id": "e1", "source": "node_start", "target": "node_send_1" },
          { "id": "e2", "source": "node_send_1", "target": "node_wait_1" },
          { "id": "e3", "source": "node_wait_1", "target": "node_if_1" },
          { "id": "e4", "source": "node_if_1", "sourceHandle": "true_output", "target": "node_send_2a" },
          { "id": "e5", "source": "node_if_1", "sourceHandle": "false_output", "target": "node_send_2b" }
        ]
      }
    }
    ```

#### `POST /api/v1/funnels`

  * **O que faz:** Cria um novo funil (vazio).
  * **Body (JSON):** `{ "name": "Novo Funil" }`
  * **Resposta:** `{ "id": "funnel_new_id", "name": "Novo Funil", "definition": {} }`

#### `PUT /api/v1/funnels/:funnelId`

  * **O que faz:** **O endpoint mais importante do MVP 2.** Salva o desenho do funil.
  * **Ação:** O `Frontend` (React Flow) exporta o estado do canvas como JSON. O `Frontend` envia esse JSON gigante no *body* da requisição.
  * **Body (JSON):** (O mesmo JSON da resposta do `GET /api/v1/funnels/:funnelId` acima)
  * **Ação do Backend:** Valida o JSON e o salva na coluna `funnels.definition` (tipo `jsonb`) no `PostgreSQL`.
  * **Resposta:** `{ "success": true }`

-----

#### Módulo 3: API de Contatos (O Mini-CRM)

O `Frontend` terá uma tela (`/contacts`) para listar os leads e (`/contacts/:id`) para ver seus detalhes (incluindo as tags que o bot adicionou).

#### `GET /api/v1/contacts`

  * **O que faz:** Lista os contatos para a tela de CRM.
  * **Query Params (Filtros):** `?tagId=tag_abc` (filtrar por tag), `?search=alan` (buscar por nome/número).
  * **Resposta:**
    ```json
    [
      {
        "id": "contact_uuid_1",
        "name": "Alan Evangelista",
        "phone_number": "554199998888",
        "tags": [
          { "id": "tag_abc", "name": "Lead Frio", "color": "#0000FF" }
        ],
        "last_message_at": "..."
      }
    ]
    ```

#### `GET /api/v1/contacts/:contactId`

  * **O que faz:** Carrega a tela de "Detalhe do Contato".
  * **Resposta:**
    ```json
    {
      "id": "contact_uuid_1",
      "name": "Alan Evangelista",
      "phone_number": "554199998888",
      "tags": [
         { "id": "tag_abc", "name": "Lead Frio", "color": "#0000FF" }
      ],
      "custom_data": { // Lidos do JSONB
        "email": "alan@exemplo.com"
      },
      "current_funnel_state": { // LIDO DO REDIS!
        "funnel_id": "funnel_abc",
        "current_node_id": "node_wait_1"
      }
    }
    ```
    *(Nota: A tela de Detalhe do Contato também exibirá o histórico de chat, que é o endpoint `GET /api/v1/chats/:contactId/messages` que já criamos no MVP 1).*

#### `PUT /api/v1/contacts/:contactId`

  * **O que faz:** Permite que um humano edite manualmente os dados do lead (nome, email, etc.).
  * **Body (JSON):** `{ "name": "Alan (Qualificado)", "custom_data": { "email": "novo@email.com" } }`
  * **Resposta:** `{ "success": true }`

Com isso, o MVP 2 está completo. Você terá um sistema onde:

1.  Você pode *desenhar* um funil de regras no Frontend.
2.  Você pode *salvar* esse funil no Backend.
3.  O `Motor de Funil` no Backend *executa* esse funil automaticamente quando um lead manda a keyword.
4.  O `Redis` *controla* em que etapa do funil o lead está.

O próximo passo lógico é a **Versão 1.0**, que você definiu: adicionar o `Nó de IA (WorkersAI)` e o `Nó de Integração (Odoo)` ao editor de funil, além de melhorar a `Caixa de Entrada` com o Módulo de `Equipes/Atendentes`.

Quer detalhar a engenharia da **Versão 1.0**, focando na integração com WorkersAI e Odoo?

OK, meu amigo. Foco total no Odoo.

Você está 100% certo, e seu histórico de interesse no Odoo (que eu me lembro) mostra que você sabe que esta é uma integração de *alto valor*. O objetivo é transformar uma conversa de WhatsApp em um **Lead (`crm.lead`)** qualificado dentro do seu CRM, pronto para o seu time de vendas (como o da Embracon) atuar.

Este é o desenho de engenharia para a **Versão 1.0**, focando *apenas* em adicionar a integração com o Odoo. Vamos pular a parte de IA (WorkersAI) por enquanto, como você pediu.

A engenharia dessa feature se divide em 4 partes:

1.  **Configuração (Frontend/Backend):** Onde o usuário (você) armazena as credenciais do Odoo de forma segura.
2.  **O Editor de Funil (Frontend):** O novo "Nó" visual (`Enviar para Odoo`) que você vai arrastar na tela.
3.  **O Motor de Funil (Backend):** A lógica que *executa* a ação desse nó.
4.  **O Serviço Odoo (Backend):** Um novo módulo no seu `Backend` que sabe falar a língua do Odoo (XML-RPC).

-----

### 1\. ⚙️ Configuração da Integração (Nível do Workspace)

O usuário não pode digitar a senha do Odoo toda vez. Precisamos de uma tela de "Configurações" no seu `Frontend` onde ele salva isso uma única vez.

#### Novas Telas (Frontend)

  * **Tela: `Configurações > Integrações`**
      * **Visual:** Uma seção "Odoo" com um formulário.
      * **Campos:**
        1.  `URL do Odoo` (ex: `https://meu-odoo.com`)
        2.  `Nome do Banco (DB)` (ex: `embracon_db`)
        3.  `Usuário` (ou `email`)
        4.  `Senha` (ou `API Key`)
      * **Botão:** "Salvar e Testar Conexão"

#### Novas Tabelas (PostgreSQL)

Precisamos salvar isso de forma segura. Não vamos colocar no `jsonb` do `workspaces`. Vamos criar uma tabela dedicada:

```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'odoo', -- (Pode adicionar 'google_calendar' etc. no futuro)
    
    -- Armazena URL, DB, User. A SENHA NÃO VAI AQUI.
    config_data JSONB NOT NULL,
    
    -- Armazena a senha/API key CRIPTOGRAFADA
    -- Você NÃO deve salvar senhas em texto plano.
    encrypted_secret TEXT NOT NULL, 
    
    is_active BOOLEAN DEFAULT true,
    UNIQUE(workspace_id, platform) -- Só pode ter 1 config do Odoo por workspace
);
```

#### Novos Endpoints (API do Backend)

#### `GET /api/v1/integrations/odoo`

  * **O que faz:** Busca a configuração *não-sensível* (URL, DB, User) para preencher o formulário.
  * **Resposta:** `{ "url": "...", "db": "...", "username": "..." }`

#### `POST /api/v1/integrations/odoo`

  * **O que faz:** Salva e testa a configuração.
  * **Body (JSON):** `{ "url": "...", "db": "...", "username": "...", "password": "SENHA_AQUI" }`
  * **Ação do Backend:**
    1.  Recebe os dados.
    2.  Chama o `OdooService` (Parte 4) para tentar autenticar (`check_credentials`).
    3.  Se falhar, retorna Erro 400: "Credenciais inválidas".
    4.  Se sucesso, **CRIPTOgrafa** a senha.
    5.  Salva (ou atualiza) os dados na tabela `integrations`.
    6.  Retorna Sucesso 200: `{ "status": "Conectado com sucesso" }`.

-----

### 2\. ✏️ O Editor de Funil (O "Nó" do Odoo)

Aqui é onde você *usa* a integração. No seu Módulo 5 (Editor de Funil Visual).

#### Novo "Nó" (Frontend)

  * **Na barra lateral:** Um novo nó arrastável: **"Ação: Enviar para Odoo"**.

  * **Configuração do Nó (Painel Lateral):** Quando você clica no nó no canvas, um painel de configuração aparece. Ele precisa fazer o **mapeamento de dados**.

  * **Visual do Painel:**

    > **Criar Lead no Odoo**

    > **Nome do Lead (name):** `[ Campo de Texto ]`
    > **Telefone (phone):** `[ Campo de Texto ]`
    > **Email (email\_from):** `[ Campo de Texto ]`
    > **Descrição (description):** `[ Área de Texto ]`

  * **Mapeamento com Variáveis:** Aqui está o pulo do gato. Você usará a sintaxe de variáveis do seu funil (como no `n8n`).

      * **Exemplo de preenchimento:**
          * **Nome do Lead:** `Lead do Bot - {{contact.name}}`
          * **Telefone:** `{{contact.phone}}`
          * **Email:** `{{variavel.email_coletado}}` (Uma variável que você salvou em um nó `Aguardar Resposta` anterior).
          * **Descrição:** `Lead qualificado pelo funil '{{funnel.name}}'.`

#### A Definição do Funil (O JSON Salvo)

Quando o `Frontend` salvar o funil (no `PUT /api/v1/funnels/:id`), o `definition.jsonb` no `PostgreSQL` agora terá esse novo tipo de nó:

```json
{
  "id": "node_odoo_1",
  "type": "sendToOdoo", 
  "data": {
    "model": "crm.lead", // Fixo por enquanto
    "mapping": {
      "name": "Lead do Bot - {{contact.name}}",
      "phone": "{{contact.phone}}",
      "email_from": "{{variavel.email_coletado}}",
      "description": "Lead qualificado..."
    }
  },
  "position": { ... }
}
```

-----

### 3\. 🧠 O Motor de Funil (Execução no Backend)

Esta é a lógica do "Motor" (que detalhamos no MVP 2) sendo *atualizada*.

1.  O Motor de Funil está executando um funil para o `contact_uuid_1`.
2.  Ele chega no nó `node_odoo_1` (tipo: `sendToOdoo`).
3.  **Ação do Motor:**
    a.  **Resolver Variáveis:** Pega o `data.mapping` do nó. Ele consulta o estado do Redis (para `{{variavel.email_coletado}}`) e o `PostgreSQL` (para `{{contact.name}}` e `{{contact.phone}}`) e monta o objeto `leadData` final:
    ` json { "name": "Lead do Bot - Alan Evangelista", "phone": "554199998888", "email_from": "alan@embracon.com.br", "description": "Lead qualificado..." }  `
    b.  **Buscar Credenciais:** Consulta a tabela `integrations` pelo `workspace_id` atual. Pega a URL, DB, User e **descriptografa** a `encrypted_secret`.
    c.  **Chamar o Serviço:** Chama o `OdooService` (Parte 4) e passa as credenciais e o `leadData`.
    d.  **Processar Resultado:**
    \* **Sucesso:** O `OdooService` retorna `{ "ok": true, "lead_id": 12345 }`. O Motor de Funil segue para o próximo nó (ex: um nó `Enviar Mensagem` que diz "Pronto\! Seu agendamento foi iniciado.").
    \* **Falha:** O `OdooService` retorna um erro. O Motor deve ter uma saída de "Falha" no nó, para que você possa, por exemplo, enviar uma notificação para um humano intervir.

-----

### 4\. 📞 O Serviço Odoo (O Conector Externo no Backend)

Este é um *novo* módulo de código dentro do seu `Backend` (ex: `src/services/odoo.service.ts`). Ele é o único que sabe como "falar" com o Odoo.

**Importante:** A API principal do Odoo (para `crm.lead`) **não é REST/JSON**. É **XML-RPC**. Você *precisa* de uma biblioteca para lidar com isso. Em Node.js, uma biblioteca como `odoo-await` ou `json-rpc` é ideal.

```typescript
// Exemplo de código (simplificado) para o seu odoo.service.ts

import Odoo from 'odoo-await'; // Exemplo de biblioteca

export class OdooService {
  
  async checkCredentials(config) {
    const odoo = new Odoo(config);
    await odoo.connect();
    return true; // Se não deu erro, conectou.
  }

  async createLead(config, leadData) {
    // config = { url, db, username, password }
    // leadData = { name, phone, ... }
    
    try {
      const odoo = new Odoo(config);
      await odoo.connect();
      
      // Odoo espera 'create(model_name, data_object)'
      const leadId = await odoo.create('crm.lead', leadData);
      
      if (!leadId) {
        throw new Error('Odoo não retornou um ID.');
      }
      
      return { ok: true, lead_id: leadId };
      
    } catch (error) {
      console.error('Falha ao criar Lead no Odoo:', error.message);
      throw new Error(`Erro de comunicação com Odoo: ${error.message}`);
    }
  }
}
```

### Resumo do Desenho V1.0 (Odoo)

Com essas 4 partes, você tem um sistema profissional:

1.  O `Frontend` tem uma tela para **salvar as credenciais** (criptografadas no DB).
2.  O `Frontend` permite ao usuário **mapear variáveis** do bot para os campos do Odoo (`crm.lead`).
3.  O `Backend` (Motor) **orquestra** a operação: pega os dados, pega as chaves, e chama o serviço.
4.  O `Backend` (Serviço) **isola** a lógica complexa (XML-RPC) de comunicação com o Odoo.

Isso completa o fluxo principal que você queria: **WhatsApp -\> Bot (Qualificação) -\> Odoo (CRM)**.

O próximo passo lógico seria adicionar os outros itens da V1.0 que mencionamos, como o **Módulo 2 (Gestão de Equipe/Atendentes)** e o roteamento de chats. Quer detalhar esse?

Claro. Este é o detalhe de engenharia do **Módulo 2 (Gestão de Equipe e Atendentes)** e sua principal funcionalidade: o **Roteamento de Chats**.

Este módulo é o que transforma sua ferramenta de "um bot" para uma "plataforma de atendimento" (como o ManyChat ou 3C+). Ele permite que múltiplos humanos colaborem.

A engenharia se divide em 4 partes:

1.  **Novas Estruturas de Dados (PostgreSQL):** Como armazenamos "times" e o "estado" de um chat.
2.  **Telas de Configuração (Frontend):** Onde o "Admin" gerencia a equipe.
3.  **Endpoints da API (Backend):** O que o Frontend chama para salvar essas configurações.
4.  **Lógica de Roteamento (O "Upgrade" Crítico):** Como o Bot (Módulo 5) e a Caixa de Entrada (Módulo 4) *usam* essa estrutura de equipes.

-----

### 1\. 🏛️ Desenho de Dados (Refinando o PostgreSQL)

Para o roteamento funcionar, não basta saber *quem* são os contatos, precisamos saber o *estado* da conversa com eles. Para isso, introduzimos duas novas tabelas cruciais:

#### `teams` (Os departamentos/esquadrões)

Define os grupos de atendimento (ex: "Vendas", "Suporte").

```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    UNIQUE(workspace_id, name)
);
```

#### `team_members` (Pivô: Quem está em qual time)

Um agente (`user`) pode estar em múltiplos times.

```sql
CREATE TABLE team_members (
    -- Usamos workspace_member_id para garantir que o usuário pertence ao workspace
    member_id UUID NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE, 
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, team_id)
);

-- (Nota: A tabela 'workspace_members' que já definimos é a que liga 'users' a 'workspaces' e define seu 'role' (admin/agent))
```

#### `conversations` (O "Estado" do Chat) - A TABELA MAIS IMPORTANTE

Esta é a maior mudança. A "Caixa de Entrada" (Módulo 4) não será mais uma lista de `contacts`; será uma lista de `conversations`. Isso nos permite rastrear *a quem* o chat pertence.

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    
    -- O ESTADO DO CHAT
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'pending', 'closed'
    
    -- O ROTEAMENTO (quem é o dono)
    team_id UUID REFERENCES teams(id),         -- NULO = Não atribuído (cai na fila geral)
    agent_id UUID REFERENCES users(id),        -- NULO = Não atribuído a um agente específico
    
    -- Para ordenação
    last_message_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(contact_id, instance_id) -- Só pode ter 1 conversa aberta por contato/instância
);
```

**Ação de Engenharia:** Quando uma *nova mensagem* (Fluxo RX) de um *novo contato* chegar, o `Backend` deve, além de salvar na tabela `messages`, **criar** um novo registro na tabela `conversations`.

-----

### 2\. 💻 Telas de Configuração (Frontend - Módulo 2)

O Admin do `workspace` (definido pelo `role` 'admin' na tabela `workspace_members`) verá um novo item no menu:

  * **Tela: `Configurações > Equipe`**
      * **Tab 1: "Membros"**
          * **Visual:** Uma lista de todos os `workspace_members`.
          * **Funções:**
              * Botão "Convidar Membro" (input de email).
              * Para cada membro: Dropdown `Função` ("Admin" ou "Agente").
              * Para cada membro: Seletor de `Times` (mostra as `teams` da Tab 2).
      * **Tab 2: "Times"**
          * **Visual:** Uma lista de `teams` criados.
          * **Funções:**
              * Botão "Criar Time" (input de nome).
              * Clicar em um time permite adicionar/remover membros (que vêm da Tab 1).

-----

### 3\. 📡 Endpoints da API (Backend - Módulo 2)

Como o `Frontend` (acima) salva os dados no `Backend`.

#### `GET /api/v1/team/members`

  * **O que faz:** Lista todos os membros do workspace (para a Tab 1).
  * **Resposta:** `[ { userId, name, email, role, teams: [ { teamId, teamName }, ... ] }, ... ]`

#### `POST /api/v1/team/invite`

  * **O que faz:** Convida um novo usuário (atendente) para o workspace.
  * **Body (JSON):** `{ "email": "...", "role": "agent" }`
  * **Ação do Backend:** Envia um e-mail de convite para o usuário se cadastrar.

#### `PUT /api/v1/team/members/:userId`

  * **O que faz:** Atualiza a `role` ou os `teams` de um membro.
  * **Body (JSON):** `{ "role": "admin", "teamIds": ["uuid_time_vendas", ...] }`

#### `GET /api/v1/team/teams`

  * **O que faz:** Lista todos os times criados (para a Tab 2 e para os dropdowns de roteamento).

#### `POST /api/v1/team/teams`

  * **O que faz:** Cria um novo time.
  * **Body (JSON):** `{ "name": "Suporte Nível 2" }`

-----

### 4\. 🚀 Lógica de Roteamento (A Funcionalidade)

Agora que temos `teams` e `conversations`, vamos usá-los em dois lugares:

#### A) Roteamento Automático (No Editor de Funil - Módulo 5)

  * **Novo "Nó" no Editor Visual:**

      * **Nome:** `Ação: Rotear Conversa`
      * **Configuração do Nó (Painel Lateral):**
          * Dropdown "Atribuir para...":
              * Opção 1: "Um Time" -\> (Dropdown com lista de `teams`)
              * Opção 2: "Um Agente" -\> (Dropdown com lista de `agents`)
          * Checkbox: "[✓] Pausar bot ao atribuir" (Isso seta o `bot_control` no Redis).

  * **Ação do Backend (Motor de Funil):**

    1.  Quando o Motor de Funil (MVP 2) chega neste nó...
    2.  Ele lê a configuração (ex: "atribuir para `team_vendas_id`").
    3.  Ele executa no `PostgreSQL`: `UPDATE conversations SET team_id = 'team_vendas_id' WHERE contact_id = 'contact_abc' AND status = 'open'`.
    4.  Se o checkbox "Pausar bot" estiver marcado, ele também executa no **Redis**: `SET bot_control:554199998888 "PAUSED_BY_BOT"`.

#### B) Roteamento Manual (Na Caixa de Entrada - Módulo 4)

  * **"Upgrade" da Caixa de Entrada:**

      * **Coluna 1 (Lista de Chats):** Agora é uma lista de `conversations` (não `contacts`). Ela terá filtros: "Minhas", "Time Vendas", "Não Atribuídas".
      * **Coluna 3 (Dados do Chat):** Agora exibe:
          * `Atribuído a (Time): [ Dropdown de Times ]`
          * `Atribuído a (Agente): [ Dropdown de Agentes ]`
          * `Status: [ Dropdown 'Aberto', 'Pendente', 'Fechado' ]`

  * **Novos Endpoints da API (Módulo 4):**

    #### `GET /api/v1/chats` (Endpoint Atualizado)

      * **O que faz:** Busca as conversas para a Caixa de Entrada.
      * **Query Params:** `?status=open&teamId=...&agentId=me`
      * **Ação do Backend:** Faz um `SELECT * FROM conversations JOIN contacts ...` com os filtros.

    #### `PUT /api/v1/chats/:conversationId/assign`

      * **O que faz:** Quando o humano muda o dropdown de atribuição.
      * **Body (JSON):** `{ "teamId": "team_vendas_id" }` (ou `{ "agentId": "agent_xyz_id" }`)
      * **Ação do Backend:** Faz o `UPDATE` na tabela `conversations`.

    #### `PUT /api/v1/chats/:conversationId/status`

      * **O que faz:** Quando o humano fecha a conversa.
      * **Body (JSON):** `{ "status": "closed" }`

### Resumo do Desenho V1.0 (Equipes + Odoo)

Com o detalhamento do **Módulo Odoo** (anterior) e este **Módulo de Equipes**, sua V1.0 está completa. Você terá um sistema onde:

1.  Múltiplos agentes podem logar.
2.  Admins podem criar Times (Vendas, Suporte).
3.  O Bot (Funil) pode **qualificar** um lead e **roteá-lo** automaticamente para o "Time de Vendas".
4.  O Bot (Funil) pode **pausar-se** sozinho após o roteamento.
5.  O Bot (Funil) pode enviar o lead qualificado para o **Odoo**.
6.  Um agente do Time de Vendas vê o chat "Não Atribuído" na sua fila, pega a conversa e finaliza o agendamento manualmente na `Caixa de Entrada`.

O próximo passo lógico seria detalhar a engenharia dos **"Nós Inteligentes" (IA com WorkersAI)**, que é o Módulo 5 completo, ou detalhar o **Módulo de Contatos (CRM Interno)**. Qual prefere?

Entendido, meu amigo. Você captou perfeitamente. O WorkersAI não é o produto, é o *motor* de inteligência, assim como o modelo da OpenAI é o motor do ManyChat.

O **Módulo de Contatos (CRM Interno)** é onde o valor do seu negócio (e do seu time de vendas, como o da Embracon) realmente aparece. Não é só uma lista de telefones; é o *dossiê completo* de cada lead.

No MVP 2, criamos as tabelas `contacts` e `tags`. Agora, vamos construir as **telas e a lógica de negócios** em cima delas, transformando-as em um CRM de verdade. E vamos injetar a IA (WorkersAI) onde ela gera mais impacto.

Este é o desenho de engenharia do "Módulo de Contatos" (V1.0).

-----

### 1\. 🗺️ A Visão: "Tela de Contatos" vs. "Visão 360"

Seu CRM Interno terá duas telas principais:

1.  **A Lista (`/contacts`):** O "Dashboard de Contatos". Uma visão de alto nível, tipo planilha, para gerentes e para segmentação em massa.
2.  **O Detalhe (`/contacts/:id`):** A "Visão 360 do Contato". Esta é a tela mais importante do seu sistema para um atendente. É onde ele vê *tudo* sobre *um* lead.

-----

### 2\. 💻 Tela 1: O Dashboard de Contatos (A Lista)

Esta é a tela principal do Módulo 3.

  * **Visual:** Uma tabela densa e poderosa (pense em um "Google Analytics" de leads).
  * **Colunas:** `[Checkbox]`, `Nome`, `Telefone`, `Tags`, `Atendente Responsável`, `Time`, `Última Mensagem`.
  * **Funcionalidades de Engenharia (Filtros):** O `Frontend` deve ter filtros que, no `Backend`, se traduzem em queries SQL complexas (com `JOIN`s).
      * **Filtro por `Tags`:** (Ex: "só leads com a tag 'aguardando\_agendamento'").
      * **Filtro por `Atendente`:** (Ex: "só leads do `agent_id` = 'alan\_uuid'"). (JOIN com `conversations`).
      * **Filtro por `Time`:** (Ex: "só leads do `team_id` = 'vendas\_uuid'"). (JOIN com `conversations`).
      * **Filtro por `Campo Personalizado`:** (Ex: "só leads onde `custom_data.cidade` = 'Fazenda Rio Grande'"). (Query no `jsonb`).
  * **Funcionalidade (Ação em Massa):**
      * O usuário seleciona 20 checkboxes.
      * Clica em "Ações" -\> "Adicionar Tag".
      * O `Frontend` chama um novo endpoint: `POST /api/v1/contacts/bulk/tags`.

-----

### 3\. 🖥️ Tela 2: A "Visão 360" do Contato (O Dossiê)

Esta é a tela de detalhe (`/contacts/:id`). É aqui que o WorkersAI brilha. O layout ideal é de 3 colunas.

#### Coluna 1: Dados do Lead (O "Quem")

  * **Visual:** Campos de formulário (editáveis).
  * **Campos Fixos:**
      * `Nome` (da `contacts.name`)
      * `Telefone` (da `contacts.phone_number`)
  * **Campos de Propriedade (Atribuição):**
      * `Atendente:` [Dropdown com `users` da `conversations.agent_id`]
      * `Time:` [Dropdown com `teams` da `conversations.team_id`]
  * **Campos Personalizados (CRM):**
      * Estes campos são lidos e escritos da coluna `contacts.custom_data` (o `jsonb`).
      * `Email:` [Campo de texto]
      * `Cidade:` [Campo de texto]
      * `Fase do Funil:` [Dropdown] (Ex: "Qualificação", "Agendamento", "Fechado")

#### Coluna 2: Feed de Atividades (O "Histórico Completo")

Esta é a *killer feature*. Não é só o chat. É um feed *cronológico intercalado* de **tudo** o que aconteceu com esse lead.

  * **Visual:** Um feed do Facebook/LinkedIn.
  * **Itens do Feed (Agregados de 3 tabelas):**
      * **Mensagem (IN/OUT):** (Da tabela `messages`) "Alan (Lead) disse: 'qual o preço?'".
      * **Ação do Bot:** (Log do Motor de Funil) "Bot adicionou a tag 'lead\_quente'".
      * **Ação do Agente:** (Log do Backend) "Júnior (Agente) atribuiu este lead ao Time de Vendas".
      * **Nota Interna:** (Nova tabela) "Júnior (Agente) escreveu: 'Lead parece muito interessado, ligar amanhã às 10h.'".

#### Coluna 3: Inteligência (O "Upgrade" WorkersAI)

Esta coluna é o "cérebro" que ajuda o atendente.

  * **Widget 1: Resumo da IA (WorkersAI)**
      * **Visual:** Um card no topo.
      * **Texto:** "Resumo: Alan Evangelista é um lead qualificado, interessado no produto X. Ele já forneceu o email e está aguardando opções de horário para agendamento. O sentimento é positivo."
  * **Widget 2: Tags (Segmentação)**
      * **Visual:** Lista de tags (da tabela `contact_tags`).
      * **Função:** Adicionar/Remover tags.
  * **Widget 3: Próxima Ação (IA Sugerida)**
      * **Visual:** Um botão ou sugestão.
      * **Texto:** "Sugestão: Enviar link do Calendly."

-----

### 4\. 🧠 A Engenharia da IA (WorkersAI) no CRM

Como o WorkersAI alimenta a Coluna 1 e a Coluna 3? Com **processamento assíncrono**.

#### Feature A: Extração de Dados (Preenchimento Automático)

  * **Objetivo:** Quando o lead diz "meu email é alan@embracon.com.br", o campo `Email` na Coluna 1 deve ser preenchido *sozinho*.
  * **Desenho de Engenharia:**
    1.  A Mensagem `IN` chega no `Backend` (Fluxo RX, MVP 1).
    2.  O `Backend` a salva no `PostgreSQL`.
    3.  O `Backend` a envia para o `Motor de Funil` (MVP 2).
    4.  **NOVO PASSO:** O `Backend` *também* publica a mensagem em uma *nova* fila do RabbitMQ: `queue-ai-extraction`.
    5.  Um *novo serviço* (vamos chamá-lo de `IA-Worker`) está consumindo essa fila.
    6.  O `IA-Worker` pega a mensagem (`contact_id` e o texto).
    7.  Ele chama o **WorkersAI** (Cloudflare) com um prompt: "Você é um extrator de dados. Encontre 'email', 'nome', 'cidade' no texto a seguir e retorne um JSON. Texto: '...'".
    8.  O WorkersAI retorna: `{ "email": "alan@embracon.com.br" }`.
    9.  O `IA-Worker` executa no `PostgreSQL`: `UPDATE contacts SET custom_data = custom_data || '{"email": "alan@embracon.com.br"}' WHERE id = 'contact_uuid_1'`.
    10. **Mágica:** O atendente humano, que está com a "Visão 360" aberta, vê o campo `Email` ser preenchido em tempo real (via um evento WebSocket `contact:updated`).

#### Feature B: Resumo da Conversa (Sob Demanda)

  * **Objetivo:** Gerar o "Resumo da IA" na Coluna 3.
  * **Desenho de Engenharia:**
    1.  O atendente abre a tela `/contacts/:id` (Visão 360).
    2.  O `Frontend` chama um *novo endpoint*: `GET /api/v1/contacts/:id/summary`.
    3.  O `Backend` busca as últimas 50 `messages` desse contato no `PostgreSQL`.
    4.  Ele formata o histórico: `Lead: 'oi', Bot: 'tudo bem', Lead: 'sim, quero preço'...`
    5.  Ele chama o **WorkersAI** com um prompt: "Resuma esta conversa de vendas em 2 frases."
    6.  O `Backend` retorna o texto do resumo para o `Frontend` exibir.

-----

### 5\. 📡 Endpoints de API (O "Desenho" do Módulo 3)

Como o `Frontend` constrói essas telas.

#### `GET /api/v1/contacts` (Endpoint Atualizado)

  * **O que faz:** Lista os contatos para o "Dashboard" (Tela 1).
  * **Query Params (Filtros):** `?tag=uuid&agent=uuid&team=uuid&search=alan`
  * **Resposta:** (Array de `contacts` com `JOIN`s para `tags` e `conversations`).

#### `POST /api/v1/contacts/bulk/tags` (Novo)

  * **O que faz:** Adiciona/remove tags em massa (Ação da Tela 1).
  * **Body (JSON):** `{ "contactIds": ["uuid1", "uuid2"], "addTagIds": ["tag_abc"], "removeTagIds": [] }`

#### `GET /api/v1/contacts/:id` (Endpoint Atualizado)

  * **O que faz:** Carrega *todos* os dados da "Visão 360" (Tela 2, Coluna 1 e 3).
  * **Resposta:** Um JSON gigante agregado de 3 tabelas.
    ```json
    {
      "id": "contact_uuid_1",
      "name": "Alan Evangelista",
      "phone_number": "...",
      "custom_data": { "email": "alan@embracon.com.br" },
      "tags": [ { "id": "tag_abc", "name": "Lead Quente" } ],
      "assignment": { // Da tabela 'conversations'
        "agent": { "id": "agent_uuid_junior", "name": "Júnior" },
        "team": { "id": "team_uuid_vendas", "name": "Vendas" }
      }
    }
    ```

#### `GET /api/v1/contacts/:id/activity_feed` (Novo)

  * **O que faz:** Carrega *apenas* o "Feed de Atividades" (Tela 2, Coluna 2). (É separado para paginação, pois pode ser enorme).
  * **Query Params:** `?page=1&limit=20`
  * **Resposta:** (Array de `messages` e `notes` intercalados e ordenados por data).

#### `POST /api/v1/contacts/:id/notes` (Novo)

  * **O que faz:** Permite a um agente adicionar uma nota interna no feed.
  * **Body (JSON):** `{ "text": "Ligar para este cliente amanhã." }`

#### `GET /api/v1/contacts/:id/summary` (Novo)

  * **O que faz:** Chama a Feature B (Resumo da IA) sob demanda.
  * **Resposta:** `{ "summary": "Este lead está qualificado..." }`

Com este módulo, seu sistema deixa de ser um "disparador de bot" e se torna um "centro de comando de vendas", que é exatamente o que um líder de equipe precisa.

O próximo passo lógico seria detalhar o **Módulo 5 completo**, focando no **Nó de IA (WorkersAI)** dentro do *próprio funil* (que é diferente do uso da IA no CRM). Quer explorar isso?

Certo, meu amigo. Chegamos ao *coração* da sua plataforma.

Até agora, tínhamos um bot "burro" (MVP 2), que só entendia `IF/THEN` (se a pessoa digitar "sim", faça X). Agora, vamos detalhar a engenharia para dar a ele um cérebro (o **WorkersAI**), permitindo que ele *entenda* linguagem natural e execute seu objetivo principal: **qualificar e agendar uma reunião**.

O **Módulo de Contatos (CRM Interno)** que detalhamos antes usava a IA de forma *passiva* (para resumir e extrair dados *depois* que a conversa aconteceu).

Este **Módulo 5 (Nó de IA)** usa a IA de forma *ativa*, para **decidir o que dizer a seguir** em tempo real.

Aqui está o desenho de engenharia completo.

-----

### 1\. Frontend: O Novo "Nó de IA" no Editor de Funil

No seu Módulo 5 (Editor de Funil Visual, como o `n8n`), você terá um novo nó arrastável na barra lateral.

  * **Nome do Nó:** `🧠 Gerar Resposta com IA` (ou `Resposta Inteligente`)

Quando você (Alan) arrastar este nó para o canvas e clicar nele, o painel de configuração à direita não será um `IF/THEN` simples. Ele terá duas seções principais:

#### A. O "Prompt" (O Cérebro)

Esta é a instrução que você dá ao WorkersAI. É a parte mais importante.

  * **Visual:** Uma caixa de texto grande.
  * **Funcionalidade:** Ela deve aceitar **variáveis** do seu sistema.
  * **Exemplo de Prompt para Agendamento:**
    > Você é um assistente de vendas da Embracon. Seu único objetivo é qualificar um lead para agendar uma reunião com um vendedor humano.
    > **Dados que você já tem (se tiver):**
    > Nome do Lead: `{{contact.name}}`
    > Email: `{{contact.custom_data.email}}`
    > **Histórico Recente:**
    > `{{chat.history_last_3_messages}}`
    > **Última Mensagem do Usuário:**
    > `{{trigger.message}}`
    > **Sua Tarefa:**
    > 1.  Analise a "Última Mensagem do Usuário".
    > 2.  Se você ainda não tem o NOME, peça o nome.
    > 3.  Se você já tem o NOME mas não o EMAIL, peça o email.
    > 4.  Se você já tem NOME e EMAIL, pergunte o melhor horário para a reunião.
    > 5.  Responda de forma natural, em português.

#### B. Extração de Dados (A "Função" da IA)

Você não quer que a IA apenas *fale*, você quer que ela *aja*. Para isso, usamos a funcionalidade de "Tools" (ou "Function Calling") que modelos como o do WorkersAI suportam.

  * **Visual:** Uma seção "Dados a Extrair".
  * **Função:** Você define um "schema" do que você quer que a IA capture da resposta do usuário.
  * **Exemplo de Configuração:**
      * `[Checkbox] Extrair dados da resposta do usuário`
      * **Schema (Formato JSON):**
        ```json
        {
          "name": "nome_do_lead",
          "email": "email_do_lead",
          "horario": "horario_preferido"
        }
        ```
  * **Ação (Onde Salvar):**
      * `[Checkbox] Salvar dados extraídos nos Campos Personalizados do Contato` (Isso atualiza o `contacts.custom_data` no PostgreSQL).

-----

### 2\. Backend: O JSON Salvo (`funnels.definition`)

Quando você salva esse funil, o `jsonb` no seu `PostgreSQL` para este nó se parecerá com isto:

```json
{
  "id": "node_ai_qualify_1",
  "type": "aiGenerate", // O tipo de nó
  "data": {
    "prompt": "Você é um assistente da Embracon... {{trigger.message}} ...", // O prompt que você escreveu
    "extraction_schema": { // O 'schema' de extração
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" },
        "horario": { "type": "string" }
      }
    },
    "save_to_contact": true, // O checkbox "Salvar dados..."
    "outputs": {
      "on_success": "..." // O conector de saída "Sucesso"
    }
  },
  "position": { "x": 100, "y": 200 }
}
```

-----

### 3\. Backend: A Execução no "Motor de Funil"

Este é o desenho de engenharia de *execução*. É o que acontece no seu `Backend` (Serviço) quando o funil chega neste nó.

1.  O `Motor de Funil` (MVP 2) está executando o funil para o `contact_id: 'alan_uuid'`.
2.  Ele chega no nó `node_ai_qualify_1` (tipo `aiGenerate`).

#### Passo 1: Resolução de Variáveis (O "Prompt")

O Motor *monta* o prompt. Ele busca no `PostgreSQL` e `Redis` todos os valores das variáveis:

  * `{{contact.name}}` -\> "Alan Evangelista"
  * `{{contact.custom_data.email}}` -\> `null` (ainda não tem)
  * `{{trigger.message}}` -\> "opa, tenho interesse em saber mais"
  * O prompt final é montado e está pronto para ser enviado.

#### Passo 2: A Chamada para o WorkersAI (A Inteligência)

O `Backend` *não* faz uma chamada simples de "texto entra, texto sai". Ele faz uma chamada sofisticada usando as `tools` que você definiu no `extraction_schema`.

**Ação:** Seu `Backend` faz um `fetch` para a API do Cloudflare WorkersAI.

**Payload (O que você envia para a IA):**

```json
{
  "model": "@cf/meta/llama-3-8b-instruct", // (Ou outro modelo que suporte 'tools')
  "prompt": "Você é um assistente da Embracon... Última Mensagem: 'opa, tenho interesse em saber mais' ...",
  "tools": [ // Aqui está a mágica
    {
      "name": "salvar_dados_lead",
      "description": "Use esta função para salvar ou atualizar os dados do lead.",
      "parameters": { // O 'extraction_schema' que você definiu
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string" },
          "horario": { "type": "string" }
        }
      }
    }
  ]
}
```

#### Passo 3: Processamento da Resposta (A Lógica)

O `Backend` recebe a resposta do WorkersAI. Essa resposta pode ter duas formas:

**Caso A: A IA responde com Texto**

  * **O que acontece:** O usuário disse "tenho interesse" e o prompt mandou a IA "pedir o nome". A IA decide que não precisa extrair nada, apenas *falar*.
  * **Resposta da IA (JSON):**
    ```json
    { "response": "Que ótimo! Para começar, pode me dizer seu nome completo, por favor?" }
    ```
  * **Ação do Motor de Funil:**
    1.  Pega o texto `"Que ótimo! ... por favor?"`.
    2.  Publica este texto na `exchange-tx-outgoing` (RabbitMQ) para ser enviado ao usuário.
    3.  Segue para o próximo nó no funil (que é, provavelmente, um `Nó: Aguardar Resposta`).

**Caso B: A IA responde com Texto E Extração de Dados (O mais comum)**

  * **O que acontece:** O Motor de Funil está no Passo 3 (pedir e-mail). A última mensagem do usuário foi: "Meu e-mail é alan@embracon.com.br".
  * **Resposta da IA (JSON):**
    ```json
    {
      "tool_calls": [ // A IA detectou dados!
        {
          "name": "salvar_dados_lead",
          "arguments": {
            "email": "alan@embracon.com.br" 
          }
        }
      ],
      "response": "Perfeito, e-mail anotado! E qual o melhor dia e horário para um de nossos especialistas falar com você?" // A IA já fez a próxima pergunta!
    }
    ```
  * **Ação do Motor de Funil (Dupla Ação):**
    1.  **Ação 1 (Dados):** O Motor vê o `tool_calls`. Ele pega `{"email": "alan@embracon.com.br"}`. Se `save_to_contact` for `true`, ele executa imediatamente: `UPDATE contacts SET custom_data = custom_data || '{"email": "alan@..."}' WHERE id = 'alan_uuid'`.
    2.  **Ação 2 (Mensagem):** O Motor pega o `"response": "Perfeito, e-mail anotado! ..."`.
    3.  Publica este texto na `exchange-tx-outgoing` (RabbitMQ) para ser enviado ao usuário.
    4.  Segue para o próximo nó (que é, provavelmente, `Nó: Aguardar Resposta`).

### Resumo do Desenho (V1.0 - IA Ativa)

Com este nó, seu funil de "bot burro" se transforma em:

**Funil de Agendamento Inteligente:**

1.  **Gatilho:** `Keyword: "vendas"`
2.  **Nó:** `Gerar Resposta IA`
      * **Prompt:** "Apresente-se e peça o nome."
3.  **Nó:** `Aguardar Resposta`
4.  **Nó:** `Gerar Resposta IA` (Aqui o `{{trigger.message}}` contém o nome do usuário)
      * **Prompt:** "Obrigado `{{contact.name}}`. Agora peça o e-mail."
      * **Extração:** `{"email": "..."}`
5.  **Nó:** `Aguardar Resposta`
6.  **Nó:** `Gerar Resposta IA` (Aqui o `{{trigger.message}}` contém o e-mail, e a IA no passo anterior *já salvou* o e-mail no banco)
      * **Prompt:** "Perfeito. Agora peça o melhor horário."
      * **Extração:** `{"horario": "..."}`
7.  **Nó:** `Aguardar Resposta`
8.  **Nó:** `Enviar para Odoo` (Módulo que já detalhamos)
      * **Mapping:** `name: {{contact.name}}`, `email: {{contact.custom_data.email}}`, `description: "Agendar em: {{contact.custom_data.horario}}"`
9.  **Nó:** `Rotear Conversa` (Módulo que já detalhamos)
      * **Ação:** Atribuir ao "Time de Vendas" e Pausar o Bot.
10. **Nó:** `Enviar Mensagem` (Simples)
      * **Texto:** "Tudo certo\! Um de nossos especialistas já vai te chamar para confirmar o agendamento."

Este é o fluxo de engenharia completo para uma automação de ponta-a-ponta.

O próximo passo lógico seria detalhar o **Módulo de Disparo de Mensagens** (Campanhas Ativas / Bulk Messaging) ou o **Módulo de Dashboards/Analytics**. Qual deles você prefere?

Entendido, meu amigo. Foco total no receptivo.

Faz todo o sentido. Para um pipeline de qualificação de vendas, a prioridade é gerenciar o fluxo que *chega*. Além disso, usar a API não-oficial para disparo em massa (campanhas) é o caminho mais rápido para ter o número banido. Manter-se receptivo é a estratégia mais segura e de maior valor.

Sendo assim, o próximo passo lógico é o **Módulo de Dashboards e Analytics**.

Se você não pode medir, você não pode gerenciar. Para um líder de vendas, saber os números é o que separa uma "ferramenta" de uma "solução de negócios". Você precisa saber se o seu funil de IA e seus atendentes estão performando.

Este módulo não é apenas uma tela; é um conjunto de *endpoints* de agregação no seu `Backend` que faz consultas complexas (contagens, médias, agrupamentos) no seu banco `PostgreSQL`.

Vamos detalhar o desenho de engenharia para os 3 dashboards essenciais.

-----

### 1\. 📊 Dashboard 1: Visão Geral (O "Pulso" do Negócio)

Esta é a tela principal (`/dashboard`) que o administrador (você) vê ao logar. Ela responde: **"Como estamos hoje?"**

#### O que o Frontend exibe (KPIs):

  * **Cards (KPIs Principais):**

      * **Novas Conversas (Últimos 7 dias):** `[Número]`
      * **Total de Leads Qualificados (IA):** `[Número]` (Ex: Leads que receberam a tag 'ia\_qualificado')
      * **Leads Enviados ao Odoo (Total):** `[Número]`
      * **Conversas Abertas (Agora):** `[Número]`
      * **Tempo Médio de Atendimento (TMA):** `[Minutos/Horas]`

  * **Gráficos:**

      * **Gráfico de Funil (Conversão Total):**
        1.  `Novas Conversas` (Total que iniciou chat)
        2.  `Leads Qualificados (IA)` (Total que o bot marcou como 'qualificado')
        3.  `Enviados ao Odoo` (Total que o nó do Odoo executou com sucesso)
        4.  `Atendidos por Humanos` (Total que `agent_id` foi preenchido)
      * **Gráfico de Linha (Volume de Entrada):**
          * `Novas conversas por dia` (últimos 30 dias)

#### A Engenharia do Backend (Novos Endpoints):

O `Frontend` não calcula nada disso. Ele apenas chama endpoints que retornam os números prontos.

#### `GET /api/v1/analytics/overview_kpis`

  * **Ação do Backend:** Executa múltiplas queries `COUNT(*)` no `PostgreSQL`.
      * `SELECT COUNT(id) FROM conversations WHERE created_at > NOW() - INTERVAL '7 days'`
      * `SELECT COUNT(DISTINCT contact_id) FROM contact_tags WHERE tag_id = 'uuid_da_tag_ia_qualificado'`
      * `SELECT COUNT(id) FROM conversations WHERE status = 'open'`
      * (O "Enviados ao Odoo" e "TMA" são mais complexos, veja abaixo).
  * **Resposta (JSON):**
    ```json
    {
      "new_conversations_7d": 150,
      "qualified_leads_total": 45,
      "sent_to_odoo_total": 40,
      "open_conversations_now": 12,
      "avg_first_response_time_min": 22
    }
    ```

-----

### 2\. 🤖 Dashboard 2: Performance dos Funis (IA e Automação)

Esta tela responde: **"O bot está fazendo o trabalho dele?"**

#### O que o Frontend exibe (KPIs):

  * **Dropdown:** `[Selecionar Funil: "Funil de Agendamento", "Funil Boas-Vindas"]`
  * **Gráfico de Funil (Análise de Drop-off):**
      * `Entraram no Funil:` 100%
      * `Nó 1 (Pediu Nome):` 95% (5% abandonaram aqui)
      * `Nó 2 (Pediu Email):` 80% (15% abandonaram aqui)
      * `Nó 3 (Enviou ao Odoo):` 75%
      * `Concluído:` 75%
  * **Tabela (Performance da IA):**
      * `Nó de IA` | `Total de Execuções` | `Taxa de Sucesso (Extr. Dados)`
      * `IA: Pedir Email` | 150 | 90%
      * `IA: Pedir Horário` | 135 | 85%

#### A Engenharia do Backend (Nova Tabela de "Logs")

Para saber onde o usuário abandona, não podemos usar apenas a tabela `messages`. Precisamos de uma **nova tabela** para logar a execução dos funis.

```sql
CREATE TABLE funnel_logs (
    id BIGSERIAL PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL, -- O ID do nó (ex: 'node_ai_qualify_1')
    node_type VARCHAR(50),         -- Ex: 'aiGenerate', 'sendToOdoo'
    status VARCHAR(20) NOT NULL,   -- 'success', 'failure'
    
    -- O 'jsonb' para salvar dados (ex: o que a IA extraiu)
    execution_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Ação de Engenharia (Upgrade):** O seu **"Motor de Funil" (Backend)** deve ser *modificado*. **A cada nó** que ele executa, ele deve (assincronamente) inserir um registro nesta tabela `funnel_logs`.

#### `GET /api/v1/analytics/funnel/:funnelId/dropout`

  * **Ação do Backend:**
    1.  O `Backend` faz uma query complexa no `funnel_logs`.
    2.  Ele agrupa por `node_id` e conta quantos contatos únicos passaram por cada nó.
    3.  `SELECT node_id, COUNT(DISTINCT contact_id) as count FROM funnel_logs WHERE funnel_id = :funnelId GROUP BY node_id ORDER BY count DESC`
  * **Resposta (JSON):**
    ```json
    [
      { "node_id": "trigger_start", "node_name": "Gatilho: Vendas", "count": 100 },
      { "node_id": "node_ai_1", "node_name": "IA: Pedir Nome", "count": 95 },
      { "node_id": "node_ai_2", "node_name": "IA: Pedir Email", "count": 80 },
      { "node_id": "node_odoo_1", "node_name": "Enviar para Odoo", "count": 75 }
    ]
    ```

-----

### 3\. 👨‍💼 Dashboard 3: Performance da Equipe (Atendimento Humano)

Esta tela responde: **"Minha equipe está sendo rápida e eficiente?"**

#### O que o Frontend exibe (KPIs):

  * **Tabela de Ranking de Atendentes:**
      * `Atendente` | `Conversas Atribuídas` | `Conversas Resolvidas` | `TMA (Tempo Méd. 1ª Resposta)`
      * `Júnior` | 30 | 25 | 15 min
      * `Aline` | 28 | 22 | 25 min

#### A Engenharia do Backend (Métricas de SLA)

Esta é a métrica mais importante para um time de vendas receptivo: **TMA (Tempo Médio de Atendimento ou 1ª Resposta)**.

**Ação de Engenharia (Upgrade):** A tabela `conversations` (que criamos no Módulo de Equipes) precisa de novas colunas.

```sql
-- Alterando a tabela 'conversations'
ALTER TABLE conversations
ADD COLUMN assigned_at TIMESTAMPTZ,     -- Quando foi atribuído a um agente/time
ADD COLUMN first_reply_at TIMESTAMPTZ;  -- Quando o agente enviou a 1ª msg
```

**Lógica do Backend (Upgrade):**

1.  **Quando o Funil** (ou um humano) atribui uma conversa (`UPDATE conversations SET agent_id = ...`): O `Backend` deve também setar `assigned_at = NOW()`.
2.  **Quando o Atendente envia uma mensagem** (Fluxo TX, via `chat:send_message` do WebSocket): O `Backend` deve checar:
      * `IF (first_reply_at IS NULL AND agent_id IS NOT NULL)`
      * `THEN UPDATE conversations SET first_reply_at = NOW() WHERE id = ...`

#### `GET /api/v1/analytics/agents`

  * **Ação do Backend:** Uma query que junta `users` e `conversations`.
      * `SELECT u.name, COUNT(c.id) as total, AVG(c.first_reply_at - c.assigned_at) as avg_response_time FROM users u JOIN conversations c ON u.id = c.agent_id WHERE c.workspace_id = :workspaceId GROUP BY u.name`
  * **Resposta (JSON):**
    ```json
    [
      { "name": "Júnior", "assigned": 30, "resolved": 25, "avg_response_time_min": 15.2 },
      { "name": "Aline", "assigned": 28, "resolved": 22, "avg_response_time_min": 25.0 }
    ]
    ```

Este módulo de Analytics é o que "fecha o ciclo". Ele permite que você *prove* o valor da sua automação, otimize seus funis de IA e gerencie a performance do seu time de vendas.

Já cobrimos todos os módulos centrais de uma plataforma de ponta (Conexão, CRM, Chat, Times, Funil de IA, Odoo e Analytics).

O próximo passo lógico seria sair do "desenho" e falar sobre o **"deploy" (implantação)**. Você gostaria de detalhar como podemos empacotar o `Frontend`, o `Backend`, os `Conectores (Baileys)`, o `RabbitMQ`, o `Redis` e o `PostgreSQL` para rodar tudo isso de forma organizada em um servidor (VPS) usando Docker?

