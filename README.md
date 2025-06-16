# Bomb Dash - Refatoração Backend

Este projeto é uma refatoração do jogo "Bomb Dash" para mover sua arquitetura de um modelo puramente client-side para um modelo cliente-servidor seguro e robusto.

## Arquitetura

A nova arquitetura consiste em:

*   **Frontend (Client-Side):** Construído com Phaser.js, responsável pela interface do jogo, interações do usuário e renderização. Toda a lógica de negócios crítica, como autenticação e gerenciamento de pontuações, foi removida do cliente. Ele agora se comunica com o backend através de uma API REST.
*   **Backend (Server-Side):** Construído com Node.js e Express.js, este servidor é a única fonte de verdade para dados de usuários e pontuações. Ele se conecta a um banco de dados SQLite (`ranking.sqlite`) para persistência de dados.

## Segurança Implementada

A refatoração aborda as seguintes vulnerabilidades da arquitetura original:

1.  **Centralização da Lógica:** Toda a validação de dados, autenticação de usuários e atualizações de pontuação agora ocorrem no servidor. Isso impede que jogadores manipulem suas pontuações ou dados de conta diretamente no navegador.
2.  **Hashing de Senhas (PINs):** Os PINs dos usuários são processados com `bcrypt` antes de serem armazenados no banco de dados. Isso significa que, mesmo que o banco de dados seja comprometido, as senhas originais não podem ser facilmente recuperadas.
3.  **Tokens de Sessão (JWT):** Após o login bem-sucedido, o servidor gera um JSON Web Token (JWT) que é enviado ao cliente. Este token é usado para autenticar requisições subsequentes (como o envio de pontuações), garantindo que apenas usuários autenticados possam realizar ações protegidas.

## Configuração e Execução

### Pré-requisitos

*   Node.js (versão 12.x ou superior recomendada)
*   npm (geralmente vem com o Node.js)
*   Um servidor web para servir os arquivos do frontend (ex: Live Server do VSCode, http-server do npm, ou configurar o Express para servir arquivos estáticos).

### Backend

1.  **Clone o repositório:**
    ```bash
    git clone <url-do-seu-repositorio>
    cd <nome-do-repositorio>
    ```

2.  **Navegue até o diretório do backend:**
    ```bash
    cd backend
    ```

3.  **Instale as dependências:**
    ```bash
    npm install
    ```

4.  **Variáveis de Ambiente (Opcional, mas recomendado para produção):**
    Crie um arquivo `.env` dentro da pasta `backend/` para configurar o `JWT_SECRET`:
    ```env
    JWT_SECRET=suaChaveSecretaSuperForteEF lungaAquiPeloMenos32Caracteres
    PORT=3001 # Opcional, padrão é 3000
    ```
    Lembre-se de adicionar `.env` ao seu arquivo `.gitignore` se ainda não estiver lá. Se a variável `JWT_SECRET` não for definida, uma chave padrão será usada (inseguro para produção).

5.  **Inicie o servidor backend:**
    ```bash
    node server.js
    ```
    Ou, se você tiver `nodemon` instalado globalmente (para desenvolvimento, reinicia automaticamente em mudanças):
    ```bash
    nodemon server.js
    ```
    O servidor backend estará rodando em `http://localhost:3000` (ou a porta que você configurou). O banco de dados `ranking.sqlite` será criado automaticamente no diretório `backend/` na primeira execução.

### Frontend

1.  **Servir os arquivos do jogo:**
    O frontend consiste em arquivos HTML, CSS e JavaScript (incluindo o Phaser.js) que estão na raiz do projeto e no diretório `src/`.
    Você precisará de um servidor HTTP para servi-los. Uma maneira fácil é usar o `http-server`:

    *   Se não tiver, instale globalmente: `npm install -g http-server`
    *   Navegue até a raiz do projeto (o diretório que contém `index.html`):
        ```bash
        cd .. # Se você estiver em backend/
        # ou navegue para o diretório raiz do projeto
        ```
    *   Inicie o servidor:
        ```bash
        http-server . -p 8080
        ```
    *   Abra seu navegador e acesse `http://localhost:8080` (ou a porta que o `http-server` indicar).

2.  **Configuração da URL da API no Cliente:**
    O arquivo `src/api.js` contém uma constante `BASE_URL` configurada como `http://localhost:3000/api`. Se o seu backend estiver rodando em uma URL ou porta diferente, você precisará ajustar esta constante.

## Como Rodar em um Servidor de Hospedagem (Ex: HostGator)

Hospedar uma aplicação Node.js como o backend do Bomb Dash em plataformas como a HostGator geralmente envolve o uso de um ambiente que suporte Node.js, como VPS (Servidor Privado Virtual) ou através de painéis de controle que oferecem setup de aplicações Node.js (ex: cPanel com "Setup Node.js App").

**Passos Gerais (podem variar dependendo do plano e painel da HostGator):**

1.  **Acesso ao Servidor:**
    *   Você precisará de acesso SSH ao seu servidor se for um VPS, ou acesso ao cPanel.

2.  **Upload dos Arquivos:**
    *   Envie os arquivos do seu projeto para o servidor. Normalmente, você enviaria todo o conteúdo da pasta `backend/`. Você pode fazer isso via FTP/SFTP (FileZilla) ou usando `git clone` diretamente no servidor.

3.  **Instalação do Node.js (se necessário):**
    *   Em um VPS, você pode precisar instalar o Node.js manualmente.
    *   No cPanel, a ferramenta "Setup Node.js App" geralmente permite que você escolha uma versão do Node.js.

4.  **Configuração da Aplicação Node.js no Painel (Ex: cPanel):**
    *   Acesse "Setup Node.js App" ou similar.
    *   Crie uma nova aplicação.
    *   **Application root:** Especifique o caminho para a pasta `backend` que você enviou (ex: `/home/seuusuario/bombdash/backend`).
    *   **Application URL:** Defina o subdomínio ou domínio que servirá sua API (ex: `api.seusite.com`).
    *   **Application startup file:** Especifique `server.js`.
    *   **Variáveis de Ambiente:** Adicione a variável `JWT_SECRET` com sua chave segura. Você também pode precisar definir `PORT` se a hospedagem exigir que sua aplicação escute em uma porta específica fornecida pelo ambiente deles (muitas vezes eles gerenciam a porta externamente e expõem via porta 80/443). Se a hospedagem gerencia a porta, você pode precisar remover a parte `process.env.PORT || 3000` e deixar o Node.js usar a porta que o ambiente da HostGator designar. Consulte a documentação da HostGator para isso.
    *   Clique em "Create".

5.  **Instalar Dependências no Servidor:**
    *   Após criar a aplicação, o painel geralmente oferece um comando para rodar `npm install` (ou você pode fazer isso via terminal SSH na pasta `backend`).

6.  **Iniciar a Aplicação:**
    *   Use o botão "Start App" no painel.
    *   Verifique os logs para quaisquer erros.

7.  **Configurar o Frontend:**
    *   Os arquivos do frontend (`index.html`, `src/`, etc.) podem ser hospedados como um site estático normal no mesmo servidor (ex: na pasta `public_html` do seu domínio principal ou de um subdomínio).
    *   **IMPORTANTE:** Atualize a constante `BASE_URL` em `src/api.js` no seu código frontend para apontar para a URL pública da sua API backend (ex: `https://api.seusite.com/api`). Recompile/re-uploade o frontend com essa mudança.

8.  **Gerenciador de Processos (PM2):**
    *   Para manter sua aplicação Node.js rodando continuamente e reiniciá-la em caso de falhas, use um gerenciador de processos como o PM2.
    *   Se estiver em um VPS, instale o PM2: `npm install pm2 -g`.
    *   Na pasta `backend`, inicie sua aplicação com PM2: `pm2 start server.js --name bombdash-api`.
    *   Use `pm2 startup` para gerar um script que reinicia o PM2 e suas aplicações no boot do servidor.
    *   Muitas ferramentas "Setup Node.js App" em painéis de controle já usam algo similar ao PM2 por baixo dos panos (geralmente Phusion Passenger).

9.  **Domínio e SSL:**
    *   Configure seu domínio/subdomínio para apontar para a aplicação Node.js (geralmente feito automaticamente pelo painel ao definir a Application URL).
    *   Instale um certificado SSL (Let's Encrypt é uma boa opção gratuita, frequentemente disponível via cPanel) para usar HTTPS, o que é crucial para a segurança.

**Considerações para HostGator:**
*   Planos de hospedagem compartilhada mais básicos da HostGator podem não suportar aplicações Node.js diretamente ou ter limitações severas. Um VPS ou um plano específico para aplicações Node.js é geralmente necessário.
*   Verifique a documentação específica da HostGator para o seu tipo de plano, pois os passos exatos podem variar.

---

Este `README.md` deve fornecer uma boa base para entender, rodar e implantar o projeto.
