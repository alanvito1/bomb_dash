# Registro de Aprendizados e Decisões Estratégicas

Este documento registra as decisões importantes tomadas durante o ciclo de vida do projeto, a lógica por trás delas e os resultados.

## 1. Evolução do Escopo vs. Documentação (Marco v1.0)

**Decisão:** Durante a fase de finalização da v1.0, foi identificado um grande desalinhamento entre o escopo documentado (`BRIEFING.md`, `TECHNICAL_BRIEFING.md`) e o código implementado. Vários sistemas complexos (Hero Staking, Altar de Buffs, XP Wager) foram totalmente desenvolvidos, mas não faziam parte do escopo original. Em contrapartida, a funcionalidade central de torneios multi-player estava incompleta no backend.

**Ação Tomada:** Em vez de remover as funcionalidades não documentadas, a decisão estratégica foi **incorporá-las oficialmente ao escopo da v1.0**. A lógica foi que esses sistemas já estavam funcionais e agregavam valor significativo ao ecossistema do jogo. A prioridade foi então completar a funcionalidade de torneios que faltava e, em seguida, atualizar toda a documentação para refletir o estado real e completo do projeto.

**Resultado:** O projeto v1.0 foi entregue com um escopo maior e mais rico do que o planejado inicialmente. Isso exigiu um esforço concentrado de alinhamento de documentação no final do ciclo para garantir a consistência.

## 2. Instabilidade Crônica dos Testes End-to-End (E2E)

**Problema:** Ao longo do desenvolvimento, a suíte de testes E2E com Playwright demonstrou ser extremamente frágil e propensa a falhas de timeout. A causa raiz foi identificada como uma "colisão silenciosa" entre o servidor de desenvolvimento Vite e o motor do Phaser. A simples adição de novos arquivos de cena (mesmo que vazios ou sintaticamente perfeitos) impedia o jogo de inicializar no ambiente de teste do Playwright, resultando em uma tela preta e timeouts, embora o jogo funcionasse normalmente no navegador.

**Ações de Mitigação Tentadas:**

- Aumento dos tempos de espera (timeouts).
- Instalação e reinstalação de dependências do Playwright.
- Limpeza do cache do Vite (`node_modules/.vite`).
- Depuração sistemática, isolando cenas e importações.

**Decisão Estratégica:** Dado que a resolução do problema de E2E exigiria uma investigação profunda e potencialmente demorada na configuração do Vite/Phaser, o que bloquearia a entrega da v1.0, a decisão foi **priorizar a validação manual para as novas interfaces de usuário** (como o lobby de torneios). Uma nova estratégia de testes automatizados foi implementada, focando em:

1.  **Health Checks:** Scripts rápidos para verificar se o jogo "bota" corretamente.
2.  **Smoke Tests:** Testes mínimos para garantir que as cenas principais carregam.
3.  **Testes de Integração:** Testes mais focados em fluxos específicos com mocking pesado.

**Resultado:** A validação da v1.0 foi concluída com sucesso através de uma combinação de testes de backend, testes de fumaça e validação manual. A estabilização completa da suíte de testes E2E foi movida como um item de alta prioridade para o roadmap pós-v1.0. Isso permitiu que o projeto avançasse sem comprometer a qualidade da entrega, ao mesmo tempo em que se reconheceu e documentou uma dívida técnica a ser resolvida.
