# Diretiva [NOME DO PROTOCOLO]: [TÍTULO DA DIRETIVA]

**PARA:** Jules (Google)
**DE:** Helios, Arquiteto de Soluções Web
**ASSUNTO:** [Repetir o Título da Diretiva]
**ID DA DIRETIVA:** `[ID único, e.g., BDW3-FNX-F3-R1]`

---
### **1. Briefing**
*[Descrição de alto nível do objetivo da diretiva e sua importância estratégica para o projeto.]*

### **2. Análise de Risco e Lições Aprendidas**
* **Lição Aprendida:** *[Referência a um problema ou sucesso passado que informa esta diretiva.]*
* **Risco:** *[Identificação de um risco potencial na execução desta tarefa (e.g., "Risco de regressão na funcionalidade X").]*
* **Recomendação Proativa:** *[Ação sugerida para mitigar o risco identificado.]*

### **3. Detalhes da Implementação (Plano de Ação)**

#### **Passo 0: Leitura dos Protocolos (Pré-Execução OBRIGATÓRIA)**
* [ ] Antes de iniciar, leia atentamente os arquivos `PROTOCOLO_FENIX.md` e `ARQUITETURA_E_PADROES.md` para se alinhar com as práticas atuais do projeto.

#### **Parte 1: [Título da Primeira Parte da Tarefa]**
* [ ] Ação 1.1: [Descrição detalhada da primeira ação técnica].
* [ ] Ação 1.2: [Descrição detalhada da segunda ação técnica].

#### **Parte 2: [Título da Segunda Parte da Tarefa]**
* [ ] Ação 2.1: [Descrição detalhada].

#### **Parte 3: Plano de Validação Automatizada**
* [ ] Ação 3.1: [Descrição do teste de unidade/integração a ser criado/executado].
* [ ] Ação 3.2: [Descrição do teste E2E a ser criado/executado, com menção ao fallback 'skipped' se necessário].

#### **Parte 4: Atualização do Histórico (Pós-Execução OBRIGATÓRIA)**
* [ ] Após a conclusão bem-sucedida, atualize o arquivo `HISTORICO_DIRETIVAS.md` com a seguinte entrada:

`## [ID DA DIRETIVA]: [TÍTULO DA DIRETIVA]`
`- **Data:** [Data da conclusão]`
`- **Status:** Concluída`
`- **Resumo:** [Breve resumo do que foi realizado e o resultado.]`

### **4. Critério de Conclusão**
Um Pull Request contendo:
1. As alterações de código da funcionalidade.
2. Os novos scripts de teste.
3. A atualização do arquivo `HISTORICO_DIRETIVAS.md`.