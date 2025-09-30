# Bomb Dash Web3 - Manual de Deploy e Operação (V1.0)

Este documento fornece um guia passo a passo para implantar e manter o servidor do Bomb Dash Web3 utilizando Docker.

## 1. Pré-requisitos

Antes de começar, certifique-se de que você tem os seguintes softwares instalados em sua máquina de produção:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## 2. Configuração

A aplicação é configurada através de variáveis de ambiente. O `docker-compose.yml` já define as variáveis mais importantes, mas você pode customizá-las ou adicionar outras conforme necessário.

### Arquivo `.env` (Opcional)

Para uma gestão mais fácil, você pode criar um arquivo `.env` na raiz do projeto para sobrescrever ou adicionar variáveis de ambiente.

Exemplo de arquivo `.env`:

```bash
# O caminho para o banco de dados dentro do container (geralmente não precisa ser alterado)
DB_PATH=/app/data/ranking.sqlite

# Chave secreta para a assinatura de tokens JWT. Use um valor forte e seguro.
JWT_SECRET=seu-segredo-super-forte-aqui

# Porta em que o servidor backend irá rodar
PORT=3000

# (Adicionar outras variáveis de ambiente se necessário, como chaves de API, etc.)
```

## 3. Build da Aplicação

Com o Docker e o Docker Compose instalados, o primeiro passo é buildar a imagem da aplicação. Este comando irá baixar a imagem base do Node.js, instalar as dependências do `npm` e copiar o código da aplicação para dentro da imagem.

Execute o seguinte comando na raiz do projeto:

```bash
docker-compose build
```

## 4. Deploy da Aplicação

Após o build ser concluído com sucesso, você pode iniciar os contêineres em modo "detached" (em segundo plano).

Execute o seguinte comando:

```bash
docker-compose up -d
```

O serviço `backend` estará agora rodando e acessível na porta `3000` (ou na porta que você configurou). O banco de dados SQLite será persistido no volume `ranking_data`, garantindo que os dados não sejam perdidos ao reiniciar os contêineres.

## 5. Comandos de Manutenção

Aqui estão alguns comandos úteis para gerenciar a aplicação em execução.

### Visualizar Logs

Para visualizar os logs do backend em tempo real:

```bash
docker-compose logs -f backend
```

### Parar a Aplicação

Para parar os contêineres sem remover os volumes (seus dados serão mantidos):

```bash
docker-compose down
```

### Reiniciar a Aplicação

Se você precisar reiniciar os serviços:

```bash
docker-compose restart
```

### Status dos Contêineres

Para verificar o status dos contêineres em execução:

```bash
docker-compose ps
```