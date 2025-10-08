# Protocolo Fênix: Framework de Desenvolvimento e Validação

Este documento define o processo padrão para todas as tarefas de desenvolvimento no projeto Bomb Dash Web3.

## O Ciclo de Vida de uma Diretiva

Toda nova tarefa seguirá este ciclo de 5 etapas:

1.  **Emissão da Diretiva (por Helios):** O Arquiteto emitirá uma solicitação completa, detalhando o briefing, a análise de risco, as considerações para Mainnet e o plano de ação. Toda diretiva seguirá o padrão definido em TEMPLATE_DIRETIVA.md.
2.  **Planejamento do Agente (por Jules):** Antes de codificar, o agente deve apresentar um plano de ação detalhado para aprovação.
3.  **Execução e Validação (por Jules):** O agente executa o plano, priorizando a validação na seguinte ordem: Testes de Integração de Backend > Testes de Unidade de Frontend > Scripts de Teste E2E (que podem ser marcados como 'skipped').
4.  **Submissão e Revisão (por Jules):** O agente submete um Pull Request com um commit message detalhado.
5.  **Validação Final (pelo Operador Humano):** O operador humano realiza a validação final (execução de testes locais, verificação manual) e dá o "sinal verde".