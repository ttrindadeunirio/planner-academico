const dadosSalvos = localStorage.getItem("plannerAcademico_notas");
const faltasSalvas = localStorage.getItem("plannerAcademico_faltas");
let disciplinas = [];
let faltas = {};

if (faltasSalvas) {
  faltas = JSON.parse(faltasSalvas);
}

if (dadosSalvos) {
  disciplinas = JSON.parse(dadosSalvos);
  migrarDisciplinas(disciplinas);
} else {
  disciplinas = [
    { nome: "Algebra Linear", avaliacoes: { P1: 8.5, P2: 7.0 }, ordemAvaliacoes: ["P1", "P2"], formula: "" },
    { nome: "Projeto Integrador 1", avaliacoes: { P1: 10, P2: 10, Projeto: 10 }, ordemAvaliacoes: ["P1", "P2", "Projeto"], formula: "" },
    { nome: "Técnicas de Programação", avaliacoes: { P1: 6.0, P2: 8.0, Projeto: 7.5 }, ordemAvaliacoes: ["P1", "P2", "Projeto"], formula: "" },
    { nome: "Gestão de Processos de Negócios", avaliacoes: { P1: 9.0, P2: 8.5 }, ordemAvaliacoes: ["P1", "P2"], formula: "" }
  ];
}

const disciplinasContainer = document.getElementById("disciplinas-container");
const inputNovaDisciplina = document.getElementById("nova-disciplina");
const btnAddDisciplina = document.getElementById("btn-add-disciplina");

const selectDisciplinaFalta = document.getElementById("select-disciplina-falta");
const inputLimiteFalta = document.getElementById("limite-falta");
const btnDefinirLimite = document.getElementById("btn-definir-limite");
const faltasLista = document.getElementById("faltas-lista");

// Estado de expansão das disciplinas
let disciplinasExpandidas = new Set();

function salvarDados() {
  localStorage.setItem("plannerAcademico_notas", JSON.stringify(disciplinas));
}

function salvarFaltas() {
  localStorage.setItem("plannerAcademico_faltas", JSON.stringify(faltas));
}

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Valida o identificador da avaliação
function validarIdentificadorAvaliacao(id) {
  const idTrim = id.trim();
  if (!idTrim) return { valido: false, erro: "Identificador vazio" };

  if (idTrim === "PF") {
    return { valido: true, tipo: "Prova Final", id: "PF" };
  }

  const matchP = idTrim.match(/^P(\d+)$/);
  if (matchP) {
    return { valido: true, tipo: "Prova " + matchP[1], id: idTrim };
  }

  const matchT = idTrim.match(/^T(\d+)$/);
  if (matchT) {
    return { valido: true, tipo: "Trabalho " + matchT[1], id: idTrim };
  }

  const matchPJ = idTrim.match(/^PJ(\d+)$/);
  if (matchPJ) {
    return { valido: true, tipo: "Projeto " + matchPJ[1], id: idTrim };
  }

  return {
    valido: false,
    erro: "Formato inválido. Use: P(número) para prova, T(número) para trabalho, PJ(número) para projeto, ou PF para prova final."
  };
}

function getNomeExibicao(id) {
  const validacao = validarIdentificadorAvaliacao(id);
  if (validacao.valido) {
    return validacao.tipo;
  }
  return id;
}

function renderResultado(disc) {
  const resultado = avaliarDisciplina(disc);

  if (resultado.erro === "faltam-notas") {
    return '<span class="resultado-pendente">Preencha todas as notas usadas na fórmula para calcular o resultado.</span>';
  }
  if (resultado.erro === "formula-invalida") {
    return '<span class="resultado-erro">Fórmula inválida. Confira os identificadores e os operadores usados.</span>';
  }
  if (resultado.valor === null) {
    return '<span class="resultado-pendente">Nenhuma nota lançada ainda.</span>';
  }

  if (resultado.aprovado !== null) {
    const classe = resultado.aprovado ? "badge-ok" : "badge-danger";
    const texto = resultado.aprovado ? "Aprovado" : "Reprovado";
    return 'Resultado: <strong>' + resultado.valor + '</strong> &nbsp;' +
           '<span class="falta-badge ' + classe + '">' + texto + '</span>';
  }

  const rotulo = resultado.modo === "formula" ? "Média Final (fórmula)" : "Média Final";
  return rotulo + ': <strong>' + resultado.valor + '</strong>';
}

// Atualiza apenas o header de uma disciplina específica (sem re-renderizar tudo)
function atualizarHeaderDisciplina(discIndex) {
  const card = disciplinasContainer.querySelector('.disciplina-card[data-index="' + discIndex + '"]');
  if (!card) return;

  const disc = disciplinas[discIndex];
  const avaliacoes = disc.avaliacoes || {};
  const idsOrdenados = getIdsOrdenados(disc);

  let notasHTML = '';
  for (let j = 0; j < idsOrdenados.length; j++) {
    const id = idsOrdenados[j];
    const valor = avaliacoes[id];
    const nomeExibicao = getNomeExibicao(id);
    const valorExibido = (valor === null || valor === undefined) ? "-" : valor;
    notasHTML += '<div class="nota-coluna">' +
      '<span class="nota-label">' + escaparHTML(nomeExibicao) + '</span>' +
      '<span class="nota-valor">' + valorExibido + '</span>' +
    '</div>';
  }

  const resultado = avaliarDisciplina(disc);
  const mediaFinal = resultado.valor !== null ? resultado.valor : "-";

  let mediaClasse = "";
  if (resultado.aprovado === true) mediaClasse = "media-aprovado";
  else if (resultado.aprovado === false) mediaClasse = "media-reprovado";

  const notasResumo = card.querySelector('.notas-resumo');
  if (notasResumo) {
    notasResumo.innerHTML = notasHTML +
      '<div class="nota-coluna media-coluna">' +
        '<span class="nota-label">Média Final</span>' +
        '<span class="nota-valor ' + mediaClasse + '">' + mediaFinal + '</span>' +
      '</div>';
  }
}

// Renderiza as disciplinas no formato compacto (tabela) com opção de expandir
function renderDisciplinas() {
  disciplinasContainer.innerHTML = "";

  if (disciplinas.length === 0) {
    disciplinasContainer.innerHTML = '<p style="color:#999;font-size:14px;">Nenhuma disciplina cadastrada ainda.</p>';
    return;
  }

  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    const avaliacoes = disc.avaliacoes || {};
    const idsOrdenados = getIdsOrdenados(disc);
    const expandida = disciplinasExpandidas.has(i);

    const card = document.createElement("div");
    card.className = "disciplina-card" + (expandida ? " expandida" : "");
    card.dataset.index = i;

    // === CABEÇALHO COMPACTO (sempre visível) ===
    let notasHTML = '';
    for (let j = 0; j < idsOrdenados.length; j++) {
      const id = idsOrdenados[j];
      const valor = avaliacoes[id];
      const nomeExibicao = getNomeExibicao(id);
      const valorExibido = (valor === null || valor === undefined) ? "-" : valor;
      notasHTML += '<div class="nota-coluna">' +
        '<span class="nota-label">' + escaparHTML(nomeExibicao) + '</span>' +
        '<span class="nota-valor">' + valorExibido + '</span>' +
      '</div>';
    }

    const resultado = avaliarDisciplina(disc);
    const mediaFinal = resultado.valor !== null ? resultado.valor : "-";

    let mediaClasse = "";
    if (resultado.aprovado === true) mediaClasse = "media-aprovado";
    else if (resultado.aprovado === false) mediaClasse = "media-reprovado";

    const headerHTML =
      '<div class="disciplina-header" data-index="' + i + '">' +
        '<div class="disciplina-nome-wrap">' +
          '<span class="toggle-icon">' + (expandida ? '▼' : '▶') + '</span>' +
          '<h4>' + escaparHTML(disc.nome) + '</h4>' +
        '</div>' +
        '<div class="notas-resumo">' + notasHTML +
          '<div class="nota-coluna media-coluna">' +
            '<span class="nota-label">Média Final</span>' +
            '<span class="nota-valor ' + mediaClasse + '">' + mediaFinal + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn-remover-disciplina-card" data-index="' + i + '" title="Remover disciplina">🗑</button>' +
      '</div>';

    // === CONTEÚDO EXPANDIDO (edição) ===
    let expandHTML = '';
    if (expandida) {
      let linhasAvaliacoes = "";
      if (idsOrdenados.length === 0) {
        linhasAvaliacoes = '<tr><td colspan="4" style="color:#999;">Nenhuma avaliação cadastrada.</td></tr>';
      } else {
        for (let j = 0; j < idsOrdenados.length; j++) {
          const id = idsOrdenados[j];
          const valor = avaliacoes[id];
          const nomeExibicao = getNomeExibicao(id);
          linhasAvaliacoes += '<tr class="avaliacao-row" draggable="true" data-disc-index="' + i + '" data-avaliacao-id="' + escaparHTML(id) + '">' +
            '<td class="drag-handle" title="Arraste para reordenar">⋮⋮</td>' +
            '<td>' + escaparHTML(nomeExibicao) + ' <code>(' + escaparHTML(id) + ')</code></td>' +
            '<td>' + (valor === null || valor === undefined ? "-" : valor) + '</td>' +
            '<td><button type="button" class="btn-remover-avaliacao" data-index="' + i + '" data-id="' + escaparHTML(id) + '" title="Remover avaliação">✕</button></td>' +
            '</tr>';
        }
      }

      let opcoesAvaliacao = '<option value="">Selecione a avaliação</option>';
      for (let j = 0; j < idsOrdenados.length; j++) {
        const id = idsOrdenados[j];
        const nomeExibicao = getNomeExibicao(id);
        opcoesAvaliacao += '<option value="' + escaparHTML(id) + '">' + escaparHTML(nomeExibicao) + '</option>';
      }

      expandHTML =
        '<div class="disciplina-expand">' +
          '<div class="expand-section">' +
            '<h5>Gerenciar Avaliações <small style="color:#999;font-weight:normal;">(arraste as linhas para reordenar)</small></h5>' +
            '<table class="tabela-avaliacoes tabela-drag" data-disc-index="' + i + '">' +
              '<thead><tr><th style="width:30px;"></th><th>Avaliação</th><th>Nota</th><th></th></tr></thead>' +
              '<tbody>' + linhasAvaliacoes + '</tbody>' +
            '</table>' +

            '<div class="form-row form-row-avaliacao">' +
              '<input type="text" class="input-nome-avaliacao" data-index="' + i + '" placeholder="Ex: P1, T1, PJ1, PF">' +
              '<button type="button" class="btn-add btn-add-avaliacao-nome" data-index="' + i + '">Criar Avaliação</button>' +
            '</div>' +
            '<small class="formula-hint">Formatos válidos: P(número) para prova, T(número) para trabalho, PJ(número) para projeto, PF para prova final.</small>' +

            '<div class="form-row form-row-avaliacao" style="margin-top:12px;">' +
              '<select class="select-avaliacao-nota" data-index="' + i + '">' + opcoesAvaliacao + '</select>' +
              '<input type="number" class="input-valor-avaliacao" data-index="' + i + '" placeholder="Nota" step="0.1" min="0" max="10" style="max-width:100px;flex:0 0 100px;">' +
              '<button type="button" class="btn-add btn-add-nota" data-index="' + i + '">Atribuir Nota</button>' +
            '</div>' +
          '</div>' +

          '<div class="expand-section formula-section">' +
            '<label for="formula-' + i + '">Fórmula da Média Final (opcional)</label>' +
            '<div class="form-row">' +
              '<input type="text" id="formula-' + i + '" class="input-formula" data-index="' + i + '" ' +
                'placeholder="Ex: (P1+P2)/2 >= 7" value="' + escaparHTML(disc.formula || "") + '">' +
              '<button type="button" class="btn-add btn-salvar-formula" data-index="' + i + '">Salvar Fórmula</button>' +
            '</div>' +
            '<small class="formula-hint">Use os identificadores das avaliações como variáveis (ex: P1, T1, PF). ' +
            'Você pode escrever apenas uma expressão numérica (ex: (P1+P2)/2) ou incluir uma condição de aprovação ' +
            '(ex: (P1+P2)/2 >= 7).</small>' +
          '</div>' +

          '<div class="resultado-disciplina">' + renderResultado(disc) + '</div>' +
        '</div>';
    }

    card.innerHTML = headerHTML + expandHTML;
    disciplinasContainer.appendChild(card);
  }

  // Event listeners para expandir/colapsar
  const headers = disciplinasContainer.querySelectorAll(".disciplina-header");
  for (let i = 0; i < headers.length; i++) {
    headers[i].addEventListener("click", function(e) {
      if (e.target.classList.contains("btn-remover-disciplina-card")) return;
      const index = parseInt(this.dataset.index);
      if (disciplinasExpandidas.has(index)) {
        disciplinasExpandidas.delete(index);
      } else {
        disciplinasExpandidas.add(index);
      }
      renderDisciplinas();
    });
  }

  // Event listeners para drag & drop
  initDragAndDrop();
}

function initDragAndDrop() {
  const tabelas = disciplinasContainer.querySelectorAll(".tabela-drag");

  for (let t = 0; t < tabelas.length; t++) {
    const tabela = tabelas[t];
    const tbody = tabela.querySelector("tbody");
    const rows = tbody.querySelectorAll(".avaliacao-row");
    const discIndex = parseInt(tabela.dataset.discIndex);

    if (rows.length < 2) continue;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];

      row.addEventListener("dragstart", function(e) {
        this.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", this.dataset.avaliacaoId);
        e.dataTransfer.setData("disc-index", this.dataset.discIndex);
      });

      row.addEventListener("dragend", function(e) {
        this.classList.remove("dragging");
        const allRows = tbody.querySelectorAll(".avaliacao-row");
        for (let i = 0; i < allRows.length; i++) {
          allRows[i].classList.remove("drop-target");
        }
      });

      row.addEventListener("dragover", function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        const draggingRow = tbody.querySelector(".dragging");
        if (!draggingRow || draggingRow === this) return;

        const allRows = tbody.querySelectorAll(".avaliacao-row");
        for (let i = 0; i < allRows.length; i++) {
          allRows[i].classList.remove("drop-target");
        }
        this.classList.add("drop-target");
      });

      row.addEventListener("dragleave", function(e) {
        this.classList.remove("drop-target");
      });

      row.addEventListener("drop", function(e) {
        e.preventDefault();

        const draggedId = e.dataTransfer.getData("text/plain");
        const sourceDiscIndex = parseInt(e.dataTransfer.getData("disc-index"));
        const targetDiscIndex = discIndex;

        if (sourceDiscIndex !== targetDiscIndex) return;

        const draggedRow = tbody.querySelector('[data-avaliacao-id="' + draggedId + '"]');
        if (!draggedRow || draggedRow === this) return;

        // Determina a posição de inserção
        const rect = this.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertAfter = e.clientY > midY;

        // Move no DOM
        if (insertAfter) {
          this.after(draggedRow);
        } else {
          this.before(draggedRow);
        }

        // Atualiza a ordem no array
        const newOrder = Array.from(tbody.querySelectorAll(".avaliacao-row")).map(function(r) {
          return r.dataset.avaliacaoId;
        });
        disciplinas[targetDiscIndex].ordemAvaliacoes = newOrder;

        // Salva sem re-renderizar (evita o flash)
        salvarDados();

        // Atualiza apenas o header da disciplina afetada
        atualizarHeaderDisciplina(targetDiscIndex);

        // Limpa estilos visuais
        const allRows = tbody.querySelectorAll(".avaliacao-row");
        for (let i = 0; i < allRows.length; i++) {
          allRows[i].classList.remove("drop-target");
        }
        draggedRow.classList.remove("dragging");
      });
    }
  }
}

function atualizarSelectFaltas() {
  const valorAtual = selectDisciplinaFalta.value;
  selectDisciplinaFalta.innerHTML = '<option value="">Selecione a Disciplina</option>';

  for (let i = 0; i < disciplinas.length; i++) {
    const opt = document.createElement("option");
    opt.value = disciplinas[i].nome;
    opt.textContent = disciplinas[i].nome;
    selectDisciplinaFalta.appendChild(opt);
  }
  selectDisciplinaFalta.value = valorAtual;
}

function atualizarFaltasUI() {
  atualizarSelectFaltas();

  faltasLista.innerHTML = "";
  if (disciplinas.length === 0) {
    faltasLista.innerHTML = '<p style="color:#999;font-size:14px;">Nenhuma disciplina cadastrada.</p>';
    return;
  }

  for (let i = 0; i < disciplinas.length; i++) {
    const nome = disciplinas[i].nome;
    if (!faltas[nome]) {
      faltas[nome] = { count: 0, limite: null };
    }

    const count = faltas[nome].count;
    const limite = faltas[nome].limite;

    const emRisco = limite !== null && count >= Math.ceil(limite * 0.75);
    const excedido = limite !== null && count >= limite;

    let classeCard = "falta-card";
    if (excedido) {
      classeCard += " falta-excedida";
    } else if (emRisco) {
      classeCard += " falta-risco";
    }

    let pct = 0;
    if (limite) { pct = Math.min(count / limite, 1); }

    let barColor = "#007bff";
    if (excedido) {
      barColor = "#e53935";
    } else if (emRisco) {
      barColor = "#ff8c1a";
    }

    let classeBadge = "badge-ok";
    let textoBadge = "✓ OK";
    if (excedido) {
      classeBadge = "badge-danger";
      textoBadge = "⚠ Limite excedido";
    } else if (emRisco) {
      classeBadge = "badge-warn";
      textoBadge = "⚠ Atenção";
    }

    let limiteTexto = "";
    if (limite !== null) {
      limiteTexto = count + " de " + limite + " faltas permitidas";
    } else {
      const sCount = count !== 1 ? "s" : "";
      const sReg = count !== 1 ? "s" : "";
      limiteTexto = count + " falta" + sCount + " registrada" + sReg + " <span style=\"color:#aaa\">(limite não definido)</span>";
    }

    let progressoHTML = "";
    if (limite !== null) {
      progressoHTML = '<div class="falta-progress-wrap">' +
                        '<div class="falta-progress-bar" style="width:' + (pct * 100) + '%; background:' + barColor + ';"></div>' +
                      '</div>';
    }

    const card = document.createElement("div");
    card.className = classeCard;
    card.innerHTML = '<div class="falta-card-header">' +
                        '<span class="falta-nome">' + escaparHTML(nome) + '</span>' +
                        '<span class="falta-badge ' + classeBadge + '">' + textoBadge + '</span>' +
                      '</div>' +
                      progressoHTML +
                      '<div class="falta-card-footer">' +
                        '<span class="falta-count">' + limiteTexto + '</span>' +
                        '<div class="falta-controls">' +
                          '<button class="btn-falta btn-minus" data-nome="' + escaparHTML(nome) + '" title="Remover uma falta">−</button>' +
                          '<button class="btn-falta btn-plus" data-nome="' + escaparHTML(nome) + '" title="Registrar uma falta">+</button>' +
                        '</div>' +
                      '</div>';

    faltasLista.appendChild(card);
  }

  const botoesPlus = faltasLista.querySelectorAll(".btn-plus");
  for (let i = 0; i < botoesPlus.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() {
        const nomeMateria = btn.dataset.nome;
        faltas[nomeMateria].count++;
        salvarFaltas();
        atualizarFaltasUI();
      });
    })(botoesPlus[i]);
  }

  const botoesMinus = faltasLista.querySelectorAll(".btn-minus");
  for (let i = 0; i < botoesMinus.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() {
        const nomeMateria = btn.dataset.nome;
        if (faltas[nomeMateria].count > 0) {
          faltas[nomeMateria].count--;
        }
        salvarFaltas();
        atualizarFaltasUI();
      });
    })(botoesMinus[i]);
  }
}

btnDefinirLimite.addEventListener("click", function() {
  const nome = selectDisciplinaFalta.value;
  const limite = parseInt(inputLimiteFalta.value);
  if (nome && !isNaN(limite) && limite > 0) {
    if (!faltas[nome]) {
      faltas[nome] = { count: 0, limite: null };
    }
    faltas[nome].limite = limite;
    inputLimiteFalta.value = "";
    selectDisciplinaFalta.value = "";
    salvarFaltas();
    atualizarFaltasUI();
  }
});

btnAddDisciplina.addEventListener("click", function() {
  const nome = inputNovaDisciplina.value.trim();
  if (nome !== "") {
    disciplinas.push({ nome: nome, avaliacoes: {}, ordemAvaliacoes: [], formula: "" });
    inputNovaDisciplina.value = "";
    salvarDados();
    renderDisciplinas();
    atualizarFaltasUI();
  }
});

disciplinasContainer.addEventListener("click", function(e) {
  const alvo = e.target;

  if (alvo.classList.contains("btn-add-avaliacao-nome")) {
    const index = parseInt(alvo.dataset.index);
    const card = alvo.closest(".disciplina-card");
    const inputNome = card.querySelector(".input-nome-avaliacao");
    const nomeBruto = inputNome.value.trim();

    const validacao = validarIdentificadorAvaliacao(nomeBruto);
    if (!validacao.valido) {
      alert(validacao.erro);
      return;
    }

    const id = validacao.id;

    if (disciplinas[index].avaliacoes[id] !== undefined) {
      alert('A avaliação "' + id + '" já existe nesta disciplina.');
      return;
    }

    disciplinas[index].avaliacoes[id] = null;
    disciplinas[index].ordemAvaliacoes.push(id);
    inputNome.value = "";
    salvarDados();
    renderDisciplinas();
    disciplinasExpandidas.add(index);
    return;
  }

  if (alvo.classList.contains("btn-add-nota")) {
    const index = parseInt(alvo.dataset.index);
    const card = alvo.closest(".disciplina-card");
    const selectAval = card.querySelector(".select-avaliacao-nota");
    const inputValor = card.querySelector(".input-valor-avaliacao");

    const id = selectAval.value;
    const valor = inputValor.value;

    if (!id) {
      alert("Selecione uma avaliação.");
      return;
    }
    if (valor === "") {
      alert("Digite a nota da avaliação.");
      return;
    }

    disciplinas[index].avaliacoes[id] = parseFloat(valor);
    selectAval.value = "";
    inputValor.value = "";
    salvarDados();
    renderDisciplinas();
    disciplinasExpandidas.add(index);
    return;
  }

  if (alvo.classList.contains("btn-remover-avaliacao")) {
    const index = parseInt(alvo.dataset.index);
    const id = alvo.dataset.id;
    delete disciplinas[index].avaliacoes[id];
    const idxOrdem = disciplinas[index].ordemAvaliacoes.indexOf(id);
    if (idxOrdem !== -1) {
      disciplinas[index].ordemAvaliacoes.splice(idxOrdem, 1);
    }
    salvarDados();
    renderDisciplinas();
    disciplinasExpandidas.add(index);
    return;
  }

  if (alvo.classList.contains("btn-salvar-formula")) {
    const index = parseInt(alvo.dataset.index);
    const card = alvo.closest(".disciplina-card");
    const inputFormula = card.querySelector(".input-formula");
    disciplinas[index].formula = inputFormula.value.trim();
    salvarDados();
    renderDisciplinas();
    disciplinasExpandidas.add(index);
    return;
  }

  if (alvo.classList.contains("btn-remover-disciplina-card")) {
    const index = parseInt(alvo.dataset.index);
    const nomeDisc = disciplinas[index].nome;

    if (!confirm('Remover a disciplina "' + nomeDisc + '" e todas as suas avaliações?')) {
      return;
    }

    disciplinas.splice(index, 1);
    if (faltas[nomeDisc]) {
      delete faltas[nomeDisc];
    }

    salvarDados();
    salvarFaltas();
    renderDisciplinas();
    atualizarFaltasUI();
  }
});

disciplinasContainer.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    if (e.target.classList.contains("input-valor-avaliacao")) {
      const index = e.target.dataset.index;
      const btn = e.target.closest(".disciplina-card").querySelector(".btn-add-nota[data-index='" + index + "']");
      if (btn) btn.click();
    } else if (e.target.classList.contains("input-nome-avaliacao")) {
      const index = e.target.dataset.index;
      const btn = e.target.closest(".disciplina-card").querySelector(".btn-add-avaliacao-nome[data-index='" + index + "']");
      if (btn) btn.click();
    }
  }
});

window.addEventListener("DOMContentLoaded", function() {
  renderDisciplinas();
  atualizarFaltasUI();
});
