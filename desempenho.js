const CORES_FALTAS = ["#ff4d4d", "#ff8c1a", "#ffcc00", "#e60073", "#9b59b6", "#1abc9c"];

function carregarDados() {
  const dadosSalvos = localStorage.getItem("plannerUnirio_notas");
  const faltasSalvas = localStorage.getItem("plannerUnirio_faltas");
  
  const obj = { disciplinas: [], faltas: {} };
  if (dadosSalvos) { obj.disciplinas = JSON.parse(dadosSalvos); }
  if (faltasSalvas) { obj.faltas = JSON.parse(faltasSalvas); }
  return obj;
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

function calcularMedia(notas) {
  let soma = 0, qtd = 0;
  for (const chave in notas) {
    if (notas[chave] !== null && notas[chave] !== undefined) {
      soma += parseFloat(notas[chave]);
      qtd++;
    }
  }
  if (qtd === 0) {
    return null;
  } else {
    return parseFloat((soma / qtd).toFixed(1));
  }
}

function abreviar(nome) {
  const partes = nome.split(" ");
  const filtradas = [];
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (p.length > 0 && p.toLowerCase() !== "de" && p.toLowerCase() !== "e" && p.toLowerCase() !== "com") {
      filtradas.push(p);
    }
  }
  
  let resultado = "";
  for (let j = 0; j < filtradas.length; j++) {
    resultado += filtradas[j][0].toUpperCase();
  }
  return resultado.slice(0, 4);
}

function mensagemVazia(section, texto) {
  const p = document.createElement("p");
  p.style.cssText = "color:#999;font-size:14px;margin-top:8px;";
  p.textContent = texto;
  section.appendChild(p);
}

function renderMedias(disciplinas) {
  const section = document.querySelectorAll("section")[0];
  const linhasExistentes = section.querySelectorAll(".linha");
  for (let i = 0; i < linhasExistentes.length; i++) {
    linhasExistentes[i].remove();
  }

  if (disciplinas.length === 0) {
    mensagemVazia(section, "Nenhuma disciplina cadastrada ainda.");
    return;
  }

  let algumDado = false;
  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    const media = calcularMedia(disc.notas);
    if (media === null) continue;
    algumDado = true;

    const pct = (media / 10) * 100;
    const abrev = abreviar(disc.nome);

    const linha = document.createElement("div");
    linha.className = "linha";
    linha.innerHTML = '<span title="' + disc.nome + '">' + abrev + '</span>' +
                      '<div class="barra">' +
                        '<div class="aluno" style="width:' + pct + '%">' + media + '</div>' +
                      '</div>';
    section.appendChild(linha);
  }

  if (!algumDado) {
    mensagemVazia(section, "Nenhuma nota lançada ainda.");
  }
}

function renderPizza(disciplinas, faltas) {
  const pizza = document.querySelector(".pizza-semestre");
  const legendaGrid = document.querySelector(".legenda-grid");
  legendaGrid.innerHTML = "";

  if (disciplinas.length === 0) {
    pizza.style.background = "#e0e0e0";
    legendaGrid.innerHTML = '<p style="color:#999;font-size:14px;">Nenhuma disciplina cadastrada.</p>';
    return;
  }

  let totalAulas = 0;
  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    let limite = null;
    if (faltas[disc.nome] && faltas[disc.nome].limite !== undefined) {
      limite = faltas[disc.nome].limite;
    }
    totalAulas += limite !== null ? limite * 4 : 32;
  }

  let totalFaltas = 0;
  const faltasPorDisc = {};
  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    let count = 0;
    if (faltas[disc.nome] && faltas[disc.nome].count !== undefined) {
      count = faltas[disc.nome].count;
    }
    faltasPorDisc[disc.nome] = count;
    totalFaltas += count;
  }

  const totalPresencas = Math.max(totalAulas - totalFaltas, 0);
  const pctPresenca = (totalPresencas / totalAulas) * 100;

  const partes = ['#007bff 0% ' + pctPresenca.toFixed(2) + '%'];
  let acum = pctPresenca;
  
  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    let count = 0;
    if (faltasPorDisc[disc.nome] !== undefined) { count = faltasPorDisc[disc.nome]; }
    const pct = (count / totalAulas) * 100;
    const cor = CORES_FALTAS[i % CORES_FALTAS.length];
    if (pct > 0) {
      partes.push(cor + ' ' + acum.toFixed(2) + '% ' + (acum + pct).toFixed(2) + '%');
    }
    acum += pct;
  }

  pizza.style.background = 'conic-gradient(' + partes.join(", ") + ')';

  legendaGrid.innerHTML = '<div class="legenda-item">' +
                            '<span class="caixa-cor presenca"></span>' +
                            'Presenças: ' + totalPresencas +
                          '</div>';

  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    const abrev = abreviar(disc.nome);
    let count = 0;
    if (faltasPorDisc[disc.nome] !== undefined) { count = faltasPorDisc[disc.nome]; }
    const cor = CORES_FALTAS[i % CORES_FALTAS.length];
    legendaGrid.innerHTML += '<div class="legenda-item">' +
                                '<span class="caixa-cor" style="background:' + cor + '"></span>' +
                                'Faltas ' + abrev + ': ' + count +
                              '</div>';
  }
}

function renderLimiteFaltas(disciplinas, faltas) {
  const container = document.querySelector(".limite-container");
  container.innerHTML = "";

  if (disciplinas.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:14px;">Nenhuma disciplina cadastrada.</p>';
    return;
  }

  for (let i = 0; i < disciplinas.length; i++) {
    const disc = disciplinas[i];
    const nome = disc.nome;
    const abrev = abreviar(nome);
    
    let count = 0;
    let limite = null;
    if (faltas[nome]) {
      if (faltas[nome].count !== undefined) { count = faltas[nome].count; }
      if (faltas[nome].limite !== undefined) { limite = faltas[nome].limite; }
    }

    let pct = 0;
    if (limite) { pct = Math.min((count / limite) * 100, 100); }
    
    const cor = CORES_FALTAS[i % CORES_FALTAS.length];
    const contagem = limite !== null ? count + '/' + limite : count + '/?';
    const semLimite = limite === null;

    const bgBarra = semLimite ? "#ccc" : cor;

    const coluna = document.createElement("div");
    coluna.className = "coluna-falta";
    coluna.innerHTML = '<div class="barra-vertical">' +
                        '<div class="preenchimento-falta" style="height:' + pct + '%; background:' + bgBarra + ';"></div>' +
                      '</div>' +
                      '<span class="label-materia" title="' + nome + '">' + abrev + '</span>' +
                      '<span class="contagem">' + contagem + '</span>';
    container.appendChild(coluna);
  }
}

window.addEventListener("DOMContentLoaded", function() {
  const dados = carregarDados();
  renderMedias(dados.disciplinas);
  renderPizza(dados.disciplinas, dados.faltas);
  renderLimiteFaltas(dados.disciplinas, dados.faltas);
});