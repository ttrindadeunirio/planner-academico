# Planner Acadêmico

## 1. Introdução

### 1.1 Contexto do Trabalho
A vida acadêmica no ensino superior exige que o estudante gerencie simultaneamente múltiplas disciplinas, prazos de entrega, avaliações e, crucialmente, o controle de frequência. A falta de uma ferramenta centralizada que integre o calendário de eventos com o acompanhamento de desempenho resulta, muitas vezes, em desorganização, perda de prazos e até reprovações por falta, uma vez que o limite de 25% de ausências é rigoroso e difícil de monitorar manualmente.

A construção deste sistema justifica-se pela necessidade de transformar a organização do estudante em um processo visual e intuitivo. Ao unir em uma única plataforma web o controle de notas, a visualização de frequência e uma agenda interativa, o Planner Acadêmico busca reduzir a carga cognitiva do aluno, permitindo que ele foque no aprendizado enquanto o sistema cuida do monitoramento de suas métricas de sucesso e assiduidade.

### 1.2 Objetivo
O objetivo geral deste trabalho é desenvolver uma plataforma de planejamento acadêmico voltada para estudantes, que centralize informações críticas do semestre letivo. Objetivos específicos:

* Implementar uma agenda interativa para visualização de compromissos acadêmicos e feriados.
* Criar um sistema de gerenciamento de notas com cálculo automático de médias.
* Desenvolver ferramentas visuais de monitoramento de desempenho, incluindo a comparação com médias da turma e o controle preventivo do limite de faltas.
* Garantir que os dados do estudante fiquem disponíveis localmente no navegador através de localStorage, com sincronização opcional por chave de acesso.

### 1.3 Minimundo
O sistema, denominado Planner Acadêmico, funciona como uma central de controle para o estudante. O fluxo inicia-se diretamente na Agenda em formato de calendário, onde o aluno pode visualizar feriados nacionais e compromissos acadêmicos (como provas e trabalhos), além de filtrar a exibição desses eventos por disciplina (ex: Álgebra Linear, PI1, TP). Os dados são salvos no localStorage do próprio navegador e podem ser sincronizados opcionalmente por uma chave de acesso anônima.

Na seção de Notas, o usuário pode cadastrar suas disciplinas e inserir as notas de diferentes avaliações (P1, P2, Projetos). O sistema calcula automaticamente a média parcial e final, indicando a situação do aluno.

O diferencial reside no Relatório de Desempenho, onde os dados são processados e exibidos graficamente. O sistema apresenta barras de comparação entre a nota do aluno e a média da turma, um gráfico de pizza que segmenta o total de presenças e faltas por matéria, e "trilhos verticais" de progresso que alertam visualmente o quão próximo o estudante está de atingir o limite de faltas permitido pela instituição. O sistema permite ainda a edição e remoção de registros, garantindo que o planner reflita sempre a situação atual do semestre.

---

## 2. Visão Geral do Sistema

### 2.1 Escopo do sistema
O sistema Planner Acadêmico compreende o desenvolvimento de uma interface web para autogestão estudantil.

**O que será incluído:**
* **Persistência Local:** Armazenamento dos dados acadêmicos no localStorage do navegador, sem cadastro ou login.
* **Sincronização Automática:** Uso de uma chave de acesso aleatória para criptografar no navegador com AES-GCM/PBKDF2-SHA256, salvar alterações e carregar dados automaticamente em uma planilha privada via Google Apps Script.
* **Gestão de Agenda:** Visualização em calendário de eventos acadêmicos, tarefas e feriados, com filtros por categoria.
* **Gerenciamento Acadêmico (CRUD):** Inserção, edição e exclusão de disciplinas, notas e contagem de faltas.
* **Dashboard de Desempenho:** Geração automática de indicadores visuais (gráficos de barras e pizza) baseados nos dados inseridos pelo usuário.
* **Cálculos Automáticos:** Cálculo de médias finais e projeção de limite de faltas baseado na carga horária da disciplina.

**Limitações e o que NÃO será construído:**
* **Integração com Sistemas Oficiais:** O sistema não realizará sincronização automática com o SIE ou Portal do Aluno da instituição (os dados devem ser inseridos manualmente pelo usuário).
* **Rede Social:** Não haverá interação direta entre alunos ou compartilhamento de materiais dentro da plataforma.
* **Notificações Externas:** O sistema não enviará e-mails ou SMS de alerta; as notificações são estritamente visuais dentro da interface web.

### 2.2 Glossário do Sistema

| Sigla / Termo | Definição |
| :--- | :--- |
| **AL** | Álgebra Linear. |
| **CRUD** | Acrônimo para *Create, Read, Update and Delete* (operações básicas de banco de dados). |
| **Dashboard** | Painel visual que centraliza indicadores e métricas de desempenho. |
| **GPN** | Gestão de Processos de Negócios. |
| **Limite de Faltas** | Percentual máximo de ausências permitido (ex: **25%**) antes da reprovação. |
| **PI1** | Projeto Integrador I. |
| **TP** | Técnicas de Programação. |

### 2.3 Atores do Sistema
* **Estudante (Ator Principal):** Usuário que utiliza o sistema localmente para organizar sua rotina. Suas funções incluem: inserir notas, gerenciar faltas, adicionar compromissos à agenda e monitorar seu próprio progresso através dos gráficos.
* **Administrador (Ator de Suporte):** Responsável pela manutenção técnica do sistema, gerenciamento da base de dados e atualização de feriados fixos no calendário global.

---

## 3. Protótipo Inicial do Sistema

### 3.1 Breve Resumo das principais funções do sistema
O Planner Acadêmico é uma ferramenta de gestão de tempo e desempenho estudantil que integra três pilares fundamentais: organização de prazos, controle de avaliações e monitoramento de assiduidade. O sistema permite que o aluno centralize sua rotina acadêmica em uma interface única, eliminando a fragmentação de informações.

Suas funções primordiais incluem a gestão de um calendário interativo com feriados e eventos personalizados, o registro sistemático de notas por disciplina com cálculo automático de médias, e uma central de análise de desempenho que utiliza indicadores visuais para alertar o estudante sobre o risco de reprovação por faltas e sua posição em relação à média da turma.

### 3.2 Descrição das características do sistema de cada tela

**1. Tela de Agenda (Interface Principal)**
* **Características:** Apresenta um calendário central expandido e um mini-calendário lateral para navegação rápida entre meses. Contém uma barra lateral de "Exibição" com checkboxes para filtrar a visibilidade de feriados e eventos de disciplinas específicas (AL, PI1, TP, GPN). Possui um botão suspenso "Adicionar" para inserção rápida de novos eventos ou tarefas.
* **Fluxo:** Funciona como o "hub" do sistema e é aberta diretamente no primeiro acesso. Através da navbar superior, o usuário navega para as telas de "Notas" ou "Desempenho". Ao clicar em um dia específico, o sistema permite a visualização detalhada dos compromissos agendados.

**2. Tela de Notas (Gestão Acadêmica)**
* **Características:** Exibe uma tabela organizada por disciplina, colunas para diferentes tipos de avaliações (P1, P2, Projeto, Final) e o cálculo da média final. Abaixo da tabela, há uma seção de formulários para "Gerenciar Disciplinas e Notas", permitindo a adição de novas matérias ou o lançamento de notas individuais através de menus de seleção (dropdowns).
* **Fluxo:** O usuário insere os dados no formulário e, ao clicar em "Adicionar", a tabela é atualizada em tempo real. A navegação de saída ocorre pela navbar para retornar à Agenda ou prosseguir para o Desempenho.

**3. Tela de Desempenho (Análise Gráfica)**
* **Características:** Interface puramente visual baseada em quatro seções de monitoramento:
  * *Médias por Disciplina:* Gráfico de barras horizontais simples.
  * *Comparação Aluno vs. Turma:* Barras sobrepostas para análise de competitividade/progresso.
  * *Distribuição de Presenças/Faltas:* Gráfico de pizza que segmenta as ausências por disciplina.
  * *Limite de Faltas:* Indicadores de "trilho vertical" que mostram visualmente a proximidade do teto de 25% de faltas.
* **Fluxo:** Esta tela é alimentada pelos dados inseridos na tela de "Notas" e pelos registros de presença. É uma tela de consulta final para tomada de decisão estratégica do estudante.

---
*(c) Matheus Coelho, Grigory Plakhotnikov, Rafael Versiani e Thiago Trindade*
