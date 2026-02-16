# Protocolo Fênix

## Visão Geral

O Protocolo Fênix é um processo de desenvolvimento iterativo projetado para garantir a entrega de valor de forma consistente e de alta qualidade. Cada ciclo de desenvolvimento, ou "voo da fênix", passa por cinco fases distintas, assegurando que cada nova funcionalidade ou correção seja bem planejada, executada e validada.

## As 5 Fases do Protocolo

### 1. Emissão (Ignition)

- **Objetivo:** Definir o "porquê".
- **Descrição:** A fase inicial onde uma nova demanda (feature, bug fix, etc.) é identificada e formalizada. O Product Owner ou o líder técnico emite uma **Diretiva**, um documento claro e conciso que descreve o problema a ser resolvido, o valor esperado e os critérios de aceitação.

### 2. Planejamento (Blueprint)

- **Objetivo:** Definir o "como".
- **Descrição:** O engenheiro de software (Jules) recebe a Diretiva e realiza uma análise técnica aprofundada. O resultado é um **Plano de Ação** detalhado, quebrando a Diretiva em passos executáveis e estimando o esforço. Este plano é revisado e aprovado antes do início do desenvolvimento.

### 3. Execução (Rebirth)

- **Objetivo:** Construir a solução.
- **Descrição:** A fase de desenvolvimento principal. O engenheiro executa o Plano de Ação, escrevendo o código, criando os testes unitários e de integração, e garantindo que a implementação adere aos padrões de arquitetura e qualidade do projeto. A comunicação é contínua, e o plano pode ser ajustado conforme necessário.

### 4. Submissão (Ascension)

- **Objetivo:** Integrar e revisar.
- **Descrição:** O código completo é submetido através de um Pull Request (PR). Este PR aciona a pipeline de Integração Contínua (CI), que executa todos os testes automatizados. Revisores (pares ou líderes técnicos) analisam o código em busca de melhorias, bugs ou desalinhamentos com o plano.

### 5. Validação Final (Apotheosis)

- **Objetivo:** Garantir a prontidão para o deploy.
- **Descrição:** Após a aprovação do PR e o merge na branch principal (`development` ou `main`), uma rodada final de testes de aceitação do usuário (UAT) e testes de regressão é conduzida no ambiente de staging. Apenas após a validação bem-sucedida nesta fase, a mudança é considerada "concluída" e pronta para ser incluída na próxima release para produção.
