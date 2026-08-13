const CONFIG = {
  VAULTS_SHEET: "Vaults",
  DATA_SHEET: "Data",
  PEPPER_PROPERTY: "PLANNER_SERVER_PEPPER",
  MAX_CHUNK_LENGTH: 45000,
  API_VERSION: "encrypted-vault-v2"
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Planner")
    .addItem("Preparar planilha", "setup")
    .addToUi();
}

function setup() {
  getPepper_();
  const vaults = getOrCreateSheet_(CONFIG.VAULTS_SHEET);
  const data = getOrCreateSheet_(CONFIG.DATA_SHEET);

  ensureHeader_(vaults, [
    "vaultId",
    "authHash",
    "createdAt",
    "updatedAt",
    "disabled",
    "lastAccessAt"
  ]);

  ensureDataHeader_(data);
}

function doGet(e) {
  return handle_(e, "GET");
}

function doPost(e) {
  return handle_(e, "POST");
}

function handle_(e, method) {
  try {
    setup();
    const req = readRequest_(e, method);
    const action = String(req.action || "ping");

    if (action === "ping") {
      return respond_({ ok: true, service: "planner-academico", version: CONFIG.API_VERSION }, req.callback);
    }

    if (action === "load") {
      assertVaultRequest_(req);
      throttle_("vault:" + req.vaultId, 80, 60);
      const vault = requireVault_(req.vaultId);
      assertEnabled_(vault);
      assertAuth_(vault, req.keyHash);
      touchVault_(vault.row);
      const encryptedVault = loadEncryptedVault_(req.vaultId);
      return respond_({
        ok: true,
        vault: encryptedVault,
        data: decodeLegacyVault_(encryptedVault)
      }, req.callback);
    }

    if (action === "save") {
      assertVaultRequest_(req);
      assertPost_(method);
      throttle_("vault:" + req.vaultId, 80, 60);
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        const vault = getVault_(req.vaultId);
        if (vault) {
          assertEnabled_(vault);
          assertAuth_(vault, req.keyHash);
          saveEncryptedVault_(req.vaultId, normalizeEncryptedVault_(req));
          updateVault_(vault.row);
        } else {
          createVault_(req.vaultId, req.keyHash);
          saveEncryptedVault_(req.vaultId, normalizeEncryptedVault_(req));
        }
      } finally {
        lock.releaseLock();
      }
      return respond_({ ok: true }, req.callback);
    }

    if (action === "delete") {
      assertVaultRequest_(req);
      assertPost_(method);
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        const vault = requireVault_(req.vaultId);
        assertEnabled_(vault);
        assertAuth_(vault, req.keyHash);
        deleteVaultData_(req.vaultId);
        disableVault_(vault.row);
      } finally {
        lock.releaseLock();
      }
      return respond_({ ok: true }, req.callback);
    }

    throw new Error("Acao invalida.");
  } catch (err) {
    return respond_({ ok: false, error: String(err.message || err) }, getCallback_(e));
  }
}

function readRequest_(e, method) {
  if (method === "GET") {
    return Object.assign({}, e.parameter || {});
  }

  const contents = e.postData && e.postData.contents ? e.postData.contents : "";
  if (contents) {
    try {
      return JSON.parse(contents);
    } catch (err) {
      if (e.parameter && e.parameter.payload) {
        return JSON.parse(e.parameter.payload);
      }
      throw new Error("POST deve enviar JSON ou campo payload com JSON.");
    }
  }

  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  return Object.assign({}, e.parameter || {});
}

function assertPost_(method) {
  if (method !== "POST") {
    throw new Error("Esta acao exige POST.");
  }
}

function assertVaultRequest_(req) {
  req.vaultId = String(req.vaultId || "").trim();
  req.keyHash = String(req.keyHash || "").trim().toLowerCase();
  if (!/^[a-zA-Z0-9_-]{24,120}$/.test(req.vaultId)) {
    throw new Error("vaultId invalido.");
  }
  if (!/^[a-f0-9]{64}$/.test(req.keyHash)) {
    throw new Error("keyHash invalido. Envie SHA-256 hex da chave do usuario.");
  }
}

function createVault_(vaultId, keyHash) {
  const sheet = getOrCreateSheet_(CONFIG.VAULTS_SHEET);
  sheet.appendRow([
    vaultId,
    serverHash_(keyHash),
    now_(),
    now_(),
    false,
    now_()
  ]);
}

function getVault_(vaultId) {
  const sheet = getOrCreateSheet_(CONFIG.VAULTS_SHEET);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === vaultId) {
      return {
        row: i + 1,
        vaultId: String(values[i][0]),
        authHash: String(values[i][1]),
        disabled: String(values[i][4]).toLowerCase() === "true"
      };
    }
  }
  return null;
}

function requireVault_(vaultId) {
  const vault = getVault_(vaultId);
  if (!vault) {
    throw new Error("Cofre nao encontrado.");
  }
  return vault;
}

function assertEnabled_(vault) {
  if (vault.disabled) {
    throw new Error("Cofre desativado.");
  }
}

function assertAuth_(vault, keyHash) {
  const expected = serverHash_(keyHash);
  if (vault.authHash !== expected) {
    throttle_("fail:" + vault.vaultId, 12, 300);
    throw new Error("Chave de acesso invalida.");
  }
}

function updateVault_(row) {
  const sheet = getOrCreateSheet_(CONFIG.VAULTS_SHEET);
  sheet.getRange(row, 4).setValue(now_());
  sheet.getRange(row, 6).setValue(now_());
}

function touchVault_(row) {
  getOrCreateSheet_(CONFIG.VAULTS_SHEET).getRange(row, 6).setValue(now_());
}

function disableVault_(row) {
  const sheet = getOrCreateSheet_(CONFIG.VAULTS_SHEET);
  sheet.getRange(row, 4).setValue(now_());
  sheet.getRange(row, 5).setValue(true);
}

function normalizeEncryptedVault_(req) {
  const encryptedPayload = String(req.encryptedPayload || "").trim();
  const iv = String(req.iv || "").trim();
  const algorithm = String(req.algorithm || "AES-GCM").trim();
  const version = String(req.version || "1").trim();

  if (encryptedPayload && iv) {
    if (!/^[A-Za-z0-9_-]+$/.test(encryptedPayload)) {
      throw new Error("encryptedPayload invalido.");
    }
    if (!/^[A-Za-z0-9_-]+$/.test(iv)) {
      throw new Error("iv invalido.");
    }
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(algorithm)) {
      throw new Error("algorithm invalido.");
    }
    if (!/^[A-Za-z0-9_.-]{1,20}$/.test(version)) {
      throw new Error("version invalida.");
    }

    return {
      encryptedPayload: encryptedPayload,
      iv: iv,
      algorithm: algorithm,
      version: version
    };
  }

  if (req.data !== undefined) {
    return {
      encryptedPayload: Utilities.base64EncodeWebSafe(JSON.stringify(req.data)),
      iv: "legacy-unencrypted",
      algorithm: "LEGACY-PLAINTEXT-BASE64",
      version: "legacy"
    };
  }

  throw new Error("Envie encryptedPayload e iv.");
}

function saveEncryptedVault_(vaultId, vault) {
  deleteVaultData_(vaultId);
  const sheet = getOrCreateSheet_(CONFIG.DATA_SHEET);
  appendEncryptedRows_(sheet, vaultId, vault);
}

function loadEncryptedVault_(vaultId) {
  const sheet = getOrCreateSheet_(CONFIG.DATA_SHEET);
  const values = sheet.getDataRange().getValues();
  const chunks = [];
  let iv = "";
  let algorithm = "";
  let version = "";

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) !== vaultId) {
      continue;
    }
    const index = Number(values[i][2]);
    chunks[index] = String(values[i][3] || "");
    iv = String(values[i][4] || "");
    algorithm = String(values[i][5] || "");
    version = String(values[i][6] || "");
  }

  if (chunks.length === 0) {
    return null;
  }

  return {
    encryptedPayload: chunks.join(""),
    iv: iv,
    algorithm: algorithm || "AES-GCM",
    version: version || "1"
  };
}

function decodeLegacyVault_(vault) {
  if (!vault || vault.algorithm !== "LEGACY-PLAINTEXT-BASE64") {
    return null;
  }

  try {
    const bytes = Utilities.base64DecodeWebSafe(vault.encryptedPayload);
    const text = Utilities.newBlob(bytes).getDataAsString("UTF-8");
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

function deleteVaultData_(vaultId) {
  const sheet = getOrCreateSheet_(CONFIG.DATA_SHEET);
  const values = sheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === vaultId) {
      sheet.deleteRow(i + 1);
    }
  }
}

function ensureDataHeader_(sheet) {
  const newHeader = [
    "vaultId",
    "payloadType",
    "chunkIndex",
    "chunk",
    "iv",
    "algorithm",
    "version",
    "updatedAt"
  ];
  const oldHeader = [
    "vaultId",
    "storageKey",
    "chunkIndex",
    "chunk",
    "updatedAt"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, newHeader.length).setValues([newHeader]);
    sheet.setFrozenRows(1);
    return;
  }

  const existing = sheet.getRange(1, 1, 1, Math.max(newHeader.length, oldHeader.length)).getValues()[0];
  if (headersMatch_(existing, newHeader)) {
    return;
  }

  if (headersMatch_(existing, oldHeader)) {
    migrateOldDataSheet_(sheet, newHeader);
    return;
  }

  throw new Error("A aba Data tem um cabecalho desconhecido. Verifique a planilha antes de executar.");
}

function headersMatch_(existing, expected) {
  for (let i = 0; i < expected.length; i++) {
    if (String(existing[i] || "") !== expected[i]) {
      return false;
    }
  }
  return true;
}

function migrateOldDataSheet_(sheet, newHeader) {
  const values = sheet.getDataRange().getValues();
  const grouped = {};

  for (let i = 1; i < values.length; i++) {
    const vaultId = String(values[i][0] || "");
    const storageKey = String(values[i][1] || "");
    const chunkIndex = Number(values[i][2]);
    const chunk = String(values[i][3] || "");

    if (!vaultId || !storageKey || isNaN(chunkIndex)) {
      continue;
    }

    if (!grouped[vaultId]) {
      grouped[vaultId] = {};
    }
    if (!grouped[vaultId][storageKey]) {
      grouped[vaultId][storageKey] = [];
    }
    grouped[vaultId][storageKey][chunkIndex] = chunk;
  }

  const backupName = "Data_backup_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  sheet.copyTo(sheet.getParent()).setName(backupName);

  sheet.clear();
  sheet.getRange(1, 1, 1, newHeader.length).setValues([newHeader]);
  sheet.setFrozenRows(1);

  Object.keys(grouped).forEach(function(vaultId) {
    const data = {};
    Object.keys(grouped[vaultId]).forEach(function(storageKey) {
      data[storageKey] = grouped[vaultId][storageKey].join("");
    });

    appendEncryptedRows_(sheet, vaultId, {
      encryptedPayload: Utilities.base64EncodeWebSafe(JSON.stringify(data)),
      iv: "legacy-unencrypted",
      algorithm: "LEGACY-PLAINTEXT-BASE64",
      version: "legacy"
    });
  });
}

function appendEncryptedRows_(sheet, vaultId, vault) {
  const rows = [];
  const text = vault.encryptedPayload;

  for (let chunkIndex = 0; chunkIndex * CONFIG.MAX_CHUNK_LENGTH < text.length; chunkIndex++) {
    rows.push([
      vaultId,
      "encryptedPayload",
      chunkIndex,
      text.slice(
        chunkIndex * CONFIG.MAX_CHUNK_LENGTH,
        (chunkIndex + 1) * CONFIG.MAX_CHUNK_LENGTH
      ),
      vault.iv,
      vault.algorithm,
      vault.version,
      now_()
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function throttle_(key, maxHits, ttlSeconds) {
  const cache = CacheService.getScriptCache();
  const current = Number(cache.get(key) || "0");
  if (current >= maxHits) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos.");
  }
  cache.put(key, String(current + 1), ttlSeconds);
}

function serverHash_(keyHash) {
  return sha256Hex_(getPepper_() + ":" + keyHash);
}

function sha256Hex_(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    text,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function getPepper_() {
  const props = PropertiesService.getScriptProperties();
  let pepper = props.getProperty(CONFIG.PEPPER_PROPERTY);
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(CONFIG.PEPPER_PROPERTY, pepper);
  }
  return pepper;
}

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeader_(sheet, header) {
  const existing = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  const same = header.every(function(value, index) {
    return existing[index] === value;
  });
  if (!same) {
    sheet.clear();
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    sheet.setFrozenRows(1);
  }
}

function respond_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getCallback_(e) {
  return e && e.parameter ? e.parameter.callback : "";
}

function now_() {
  return new Date().toISOString();
}
