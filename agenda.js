const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CHAVE_STORAGE = 'agenda_eventos';

function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { dia: dia, mes: mes - 1 };
}

function somarDias(obj, ano, qtd) {
  const d = new Date(ano, obj.mes, obj.dia + qtd);
  return { dia: d.getDate(), mes: d.getMonth() };
}

function obterFeriadosDoAno(ano) {
  const pascoa = calcularPascoa(ano);

  const lista = [
    { dia: 1,  mes: 0,  nome: 'Confraternização Universal' },
    { dia: 21, mes: 3,  nome: 'Tiradentes' },
    { dia: 1,  mes: 4,  nome: 'Dia do Trabalho' },
    { dia: 7,  mes: 8,  nome: 'Independência do Brasil' },
    { dia: 12, mes: 9,  nome: 'Nossa Senhora Aparecida' },
    { dia: 2,  mes: 10, nome: 'Finados' },
    { dia: 15, mes: 10, nome: 'Proclamação da República' },
    { dia: 25, mes: 11, nome: 'Natal' },

    { dia: 20, mes: 0,  nome: 'Dia de São Sebastião (Padroeiro do RJ)' },
    { dia: 23, mes: 3,  nome: 'Dia de São Jorge' },
    { dia: 20, mes: 10, nome: 'Dia da Consciência Negra' },

    { dia: somarDias(pascoa, ano, -48).dia, mes: somarDias(pascoa, ano, -48).mes, nome: 'Carnaval (Segunda)' },
    { dia: somarDias(pascoa, ano, -47).dia, mes: somarDias(pascoa, ano, -47).mes, nome: 'Carnaval (Terça)' },
    { dia: somarDias(pascoa, ano, -2).dia,  mes: somarDias(pascoa, ano, -2).mes,  nome: 'Sexta-Feira Santa' },
    { dia: pascoa.dia,                       mes: pascoa.mes,                       nome: 'Páscoa' },
    { dia: somarDias(pascoa, ano, 60).dia,  mes: somarDias(pascoa, ano, 60).mes,  nome: 'Corpus Christi' }
  ];

  const mapa = {};
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    let mesStr = String(f.mes + 1);
    if (mesStr.length < 2) { mesStr = '0' + mesStr; }
    let diaStr = String(f.dia);
    if (diaStr.length < 2) { diaStr = '0' + diaStr; }
    mapa[mesStr + '-' + diaStr] = f.nome;
  }
  return mapa;
}

const COR_FERIADO = '#b8860b';

function buscarFeriadoDoDia(dia, mes, ano) {
  const feriados = obterFeriadosDoAno(ano);
  let mesStr = String(mes + 1);
  if (mesStr.length < 2) { mesStr = '0' + mesStr; }
  let diaStr = String(dia);
  if (diaStr.length < 2) { diaStr = '0' + diaStr; }
  return feriados[mesStr + '-' + diaStr] || null;
}

function Evento(nome, data, hora, categoria) {
  this.id = Date.now() + Math.random();
  this.nome = nome;
  this.data = data;
  this.hora = hora;
  this.categoria = categoria;
}

function salvarNoLocalStorage() {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(eventos));
}

function carregarDoLocalStorage() {
  const dados = localStorage.getItem(CHAVE_STORAGE);
  if (!dados) {
    return [];
  }
  try {
    return JSON.parse(dados);
  } catch (erro) {
    console.error('Erro ao ler eventos do localStorage:', erro);
    return [];
  }
}

function carregarDisciplinas() {
  const dados = localStorage.getItem('plannerUnirio_notas');
  if (!dados) {
    return [];
  }
  try {
    return JSON.parse(dados);
  } catch (erro) {
    return [];
  }
}

const CORES_DISCIPLINAS = ['#ff4d4d', '#ff8c1a', '#ffcc00', '#e60073', '#9b59b6', '#1abc9c'];
const COR_OUTROS = '#888888';
const disciplinasNotas = carregarDisciplinas();

function obterCorCategoria(categoria) {
  if (!categoria || categoria === 'Outros') {
    return COR_OUTROS;
  }
  for (let i = 0; i < disciplinasNotas.length; i++) {
    if (disciplinasNotas[i].nome === categoria) {
      return CORES_DISCIPLINAS[i % CORES_DISCIPLINAS.length];
    }
  }
  return COR_OUTROS;
}

const botaoProximo = document.querySelector('.proximo');
const botaoAnterior = document.querySelector('.anterior');
const el = document.querySelector('.dias');
const inputTitulo = document.getElementById('inputTitulo');
const inputData = document.getElementById('inputData');
const inputHora = document.getElementById('inputHora');
const inputCategoria = document.getElementById('inputCategoria');
const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const btnExcluir = document.getElementById('btnExcluir');
const eventoTitulo = document.getElementById('eventoTitulo');
const eventosHoje = document.getElementById('eventos-hoje');
const listaEventosHoje = document.getElementById('lista-eventos-hoje');
const filtroCategoria = document.getElementById('filtroCategoria');
const listaTodosEventos = document.getElementById('lista-todos-eventos');

let eventos = [];
let eventoEmEdicaoId = null;

const dataAtual = new Date();
let mesAtual = dataAtual.getMonth();
let anoAtual = dataAtual.getFullYear();

const btnConfig = document.getElementById('btn-config');
const dropdownConfig = document.getElementById('dropdown-config');
const btnLogout = document.getElementById('btn-logout');

btnConfig.addEventListener('click', function(e) {
  e.stopPropagation();
  dropdownConfig.classList.toggle('aberto');
});

document.addEventListener('click', function() {
  dropdownConfig.classList.remove('aberto');
});

btnLogout.addEventListener('click', function() {
  sessionStorage.removeItem('plannerUnirio_usuarioLogado');
  window.location.href = 'login.html';
});

function popularSelectCategoria() {
  inputCategoria.innerHTML = '';
  for (let i = 0; i < disciplinasNotas.length; i++) {
    const opcao = document.createElement('option');
    opcao.value = disciplinasNotas[i].nome;
    opcao.textContent = disciplinasNotas[i].nome;
    inputCategoria.appendChild(opcao);
  }
  const opcaoOutros = document.createElement('option');
  opcaoOutros.value = 'Outros';
  opcaoOutros.textContent = 'Outros';
  inputCategoria.appendChild(opcaoOutros);
}

function popularFiltroCategoria() {
  filtroCategoria.innerHTML = '<option value="todos">Todas as Categorias</option>';
  for (let i = 0; i < disciplinasNotas.length; i++) {
    const opcao = document.createElement('option');
    opcao.value = disciplinasNotas[i].nome;
    opcao.textContent = disciplinasNotas[i].nome;
    filtroCategoria.appendChild(opcao);
  }
  const opcaoOutros = document.createElement('option');
  opcaoOutros.value = 'Outros';
  opcaoOutros.textContent = 'Outros';
  filtroCategoria.appendChild(opcaoOutros);
}

function formatarDataExibicao(data) {
  const partes = data.split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function renderListaEventos() {
  const filtro = filtroCategoria.value;
  const lista = [];
  for (let i = 0; i < eventos.length; i++) {
    const categoria = eventos[i].categoria || 'Outros';
    if (filtro === 'todos' || categoria === filtro) {
      lista.push(eventos[i]);
    }
  }

  lista.sort(function(a, b) {
    if (a.data === b.data) {
      return (a.hora || '').localeCompare(b.hora || '');
    }
    return a.data < b.data ? -1 : 1;
  });

  listaTodosEventos.innerHTML = '';

  if (lista.length === 0) {
    listaTodosEventos.innerHTML = '<p style="color:#999;font-size:14px;">Nenhum evento encontrado.</p>';
    return;
  }

  for (let j = 0; j < lista.length; j++) {
    const evento = lista[j];
    const cor = obterCorCategoria(evento.categoria);
    const horaTexto = evento.hora ? ' · ' + evento.hora : '';
    const item = document.createElement('div');
    item.className = 'evento-item-lista';
    item.dataset.id = evento.id;
    item.innerHTML = '<span class="evento-cor-dot" style="background:' + cor + '"></span>' +
                      '<span class="evento-mini-info">' +
                        '<strong>' + evento.nome + '</strong>' +
                        '<span class="evento-mini-hora">' + formatarDataExibicao(evento.data) + horaTexto + ' · ' + (evento.categoria || 'Outros') + '</span>' +
                      '</span>';
    listaTodosEventos.appendChild(item);
  }

  const itensLista = listaTodosEventos.querySelectorAll('.evento-item-lista');
  for (let k = 0; k < itensLista.length; k++) {
    (function(item) {
      item.addEventListener('click', function() {
        const id = item.dataset.id;
        let eventoEncontrado = null;
        for (let m = 0; m < eventos.length; m++) {
          if (String(eventos[m].id) === id) {
            eventoEncontrado = eventos[m];
            break;
          }
        }
        if (eventoEncontrado) {
          mostrarPosicaoNoCalendario(eventoEncontrado);
        }
      });
    })(itensLista[k]);
  }
}

function mostrarPosicaoNoCalendario(evento) {
  const partes = evento.data.split('-');
  const ano = parseInt(partes[0]);
  const mes = parseInt(partes[1]) - 1;
  const dia = parseInt(partes[2]);

  mesAtual = mes;
  anoAtual = ano;
  atualizarCalendario(mesAtual, anoAtual);

  const quadrado = el.querySelector('.dia-quadrado[data-dia="' + dia + '"]');
  if (!quadrado) {
    return;
  }

  quadrado.scrollIntoView({ behavior: 'smooth', block: 'center' });
  quadrado.classList.add('dia-destaque');
  setTimeout(function() {
    quadrado.classList.remove('dia-destaque');
  }, 2000);

  const pill = quadrado.querySelector('.evento-pill[data-id="' + evento.id + '"]');
  if (pill) {
    pill.classList.add('evento-pill-destaque');
    setTimeout(function() {
      pill.classList.remove('evento-pill-destaque');
    }, 2000);
  }
}

function buscarEventosDoDia(dia, mes, ano) {
  let mesFormatado = String(mes + 1);
  if (mesFormatado.length < 2) { mesFormatado = '0' + mesFormatado; }
  let diaFormatado = String(dia);
  if (diaFormatado.length < 2) { diaFormatado = '0' + diaFormatado; }

  const dataFormatada = ano + '-' + mesFormatado + '-' + diaFormatado;

  const filtrados = [];
  for (let i = 0; i < eventos.length; i++) {
    if (eventos[i].data === dataFormatada) {
      filtrados.push(eventos[i]);
    }
  }
  return filtrados;
}

function atualizarCalendario(mes, ano) {
  const elMes = document.getElementById('mes');
  const elAno = document.getElementById('ano');

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  elMes.textContent = meses[mes];
  elAno.textContent = ano;

  el.innerHTML = '';

  for (let i = 0; i < primeiroDia; i++) {
    el.innerHTML += '<span class="vazio"></span>';
  }

  const hoje = new Date();
  const ehMesAtual = hoje.getMonth() === mes && hoje.getFullYear() === ano;

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const eventosDoDia = buscarEventosDoDia(dia, mes, ano);
    const isHoje = ehMesAtual && hoje.getDate() === dia;

    const nomeFeriado = buscarFeriadoDoDia(dia, mes, ano);

    let eventosHTML = '';

    if (nomeFeriado) {
      eventosHTML += '<div class="evento-pill feriado-pill" style="background-color:' + COR_FERIADO + '" title="' + nomeFeriado + '">' +
                       nomeFeriado +
                     '</div>';
    }

    for (let j = 0; j < eventosDoDia.length; j++) {
      const evento = eventosDoDia[j];
      const cor = obterCorCategoria(evento.categoria);
      const horaTexto = evento.hora ? evento.hora + ' · ' : '';
      eventosHTML += '<div class="evento-pill" data-id="' + evento.id + '" style="background-color:' + cor + '">' +
                       horaTexto + evento.nome +
                     '</div>';
    }

    let classeQuadrado = 'dia-quadrado';
    if (isHoje) { classeQuadrado += ' hoje'; }
    if (nomeFeriado) { classeQuadrado += ' feriado'; }

    let classeNumero = 'numero-dia';
    if (isHoje) { classeNumero += ' numero-hoje'; }

    el.innerHTML += '<div class="' + classeQuadrado + '" data-dia="' + dia + '">' +
                      '<span class="' + classeNumero + '">' + dia + '</span>' +
                      '<div class="eventos-lista">' + eventosHTML + '</div>' +
                    '</div>';
  }

  const pills = el.querySelectorAll('.evento-pill');
  for (let k = 0; k < pills.length; k++) {
    (function(pill) {
      pill.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = pill.dataset.id;

        let eventoEncontrado = null;
        for (let m = 0; m < eventos.length; m++) {
          if (String(eventos[m].id) === id) {
            eventoEncontrado = eventos[m];
            break;
          }
        }
        if (eventoEncontrado) {
          abrirEdicao(eventoEncontrado);
        }
      });
    })(pills[k]);
  }

  const quadrados = el.querySelectorAll('.dia-quadrado');
  for (let k = 0; k < quadrados.length; k++) {
    (function(quadrado) {
      quadrado.addEventListener('click', function() {
        const dia = quadrado.dataset.dia;
        let mesFormatado = String(mesAtual + 1);
        if (mesFormatado.length < 2) { mesFormatado = '0' + mesFormatado; }
        let diaFormatado = String(dia);
        if (diaFormatado.length < 2) { diaFormatado = '0' + diaFormatado; }

        const dataFormatada = anoAtual + '-' + mesFormatado + '-' + diaFormatado;
        inputData.value = dataFormatada;
        mostrarEventosDia(parseInt(dia), mesAtual, anoAtual);
      });
    })(quadrados[k]);
  }
}

function mostrarEventosDia(dia, mes, ano) {
  const eventosDoDia = buscarEventosDoDia(dia, mes, ano);
  const nomeFeriado = buscarFeriadoDoDia(dia, mes, ano);

  if (eventosDoDia.length === 0 && !nomeFeriado) {
    eventosHoje.style.display = 'none';
    return;
  }
  eventosHoje.style.display = 'block';
  listaEventosHoje.innerHTML = '';

  if (nomeFeriado) {
    const cardFeriado = document.createElement('div');
    cardFeriado.className = 'evento-card-mini';
    cardFeriado.innerHTML = '<span class="evento-cor-dot" style="background:' + COR_FERIADO + '"></span>' +
                            '<span class="evento-mini-info">' +
                              '<strong>' + nomeFeriado + '</strong>' +
                              '<span class="evento-mini-hora">Feriado Nacional</span>' +
                            '</span>';
    listaEventosHoje.appendChild(cardFeriado);
  }

  for (let i = 0; i < eventosDoDia.length; i++) {
    const evento = eventosDoDia[i];
    const cor = obterCorCategoria(evento.categoria);
    const card = document.createElement('div');
    card.className = 'evento-card-mini';

    const horaHTML = evento.hora ? '<span class="evento-mini-hora">' + evento.hora + '</span>' : '';
    card.innerHTML = '<span class="evento-cor-dot" style="background:' + cor + '"></span>' +
                     '<span class="evento-mini-info">' +
                       '<strong>' + evento.nome + '</strong>' + horaHTML +
                     '</span>' +
                     '<button class="btn-editar-mini" data-id="' + evento.id + '" title="Editar">✏</button>';

    listaEventosHoje.appendChild(card);
  }

  const botoesEditar = listaEventosHoje.querySelectorAll('.btn-editar-mini');
  for (let i = 0; i < botoesEditar.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        let eventoEncontrado = null;
        for (let j = 0; j < eventos.length; j++) {
          if (String(eventos[j].id) === btn.dataset.id) {
            eventoEncontrado = eventos[j];
            break;
          }
        }
        if (eventoEncontrado) {
          abrirEdicao(eventoEncontrado);
        }
      });
    })(botoesEditar[i]);
  }
}

function abrirEdicao(evento) {
  eventoEmEdicaoId = evento.id;
  inputTitulo.value = evento.nome;
  inputData.value = evento.data;
  inputHora.value = evento.hora;
  inputCategoria.value = evento.categoria || 'Outros';
  eventoTitulo.textContent = 'Editar Evento';
  btnExcluir.style.display = 'inline-block';
}

function abrirCriacao() {
  eventoEmEdicaoId = null;
  eventoTitulo.textContent = 'Novo Evento';
  btnExcluir.style.display = 'none';
  eventosHoje.style.display = 'none';
}

function limparFormulario() {
  inputTitulo.value = '';
  inputData.value = '';
  inputHora.value = '';
  inputCategoria.value = 'Outros';
  abrirCriacao();
}

botaoProximo.addEventListener('click', function() {
  mesAtual++;
  if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
  atualizarCalendario(mesAtual, anoAtual);
});

botaoAnterior.addEventListener('click', function() {
  mesAtual--;
  if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
  atualizarCalendario(mesAtual, anoAtual);
});

btnSalvar.addEventListener('click', function() {
  const nomeEvento = inputTitulo.value.trim();
  const dataEvento = inputData.value;
  const horaEvento = inputHora.value;
  const categoriaEvento = inputCategoria.value || 'Outros';

  if (!nomeEvento || !dataEvento) {
    alert('Preencha pelo menos o título e a data do evento.');
    return;
  }

  if (eventoEmEdicaoId !== null) {
    let eventoEncontrado = null;
    for (let i = 0; i < eventos.length; i++) {
      if (eventos[i].id === eventoEmEdicaoId) {
        eventoEncontrado = eventos[i];
        break;
      }
    }
    if (eventoEncontrado) {
      eventoEncontrado.nome = nomeEvento;
      eventoEncontrado.data = dataEvento;
      eventoEncontrado.hora = horaEvento;
      eventoEncontrado.categoria = categoriaEvento;
    }
  } else {
    eventos.push(new Evento(nomeEvento, dataEvento, horaEvento, categoriaEvento));
  }

  salvarNoLocalStorage();
  atualizarCalendario(mesAtual, anoAtual);
  renderListaEventos();
  limparFormulario();
});

btnExcluir.addEventListener('click', function() {
  if (eventoEmEdicaoId === null) return;

  let index = -1;
  for (let i = 0; i < eventos.length; i++) {
    if (eventos[i].id === eventoEmEdicaoId) {
      index = i;
      break;
    }
  }
  if (index !== -1) {
    eventos.splice(index, 1);
  }
  salvarNoLocalStorage();
  atualizarCalendario(mesAtual, anoAtual);
  renderListaEventos();
  limparFormulario();
});

btnCancelar.addEventListener('click', function() {
  limparFormulario();
});

filtroCategoria.addEventListener('change', function() {
  renderListaEventos();
});

eventos = carregarDoLocalStorage();
popularSelectCategoria();
popularFiltroCategoria();
abrirCriacao();
atualizarCalendario(mesAtual, anoAtual);
renderListaEventos();