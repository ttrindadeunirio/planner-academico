const homeState = {
  keyField: null,
  status: null
};

function setHomeStatus(message, type) {
  homeState.status.textContent = message;
  homeState.status.className = "sync-status home-status" + (type ? " sync-status-" + type : "");
}

function getHomeKey() {
  return homeState.keyField.value.trim();
}

function salvarChaveDaEntrada() {
  const chave = getHomeKey();
  if (chave.length < 24) {
    setHomeStatus("Cole uma chave válida ou gere uma nova chave.", "erro");
    return false;
  }

  localStorage.setItem(PLANNER_ACCESS_KEY, chave);
  setHomeStatus("Chave salva neste navegador.", "ok");
  return true;
}

async function preencherChaveInicial() {
  const credenciais = await obterCredenciais();
  homeState.keyField.value = credenciais.accessKey;
  setHomeStatus("Chave pronta. Ao abrir as telas do planner, os dados serão carregados da planilha automaticamente.", "info");
}

async function copiarChaveHome() {
  if (!salvarChaveDaEntrada()) return;
  await navigator.clipboard.writeText(getHomeKey());
  setHomeStatus("Chave copiada.", "ok");
}

function gerarNovaChaveHome() {
  const chaveAtual = localStorage.getItem(PLANNER_ACCESS_KEY);
  if (chaveAtual && !confirm("Gerar uma nova chave cria um cofre separado. Continuar?")) {
    return;
  }

  const chave = gerarChaveAcesso();
  homeState.keyField.value = chave;
  localStorage.setItem(PLANNER_ACCESS_KEY, chave);
  setHomeStatus("Nova chave gerada. Guarde uma cópia dela.", "ok");
}

async function salvarDadosHome() {
  if (!salvarChaveDaEntrada()) return;

  try {
    setHomeStatus("Salvando dados locais na planilha...", "info");
    await enviarDadosParaNuvem();
    setHomeStatus("Dados locais salvos na planilha.", "ok");
  } catch (erro) {
    setHomeStatus(erro.message || "Não foi possível salvar na planilha.", "erro");
  }
}

async function carregarEEntrarHome() {
  if (!salvarChaveDaEntrada()) return;

  try {
    setHomeStatus("Carregando dados da planilha...", "info");
    await carregarDadosDaNuvem();
    setHomeStatus("Dados carregados. Entrando...", "ok");
    window.location.href = "agenda.html";
  } catch (erro) {
    setHomeStatus(erro.message || "Não foi possível carregar da planilha.", "erro");
  }
}

function entrarHome() {
  if (!salvarChaveDaEntrada()) return;
  window.location.href = "agenda.html";
}

document.addEventListener("DOMContentLoaded", function() {
  homeState.keyField = document.getElementById("home-chave");
  homeState.status = document.getElementById("home-status");

  document.getElementById("home-usar-chave").addEventListener("click", salvarChaveDaEntrada);
  document.getElementById("home-copiar-chave").addEventListener("click", copiarChaveHome);
  document.getElementById("home-nova-chave").addEventListener("click", gerarNovaChaveHome);
  document.getElementById("home-salvar-planilha").addEventListener("click", salvarDadosHome);
  document.getElementById("home-carregar-entrar").addEventListener("click", carregarEEntrarHome);
  document.getElementById("home-entrar").addEventListener("click", entrarHome);

  preencherChaveInicial();
});
