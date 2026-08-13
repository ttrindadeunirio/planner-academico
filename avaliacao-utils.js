/*
  avaliacao-utils.js
  Funções compartilhadas para lidar com avaliações customizadas por disciplina
  e com a fórmula de cálculo da média final definida pelo aluno.

  Estrutura de uma disciplina:
  {
    nome: "Algebra Linear",
    avaliacoes: { "P1": 8.5, "P2": 7.0, "T1": null, "PF": null },
    ordemAvaliacoes: ["P1", "P2", "T1", "PF"],
    formula: "(P1+P2)/2"
  }

  Identificadores válidos:
  - P(número) : Prova (ex: P1, P2)
  - T(número) : Trabalho (ex: T1, T2)
  - PJ(número): Projeto (ex: PJ1)
  - PF        : Prova Final
*/

// Remove espaços e caracteres especiais, mantendo apenas letras, números e "_"
function sanitizarIdentificador(nome) {
  return nome.replace(/[^A-Za-z0-9_]/g, "");
}

// Valida o identificador da avaliação
// P(número) = prova, T(número) = trabalho, PJ(número) = projeto, PF = prova final
function validarIdentificadorAvaliacao(id) {
  const idTrim = id.trim();
  if (!idTrim) return { valido: false, erro: "Identificador vazio" };

  // PF = prova final
  if (idTrim === "PF") {
    return { valido: true, tipo: "Prova Final", id: "PF" };
  }

  // P(número) = prova
  const matchP = idTrim.match(/^P(\d+)$/);
  if (matchP) {
    return { valido: true, tipo: "Prova " + matchP[1], id: idTrim };
  }

  // T(número) = trabalho
  const matchT = idTrim.match(/^T(\d+)$/);
  if (matchT) {
    return { valido: true, tipo: "Trabalho " + matchT[1], id: idTrim };
  }

  // PJ(número) = projeto
  const matchPJ = idTrim.match(/^PJ(\d+)$/);
  if (matchPJ) {
    return { valido: true, tipo: "Projeto " + matchPJ[1], id: idTrim };
  }

  return {
    valido: false,
    erro: "Formato inválido. Use: P(número) para prova, T(número) para trabalho, PJ(número) para projeto, ou PF para prova final."
  };
}

// Converte o formato antigo (campo "notas" com chaves fixas como "Prova 1")
// para o novo formato (campo "avaliacoes" com identificadores sem espaço).
// Não faz nada se a disciplina já estiver no formato novo.
function migrarDisciplina(disc) {
  if (!disc.avaliacoes) {
    disc.avaliacoes = {};
    if (disc.notas) {
      for (const chave in disc.notas) {
        const id = sanitizarIdentificador(chave) || chave;
        disc.avaliacoes[id] = disc.notas[chave];
      }
      delete disc.notas;
    }
  }
  if (typeof disc.formula !== "string") {
    disc.formula = "";
  }
  // Garante ordemAvaliacoes
  if (!disc.ordemAvaliacoes) {
    disc.ordemAvaliacoes = Object.keys(disc.avaliacoes);
  }
  return disc;
}

function migrarDisciplinas(lista) {
  for (let i = 0; i < lista.length; i++) {
    migrarDisciplina(lista[i]);
  }
  return lista;
}

// Retorna os IDs das avaliações na ordem definida pelo usuário
function getIdsOrdenados(disc) {
  const ordem = (disc.ordemAvaliacoes || []).filter(function(id) {
    return disc.avaliacoes.hasOwnProperty(id);
  });
  // Adiciona quaisquer IDs novos que não estejam na ordem
  const todosIds = Object.keys(disc.avaliacoes);
  for (let i = 0; i < todosIds.length; i++) {
    if (ordem.indexOf(todosIds[i]) === -1) {
      ordem.push(todosIds[i]);
    }
  }
  return ordem;
}

// Média simples: soma de todas as avaliações preenchidas dividida pela quantidade
function calcularMediaSimples(avaliacoes) {
  let soma = 0;
  let qtd = 0;
  for (const chave in avaliacoes) {
    if (avaliacoes[chave] !== null && avaliacoes[chave] !== undefined && avaliacoes[chave] !== "") {
      soma += parseFloat(avaliacoes[chave]);
      qtd++;
    }
  }
  if (qtd === 0) {
    return null;
  }
  return parseFloat((soma / qtd).toFixed(2));
}

// Avalia a disciplina: usa a fórmula customizada se houver, senão cai para média simples.
// Retorno: { modo: "simples"|"formula", valor: number|null, aprovado: bool|null, erro: string|null }
function avaliarDisciplina(disc) {
  const avaliacoes = disc.avaliacoes || {};
  const formula = (disc.formula || "").trim();

  if (formula === "") {
    return { modo: "simples", valor: calcularMediaSimples(avaliacoes), aprovado: null, erro: null };
  }

  // ordena os identificadores do mais longo para o mais curto para evitar
  // substituições parciais (ex: "P1" dentro de "P10")
  const identificadores = Object.keys(avaliacoes).sort(function (a, b) {
    return b.length - a.length;
  });

  let expr = formula;
  const usados = [];

  for (let i = 0; i < identificadores.length; i++) {
    const id = identificadores[i];
    if (id === "") continue;
    const re = new RegExp("\\b" + id + "\\b", "g");
    if (re.test(expr)) {
      usados.push(id);
    }
  }

  // se algum identificador usado na fórmula ainda não tem nota, não dá pra calcular
  for (let i = 0; i < usados.length; i++) {
    const val = avaliacoes[usados[i]];
    if (val === null || val === undefined || val === "") {
      return { modo: "formula", valor: null, aprovado: null, erro: "faltam-notas" };
    }
  }

  for (let i = 0; i < identificadores.length; i++) {
    const id = identificadores[i];
    if (id === "") continue;
    const re = new RegExp("\\b" + id + "\\b", "g");
    const val = avaliacoes[id];
    expr = expr.replace(re, val !== null && val !== undefined && val !== "" ? val : "0");
  }

  const permitido = /^[0-9+\-*/(). <>=]+$/;
  const compMatch = expr.match(/(<=|>=|==|<|>)/);

  try {
    if (compMatch) {
      const operador = compMatch[0];
      const idx = expr.indexOf(operador);
      const ladoEsquerdo = expr.slice(0, idx).trim();
      const ladoDireito = expr.slice(idx + operador.length).trim();

      if (!permitido.test(ladoEsquerdo) || !permitido.test(ladoDireito)) {
        throw new Error("caracteres não permitidos");
      }
      if (ladoEsquerdo === "" || ladoDireito === "") {
        throw new Error("expressão incompleta");
      }

      const valorEsquerdo = Function('"use strict"; return (' + ladoEsquerdo + ")")();
      const valorDireito = Function('"use strict"; return (' + ladoDireito + ")")();
      const aprovado = Function(
        '"use strict"; return (' + valorEsquerdo + " " + operador + " " + valorDireito + ")"
      )();

      return {
        modo: "formula",
        valor: parseFloat(valorEsquerdo.toFixed(2)),
        aprovado: !!aprovado,
        erro: null
      };
    } else {
      if (!permitido.test(expr) || expr.trim() === "") {
        throw new Error("caracteres não permitidos");
      }
      const valor = Function('"use strict"; return (' + expr + ")")();
      return { modo: "formula", valor: parseFloat(valor.toFixed(2)), aprovado: null, erro: null };
    }
  } catch (e) {
    return { modo: "formula", valor: null, aprovado: null, erro: "formula-invalida" };
  }
}