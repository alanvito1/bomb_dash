const { ethers } = require('ethers');
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
}

generateSecureWallet();
