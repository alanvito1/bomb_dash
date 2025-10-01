# Bomb Dash Web3 - Manual de Deploy e Operação (V2.0 - Testnet)

Este documento fornece um guia passo a passo para implantar, configurar e operar o ambiente completo do Bomb Dash Web3 na **Binance Smart Chain (BSC) Testnet**.

## 1. Configuração do Ambiente de Desenvolvimento

### 1.1. Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto. Este arquivo é crucial para armazenar chaves privadas e URLs de API de forma segura.

**NUNCA adicione o arquivo `.env` ao controle de versão (Git).**

```bash
# URL do RPC para a BSC Testnet. Você pode obter uma em serviços como Infura, Ankr ou QuickNode.
TESTNET_RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545/"

# A chave privada da carteira que será usada para implantar os contratos.
# IMPORTANTE: Use uma carteira de desenvolvimento, NUNCA uma carteira com fundos reais.
PRIVATE_KEY="SUA_CHAVE_PRIVADA_AQUI"

# Chave secreta para a assinatura de tokens JWT no backend.
JWT_SECRET="seu-segredo-super-forte-aqui"

# Segredo para acessar o painel de administrador.
ADMIN_SECRET="supersecret"

# Endereço da carteira do Oráculo que irá reportar os resultados aos contratos.
ORACLE_PRIVATE_KEY="SUA_CHAVE_PRIVADA_DO_ORACULO_AQUI"

# Endereços dos contratos (serão preenchidos após o deploy)
TOURNAMENT_CONTROLLER_ADDRESS=""
PERPETUAL_REWARD_POOL_ADDRESS=""
WAGER_ARENA_ADDRESS=""
```

### 1.2. Instalação de Dependências

O projeto possui dependências tanto na raiz (para Hardhat) quanto no backend.

Para uma instalação inicial ou para atualizar dependências, use `npm install`:
```bash
# Instalar dependências do Hardhat e do projeto principal
npm install

# Instalar dependências do backend
npm install --prefix backend
```

**Nota sobre Instalação Limpa:** Para garantir que todos os desenvolvedores e servidores usem as mesmas versões exatas de pacotes, é recomendado usar `npm ci` para instalações limpas e reproduzíveis, que se baseiam no arquivo `package-lock.json`.

```bash
# Exemplo de instalação limpa para garantir consistência
npm ci
npm ci --prefix backend
```

## 2. Configuração da Carteira MetaMask

Para interagir com o jogo na Testnet, você precisará configurar sua carteira MetaMask.

1.  Abra a MetaMask e clique no seletor de redes (geralmente no topo).
2.  Clique em "Adicionar Rede" (Add Network).
3.  Preencha os seguintes detalhes:
    *   **Nome da Rede:** BSC Testnet
    *   **Nova URL RPC:** `https://data-seed-prebsc-1-s1.binance.org:8545/`
    *   **ID da Cadeia:** `97`
    *   **Símbolo da Moeda:** `tBNB`
    *   **URL do Block Explorer:** `https://testnet.bscscan.com`
4.  Salve a rede.

### 2.1. Obtendo tBNB (BNB de Teste)

Você precisará de `tBNB` para pagar as taxas de gás (gas fees) na Testnet. Você pode obtê-lo gratuitamente em "faucets":

*   **Faucet Oficial da BSC:** [https://testnet.binance.org/faucet-smart](https://testnet.binance.org/faucet-smart)
*   **Faucet da Chainlink:** [https://faucets.chain.link/bnb-chain-testnet](https://faucets.chain.link/bnb-chain-testnet)

## 3. Deploy dos Smart Contracts

Com o arquivo `.env` configurado e sua carteira com `tBNB`, você pode implantar os contratos na BSC Testnet.

Execute o seguinte comando na raiz do projeto:

```bash
npx hardhat run scripts/deploy.ts --network bscTestnet
```

Após a execução, o script irá imprimir os endereços dos contratos implantados. **Copie esses endereços e cole-os nas variáveis correspondentes no seu arquivo `.env`**.

## 4. Executando o Servidor Backend

O servidor backend lê as variáveis de ambiente (incluindo os endereços dos contratos) para se conectar e interagir com a blockchain.

### Usando Node (Desenvolvimento)

Para iniciar o servidor diretamente com Node.js:

```bash
node backend/server.js
```

### Usando Docker (Produção/Staging)

O projeto inclui um `Dockerfile` e `docker-compose.yml` para facilitar o deploy em produção.

1.  **Build da Imagem:**
    ```bash
    docker-compose build
    ```
2.  **Iniciar os Contêineres:**
    ```bash
    docker-compose up -d
    ```
    *Nota: Certifique-se de que o seu `docker-compose.yml` está configurado para passar as variáveis de ambiente do arquivo `.env` para o contêiner.*

## 5. Acessando a Aplicação

*   **Jogo Principal:** Abra o arquivo `index.html` em um navegador com a MetaMask instalada e conectada à BSC Testnet.
*   **Painel de Administrador:** Acesse `http://localhost:3000/admin.html` (ou o endereço do seu servidor). Você será solicitado a inserir o `ADMIN_SECRET` que você definiu no arquivo `.env`.