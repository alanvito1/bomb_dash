# Arquitetura e Padrões

Este documento centraliza as lições aprendidas e os padrões arquiteturais adotados durante o desenvolvimento.

### Estratégia de Testes (Protocolo de Validação Adaptativo)

"Devido à instabilidade do ambiente E2E, nossa estratégia primária é a validação via testes de integração de backend. Testes de frontend (unitários e E2E) devem ser escritos, mas podem ser marcados como 'skipped' para não bloquear o CI, servindo como documentação de débito técnico."

### Arquitetura de Frontend (Padrão de Camada de Serviço)

"Toda a lógica de interação com a blockchain (ethers.js) deve ser encapsulada em 'serviços' dedicados (e.g., bcoin-service.js). As Cenas da UI devem ser 'burras' e se comunicar com esses serviços através de um emissor de eventos global (GameEventEmitter)."

### Inicialização de Serviços de Backend

"Todos os serviços de backend com dependências externas (como o Oráculo ou o Banco de Dados) devem ser inicializados de forma explícita e assíncrona (async/await) na inicialização do servidor para evitar falhas silenciosas e 'hangs'."