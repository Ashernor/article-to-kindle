const DEFAULTS = { kindleEmail: "", mode: "download", relayUrl: "", relayToken: "" };
const $ = (id) => document.getElementById(id);

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (kind ? " " + kind : "");
}

function syncRelayVisibility() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  document.querySelector(".relay-only").classList.toggle("hidden", mode !== "relay");
}

async function load() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  $("kindleEmail").value = s.kindleEmail || "";
  $("relayUrl").value = s.relayUrl || "";
  $("relayToken").value = s.relayToken || "";
  const radio = document.querySelector(`input[name="mode"][value="${s.mode || "download"}"]`);
  if (radio) radio.checked = true;
  syncRelayVisibility();
}

async function save() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  await chrome.storage.sync.set({
    mode,
    kindleEmail: $("kindleEmail").value.trim(),
    relayUrl: $("relayUrl").value.trim(),
    relayToken: $("relayToken").value.trim(),
  });
  setStatus("Réglages enregistrés.", "ok");
}

async function send() {
  setStatus("Extraction et conversion…");
  $("send").disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/.test(tab.url || "")) throw new Error("Ouvre d'abord une page web (http/https).");
    const res = await chrome.runtime.sendMessage({ type: "ATK_CLIP", tabId: tab.id });
    if (!res || !res.ok) throw new Error(res ? res.error : "Erreur inconnue.");
    setStatus("✓ " + res.status, "ok");
  } catch (e) {
    setStatus("✗ " + (e.message || e), "err");
  } finally {
    $("send").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  $("send").addEventListener("click", send);
  $("save").addEventListener("click", save);
  document.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener("change", syncRelayVisibility)
  );
});
