const dadosSalvos = localStorage.getItem("plannerUnirio_notas");
const faltasSalvas = localStorage.getItem("plannerUnirio_faltas");
let disciplinas = [];
let faltas = {};

if (faltasSalvas) {
  faltas = JSON.parse(faltasSalvas);
}

if (dadosSalvos) {
  disciplinas = JSON.parse(dadosSalvos);
} else {
  disciplinas = [
    { nome: "Algebra Linear", notas: { "Prova 1": 8.5, "Prova 2": 7.0, "Projeto": null, "Prova Final": null } },
    { nome: "Projeto Integrador 1", notas: { "Prova 1": 10, "Prova 2": 10, "Projeto": 10, "Prova Final": null } },
    { nome: "Técnicas de Programação", notas: { "Prova 1": 6.0, "Prova 2": 8.0, "Projeto": 7.5, "Prova Final": null } },
    { nome: "Gestão de Processos de Negócios", notas: { "Prova 1": 9.0, "Prova 2": 8.5, "Projeto": null, "Prova Final": null } }
  ];
}

const btnConfig = document.getElementById("btn-config");
const dropdownConfig = document.getElementById("dropdown-config");
const btnLogout = document.getElementById("btn-logout");

btnConfig.addEventListener("click", function(e) {
  e.stopPropagation();
  dropdownConfig.classList.toggle("aberto");
});

document.addEventListener("click", function() {
  dropdownConfig.classList.remove("aberto");
});

btnLogout.addEventListener("click", function() {
  sessionStorage.removeItem("plannerUnirio_usuarioLogado");
  window.location.href = "login.html";
});

const tbody = document.querySelector("table tbody");
const selectDisciplina = document.getElementById("select-disciplina");
const inputNovaDisciplina = document.getElementById("nova-disciplina");
const btnAddDisciplina = document.getElementById("ad18");
const btnAddNota = document.querySelectorAll(".btn-add")[1];
const selectTipo = document.getElementById("select-tipo");
const inputNota = document.getElementById("valor-nota");

const selectRemoverDisciplina = document.getElementById("select-remover-disciplina");
const btnRemoverDisciplina = document.getElementById("btn-remover-disciplina");

const selectDisciplinaFalta = document.getElementById("select-disciplina-falta");
const inputLimiteFalta = document.getElementById("limite-falta");
const btnDefinirLimite = document.getElementById("btn-definir-limite");
const faltasLista = document.getElementById("faltas-lista");

function salvarDados() {
  localStorage.setItem("plannerUnirio_notas", JSON.stringify(disciplinas));
}

function salvarFaltas() {
  localStorage.setItem("plannerUnirio_faltas", JSON.stringify(faltas));
}

function calcularMedia(notas) {
  let soma = 0;
  let qtd = 0;
  for (const chave in notas) {
    if (notas[chave] !== null) {
      soma += parseFloat(notas[chave]);
      qtd++;
    }
  }
  if (qtd === 0) {
    return "-";
  } else {
    return (soma / qtd).toFixed(1);
  }
}

function atualizarTela() {
  tbody.innerHTML = "";
  selectDisciplina.innerHTML = '<option value="">Selecione a Disciplina</option>';
  selectRemoverDisciplina.innerHTML = '<option value="">Selecione a Disciplina para Remover</option>';

  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    tdNome.textContent = disc.nome;
    tr.appendChild(tdNome);

    const tipos = ["Prova 1", "Prova 2", "Projeto", "Prova Final"];
    for (let j = 0; j < tipos.length; j++) {
      const tipo = tipos[j];
      const td = document.createElement("td");
      if (disc.notas[tipo] !== null) {
        td.textContent = disc.notas[tipo];
      } else {
        td.textContent = "-";
      }
      tr.appendChild(td);
    }

    const tdMedia = document.createElement("td");
    tdMedia.textContent = calcularMedia(disc.notas);
    tr.appendChild(tdMedia);

    tbody.appendChild(tr);

    const option = document.createElement("option");
    option.value = i;
    option.textContent = disc.nome;
    selectDisciplina.appendChild(option);

    const optionRemover = document.createElement("option");
    optionRemover.value = i;
    optionRemover.textContent = disc.nome;
    selectRemoverDisciplina.appendChild(optionRemover);
  }
}

function atualizarFaltasUI() {
  selectDisciplinaFalta.innerHTML = '<option value="">Selecione a Disciplina</option>';
  
  for (let i = 0; i < disciplinas.length; i++) {
    const opt = document.createElement("option");
    opt.value = disciplinas[i].nome;
    opt.textContent = disciplinas[i].nome;
    selectDisciplinaFalta.appendChild(opt);
  }

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
                        '<span class="falta-nome">' + nome + '</span>' +
                        '<span class="falta-badge ' + classeBadge + '">' + textoBadge + '</span>' +
                      '</div>' +
                      progressoHTML +
                      '<div class="falta-card-footer">' +
                        '<span class="falta-count">' + limiteTexto + '</span>' +
                        '<div class="falta-controls">' +
                          '<button class="btn-falta btn-minus" data-nome="' + nome + '" title="Remover uma falta">−</button>' +
                          '<button class="btn-falta btn-plus" data-nome="' + nome + '" title="Registrar uma falta">+</button>' +
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
    disciplinas.push({
      nome: nome,
      notas: { "Prova 1": null, "Prova 2": null, "Projeto": null, "Prova Final": null }
    });
    inputNovaDisciplina.value = "";
    salvarDados();
    atualizarTela();
    atualizarFaltasUI();
  }
});

btnAddNota.addEventListener("click", function() {
  const indexDisc = selectDisciplina.value;
  const tipo = selectTipo.value;
  const valor = inputNota.value;

  if (indexDisc !== "" && tipo !== "" && valor !== "") {
    disciplinas[indexDisc].notas[tipo] = parseFloat(valor);
    inputNota.value = "";
    selectTipo.value = "";
    selectDisciplina.value = "";
    salvarDados();
    atualizarTela();
    atualizarFaltasUI();
  }
});

btnRemoverDisciplina.addEventListener("click", function() {
  const indexDisc = selectRemoverDisciplina.value;
  
  if (indexDisc !== "") {
    const nomeDisc = disciplinas[indexDisc].nome;
    disciplinas.splice(indexDisc, 1);
    
    if (faltas[nomeDisc]) {
      delete faltas[nomeDisc];
    }
    
    salvarDados();
    salvarFaltas();
    atualizarTela();
    atualizarFaltasUI();
  }
});

window.addEventListener("DOMContentLoaded", function() {
  atualizarTela();
  atualizarFaltasUI();
});