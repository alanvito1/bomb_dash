# Arquitetura e Padrões

Este documento centraliza as lições aprendidas e os padrões arquiteturais adotados durante o desenvolvimento para garantir consistência, manutenibilidade e a preservação do conhecimento do projeto.

---

### Título: Estratégia de Testes (Protocolo de Validação Adaptativo)

**Texto:** "Devido à instabilidade do ambiente E2E, nossa estratégia primária é a validação via testes de integração de backend. Testes de frontend (unitários e E2E) devem ser escritos, mas podem ser marcados como 'skipped' para não bloquear o CI, servindo como documentação de débito técnico."

---

### Título: Arquitetura de Frontend (Padrão de Camada de Serviço)

**Texto:** "Toda a lógica de interação com a blockchain (ethers.js) deve ser encapsulada em 'serviços' dedicados (e.g., bcoin-service.js). As Cenas da UI devem ser 'burras' e se comunicar com esses serviços através de um emissor de eventos global (GameEventEmitter)."

---

### Título: Inicialização de Serviços de Backend

**Texto:** "Todos os serviços de backend com dependências externas (como o Oráculo ou o Banco de Dados) devem ser inicializados de forma explícita e assíncrona (async/await) na inicialização do servidor para evitar falhas silenciosas e 'hangs'."