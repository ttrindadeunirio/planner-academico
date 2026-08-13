const PLANNER_SYNC_URL = "https://script.google.com/macros/s/AKfycbzEHcqeK6hJUrAm1AIXW-xPP2QjAx7gIimh51kCEF4XZI8xhMVLGQIi0kiTC9zI6Dag/exec";

const PLANNER_SYNC_KEYS = [
  "agenda_eventos",
  "plannerAcademico_notas",
  "plannerAcademico_faltas"
];

const PLANNER_ACCESS_KEY = "plannerAcademico_chaveAcesso";
const PLANNER_SYNC_PENDING = "plannerAcademico_syncPendente";
const PLANNER_REQUIRED_BACKEND_VERSION = "encrypted-vault-v2";

const syncState = {
  modal: null,
  status: null,
  keyField: null,
  autoTimer: null,
  saving: false,
  applyingRemoteData: false,
  cryptoKeyCache: {},
  backendCheckPromise: null
};

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function randomBase64Url(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(hash);
}

function gerarChaveAcesso() {
  const vaultId = randomBase64Url(18);
  const secret = randomBase64Url(32);
  return "AP1-" + vaultId + "-" + secret;
}

async function obterCredenciais() {
  let chave = localStorage.getItem(PLANNER_ACCESS_KEY);
  if (!chave) {
    chave = gerarChaveAcesso();
    localStorage.setItem(PLANNER_ACCESS_KEY, chave);
  }

  const partes = chave.match(/^AP1-([A-Za-z0-9_-]{24,120})-([A-Za-z0-9_-]{32,120})$/);
  if (partes) {
    return {
      accessKey: chave,
      vaultId: partes[1],
      keyHash: await sha256Hex(partes[2]),
      cryptoSecret: partes[2]
    };
  }

  const legacyHash = await sha256Hex(chave);
  return {
    accessKey: chave,
    vaultId: legacyHash.slice(0, 32),
    keyHash: legacyHash,
    cryptoSecret: chave
  };
}

async function derivarChaveCriptografia(credenciais) {
  const cacheKey = credenciais.vaultId + ":" + credenciais.keyHash;
  if (syncState.cryptoKeyCache[cacheKey]) {
    return syncState.cryptoKeyCache[cacheKey];
  }

  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(credenciais.cryptoSecret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const chave = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("planner-academico:" + credenciais.vaultId),
      iterations: 150000,
      hash: "SHA-256"
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  syncState.cryptoKeyCache[cacheKey] = chave;
  return chave;
}

async function criptografarDadosLocais(credenciais) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const chave = await derivarChaveCriptografia(credenciais);
  const texto = JSON.stringify(coletarDadosLocais());
  const bytes = new TextEncoder().encode(texto);
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    chave,
    bytes
  );

  return {
    encryptedPayload: bytesToBase64Url(new Uint8Array(cifrado)),
    iv: bytesToBase64Url(iv),
    algorithm: "AES-GCM-PBKDF2-SHA256",
    version: "2"
  };
}

async function descriptografarVault(vault, credenciais) {
  if (!vault || !vault.encryptedPayload) {
    return {};
  }

  if (vault.algorithm === "LEGACY-PLAINTEXT-BASE64") {
    throw new Error("Este cofre antigo precisa ser carregado pelo campo legado do backend.");
  }

  try {
    const chave = await derivarChaveCriptografia(credenciais);
    const iv = base64UrlToBytes(vault.iv);
    const cifrado = base64UrlToBytes(vault.encryptedPayload);
    const aberto = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      chave,
      cifrado
    );
    const texto = new TextDecoder().decode(aberto);
    return JSON.parse(texto);
  } catch (erro) {
    throw new Error("Não foi possível descriptografar o cofre. Confira se a chave está correta.");
  }
}

function coletarDadosLocais() {
  const data = {};
  for (let i = 0; i < PLANNER_SYNC_KEYS.length; i++) {
    const key = PLANNER_SYNC_KEYS[i];
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }
  return data;
}

function aplicarDadosLocais(data) {
  let alterou = false;
  syncState.applyingRemoteData = true;

  try {
    for (let i = 0; i < PLANNER_SYNC_KEYS.length; i++) {
      const key = PLANNER_SYNC_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (localStorage.getItem(key) !== data[key]) {
          localStorage.setItem(key, data[key]);
          alterou = true;
        }
      }
    }
  } finally {
    syncState.applyingRemoteData = false;
  }

  return alterou;
}

function setSyncStatus(message, type) {
  if (!syncState.status) return;
  syncState.status.textContent = message;
  syncState.status.className = "sync-status" + (type ? " sync-status-" + type : "");
}

async function salvarNaNuvem(silencioso) {
  if (syncState.saving) return;
  syncState.saving = true;

  try {
    if (!silencioso) setSyncStatus("Salvando dados...", "info");
    await enviarDadosParaNuvem();
    if (!silencioso) setSyncStatus("Dados enviados para a planilha.", "ok");
  } catch (erro) {
    if (!silencioso) setSyncStatus(erro.message || "Erro ao salvar dados.", "erro");
  } finally {
    syncState.saving = false;
  }
}

async function enviarDadosParaNuvem() {
  await verificarBackendCriptografado();
  const credenciais = await obterCredenciais();
  const vault = await criptografarDadosLocais(credenciais);
  const payload = {
    action: "save",
    vaultId: credenciais.vaultId,
    keyHash: credenciais.keyHash,
    encryptedPayload: vault.encryptedPayload,
    iv: vault.iv,
    algorithm: vault.algorithm,
    version: vault.version
  };

  const resposta = await fetch(PLANNER_SYNC_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const json = await resposta.json();
  if (!json.ok) {
    throw new Error(json.error || "Não foi possível salvar.");
  }

  localStorage.setItem("plannerAcademico_ultimaSync", new Date().toISOString());
  localStorage.removeItem(PLANNER_SYNC_PENDING);
}

// Substitua a função jsonp original por esta chamada usando fetch com redirect
async function jsonp(url) {
  // O Apps Script aceita GET normal do GitHub Pages se seguirmos o redirecionamento (redirect: 'follow')
  const resposta = await fetch(url, {
    method: "GET",
    redirect: "follow"
  });

  if (!resposta.ok) {
    throw new Error("Falha na rede ao acessar o Apps Script.");
  }

  return await resposta.json();
}

async function carregarDaNuvem() {
  try {
    setSyncStatus("Carregando dados...", "info");
    await carregarDadosDaNuvem();
    setSyncStatus("Dados carregados. Recarregue a página para ver tudo atualizado.", "ok");

    if (confirm("Dados carregados. Recarregar a página agora?")) {
      window.location.reload();
    }
  } catch (erro) {
    setSyncStatus(erro.message || "Erro ao carregar dados.", "erro");
  }
}

async function carregarDadosDaNuvem() {
  await verificarBackendCriptografado();
  const credenciais = await obterCredenciais();
  const params = new URLSearchParams({
    action: "load",
    vaultId: credenciais.vaultId,
    keyHash: credenciais.keyHash
  });
  const resposta = await jsonp(PLANNER_SYNC_URL + "?" + params.toString());

  if (!resposta.ok) {
    throw new Error(resposta.error || "Não foi possível carregar.");
  }

  let data = {};
  let deveMigrarCofreLegado = false;

  if (resposta.vault && resposta.vault.algorithm !== "LEGACY-PLAINTEXT-BASE64") {
    data = await descriptografarVault(resposta.vault, credenciais);
  } else if (resposta.data) {
    data = resposta.data;
    deveMigrarCofreLegado = true;
  }

  const alterou = aplicarDadosLocais(data);
  localStorage.setItem("plannerAcademico_ultimaSync", new Date().toISOString());

  if (deveMigrarCofreLegado) {
    await enviarDadosParaNuvem();
  }

  return { data: data, alterou: alterou };
}

function verificarBackendCriptografado() {
  if (!syncState.backendCheckPromise) {
    const params = new URLSearchParams({ action: "ping" });
    syncState.backendCheckPromise = jsonp(PLANNER_SYNC_URL + "?" + params.toString()).then(function(resposta) {
      if (!resposta.ok || resposta.version !== PLANNER_REQUIRED_BACKEND_VERSION) {
        throw new Error("Atualize e publique o Apps Script antes de sincronizar dados criptografados.");
      }
      return true;
    });
  }
  return syncState.backendCheckPromise;
}

async function carregarAutomaticamenteAoAbrir() {
  if (document.body.classList.contains("home-body")) return;

  try {
    if (localStorage.getItem(PLANNER_SYNC_PENDING) === "true") {
      await enviarDadosParaNuvem();
    }

    const resultado = await carregarDadosDaNuvem();
    if (resultado.alterou) {
      window.location.reload();
    }
  } catch (erro) {
    const mensagem = String(erro.message || erro);
    if (mensagem.indexOf("Cofre não encontrado") === -1) {
      console.warn("Sincronização automática falhou:", erro);
    }
  }
}

function scheduleAutoSync() {
  if (syncState.applyingRemoteData) return;
  localStorage.setItem(PLANNER_SYNC_PENDING, "true");
  clearTimeout(syncState.autoTimer);
  syncState.autoTimer = setTimeout(function() {
    salvarNaNuvem(true);
  }, 400);
}

function observarLocalStorage() {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    originalSetItem(key, value);
    if (PLANNER_SYNC_KEYS.indexOf(key) !== -1) {
      scheduleAutoSync();
    }
  };
}

function abrirSyncModal() {
  obterCredenciais().then(function(credenciais) {
    syncState.keyField.value = credenciais.accessKey;
    setSyncStatus("Chave pronta. Alterações são salvas automaticamente.", "info");
    syncState.modal.classList.add("sync-modal-aberto");
  });
}

function fecharSyncModal() {
  syncState.modal.classList.remove("sync-modal-aberto");
}

function importarChave() {
  const chave = syncState.keyField.value.trim();
  if (!chave) {
    setSyncStatus("Cole uma chave de acesso antes de importar.", "erro");
    return;
  }
  localStorage.setItem(PLANNER_ACCESS_KEY, chave);
  setSyncStatus("Chave importada. Agora você pode carregar ou salvar dados.", "ok");
}

async function copiarChave() {
  await obterCredenciais();
  syncState.keyField.select();
  syncState.keyField.setSelectionRange(0, syncState.keyField.value.length);
  await navigator.clipboard.writeText(syncState.keyField.value);
  setSyncStatus("Chave copiada.", "ok");
}

function novaChave() {
  if (!confirm("Gerar uma nova chave separa este navegador do cofre atual. Continuar?")) {
    return;
  }
  const chave = gerarChaveAcesso();
  localStorage.setItem(PLANNER_ACCESS_KEY, chave);
  syncState.keyField.value = chave;
  setSyncStatus("Nova chave gerada. Salve na nuvem para criar o novo cofre.", "ok");
}

function criarSyncModal() {
  const modal = document.createElement("div");
  modal.className = "sync-modal";
  modal.innerHTML =
    '<div class="sync-modal-backdrop" data-sync-close></div>' +
    '<section class="sync-dialog" aria-modal="true" role="dialog" aria-labelledby="sync-title">' +
      '<div class="sync-dialog-header">' +
        '<h2 id="sync-title">Cofre de dados</h2>' +
        '<button type="button" class="sync-icon-button" data-sync-close aria-label="Fechar">x</button>' +
      '</div>' +
      '<label class="sync-label" for="sync-chave">Chave de acesso</label>' +
      '<textarea id="sync-chave" class="sync-key-field" spellcheck="false"></textarea>' +
      '<div class="sync-actions">' +
        '<button type="button" data-sync-copy>Copiar</button>' +
        '<button type="button" data-sync-import>Importar</button>' +
        '<button type="button" data-sync-new>Nova chave</button>' +
      '</div>' +
      '<div class="sync-primary-actions">' +
        '<button type="button" class="sync-secondary" data-sync-load>Carregar da planilha</button>' +
        '<button type="button" class="sync-primary" data-sync-save>Salvar na planilha</button>' +
      '</div>' +
      '<p class="sync-status" aria-live="polite"></p>' +
    '</section>';

  document.body.appendChild(modal);
  syncState.modal = modal;
  syncState.status = modal.querySelector(".sync-status");
  syncState.keyField = modal.querySelector(".sync-key-field");

  modal.querySelectorAll("[data-sync-close]").forEach(function(el) {
    el.addEventListener("click", fecharSyncModal);
  });
  modal.querySelector("[data-sync-copy]").addEventListener("click", copiarChave);
  modal.querySelector("[data-sync-import]").addEventListener("click", importarChave);
  modal.querySelector("[data-sync-new]").addEventListener("click", novaChave);
  modal.querySelector("[data-sync-save]").addEventListener("click", function() {
    salvarNaNuvem(false);
  });
  modal.querySelector("[data-sync-load]").addEventListener("click", carregarDaNuvem);
}

function criarBotaoSync() {
  const botaoCofre = document.getElementById("btn-cofre");
  const dropdownConfig = document.getElementById("dropdown-config");
  if (!botaoCofre) return;

  botaoCofre.addEventListener("click", function() {
    if (dropdownConfig) dropdownConfig.classList.remove("aberto");
    abrirSyncModal();
  });
}

function configurarMenuConfig() {
  const btnConfig = document.getElementById("btn-config");
  const dropdownConfig = document.getElementById("dropdown-config");
  if (!btnConfig || !dropdownConfig) return;

  btnConfig.addEventListener("click", function(e) {
    e.stopPropagation();
    dropdownConfig.classList.toggle("aberto");
  });

  document.addEventListener("click", function() {
    dropdownConfig.classList.remove("aberto");
  });
}

document.addEventListener("DOMContentLoaded", function() {
  configurarMenuConfig();
  criarBotaoSync();
  criarSyncModal();
  observarLocalStorage();
  obterCredenciais().then(carregarAutomaticamenteAoAbrir);
});
