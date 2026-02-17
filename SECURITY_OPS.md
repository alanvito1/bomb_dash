# OPERAÇÕES DE SEGURANÇA (SECURITY OPS)

Este documento descreve os procedimentos padrão para a geração segura de carteiras e gerenciamento de chaves privadas para a infraestrutura do **Bomb Dash Web3**, especificamente para o **Oráculo** e **Admin**.

---

## 🔐 1. Geração de Carteira Segura (Oráculo)

Para garantir a integridade do jogo, a carteira do Oráculo deve ser gerada em um ambiente isolado e nunca reutilizada de outros projetos.

### Script de Geração (Node.js)

Utilize o script abaixo para gerar uma nova carteira compatível com EVM (Ethereum/BSC) de forma offline.

**Arquivo: `scripts/generate_wallet.js`**

```javascript
const { ethers } = require('ethers');
const fs = require('fs');
const crypto = require('crypto');

function generateSecureWallet() {
    console.log("🔐 Gerando Nova Carteira Segura...");

    // 1. Entropia Adicional (Opcional, mas recomendado)
    const extraEntropy = crypto.randomBytes(32);

    // 2. Criação da Carteira
    const wallet = ethers.Wallet.createRandom(extraEntropy);

    console.log("\n✅ Carteira Gerada com Sucesso!");
    console.log("---------------------------------------------------");
    console.log(`📍 Endereço (Público): ${wallet.address}`);
    console.log("---------------------------------------------------");
    console.log("⚠️  ATENÇÃO: A CHAVE PRIVADA ABAIXO DÁ ACESSO TOTAL AOS FUNDOS E PODERES DESTA CONTA.");
    console.log("⚠️  NUNCA A COMPARTILHE, NEM COM A EQUIPE DE SUPORTE.");
    console.log("---------------------------------------------------");
    console.log(`🔑 Chave Privada:      ${wallet.privateKey}`);
    console.log("---------------------------------------------------");
    console.log(`📝 Mnemonic (Seed):    ${wallet.mnemonic.phrase}`);
    console.log("---------------------------------------------------");

    // 3. Salvar (Opcional - Cuidado com permissões de arquivo!)
    // fs.writeFileSync('oracle_wallet.json', JSON.stringify({
    //     address: wallet.address,
    //     privateKey: wallet.privateKey,
    //     mnemonic: wallet.mnemonic.phrase
    // }, null, 2));
}

generateSecureWallet();
```

### Como Executar

1.  Certifique-se de ter as dependências instaladas:
    ```bash
    npm install ethers
    ```
2.  Execute o script:
    ```bash
    node scripts/generate_wallet.js
    ```
3.  **Copie a Chave Privada** imediatamente para seu gerenciador de senhas (ex: 1Password, Bitwarden) ou variáveis de ambiente (`.env`).
4.  **Limpe o terminal** (`clear` ou `cls`) após o uso para evitar que a chave fique no histórico visual.

---

## 🛡️ 2. Rotação de Chaves (Key Rotation)

Recomenda-se rotacionar a chave do Oráculo a cada **90 dias** ou imediatamente após qualquer suspeita de comprometimento.

1.  Gere uma nova carteira usando o procedimento acima.
2.  Atualize a variável `ORACLE_PRIVATE_KEY` na Vercel.
3.  No contrato `HeroStaking`, chame a função `setOracle(novoEndereco)` usando a conta de Admin (Deployer).
4.  Verifique se o backend reiniciou e está utilizando o novo endereço.

---

## 🔒 3. Boas Práticas de Variáveis de Ambiente

*   **Nunca faça commit do arquivo `.env`**. Use `.gitignore`.
*   Na Vercel, use a feature de **Environment Variables** encriptadas.
*   Para desenvolvimento local, use um `.env.local` que não é versionado.
*   Evite logs que imprimam `process.env` ou chaves privadas. O Logger AVRE remove segredos conhecidos, mas cuidado redobrado é necessário.

---
*Assinado: Jules, Eng. de Software Sênior.*
