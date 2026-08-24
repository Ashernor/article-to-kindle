const DEFAULTS = { kindleEmail: "", mode: "download", relayUrl: "", relayToken: "" };
const $ = (id) => document.getElementById(id);
const t = (k, s) => (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getMessage(k, s)) || "";
const DOWNLOADS_OK = typeof chrome !== "undefined" && !!chrome.downloads;

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const m = t(el.getAttribute("data-i18n"));
    if (m) el.textContent = m;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const m = t(el.getAttribute("data-i18n-ph"));
    if (m) el.setAttribute("placeholder", m);
  });
}

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (kind ? " " + kind : "");
}

function syncRelayVisibility() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  document.querySelector(".relay-only").classList.toggle("hidden", mode !== "relay");
}

function gateDownload() {
  if (DOWNLOADS_OK) return;
  const dl = document.querySelector('input[name="mode"][value="download"]');
  if (!dl) return;
  dl.disabled = true;
  const lbl = dl.closest("label");
  if (lbl) lbl.style.opacity = ".55";
  const span = lbl && lbl.querySelector('[data-i18n="welcomeModeDownloadLong"]');
  const hint = t("downloadUnavailable");
  if (span && hint && !span.dataset.gated) {
    span.dataset.gated = "1";
    span.textContent += " — " + hint;
  }
  if (dl.checked) {
    const relay = document.querySelector('input[name="mode"][value="relay"]');
    if (relay) relay.checked = true;
  }
}

async function load() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  $("kindleEmail").value = s.kindleEmail || "";
  $("relayUrl").value = s.relayUrl || "";
  $("relayToken").value = s.relayToken || "";
  const radio = document.querySelector(`input[name="mode"][value="${s.mode || "download"}"]`);
  if (radio) radio.checked = true;
  gateDownload();
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
  setStatus("✓ " + (t("savedOk") || "Saved."), "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
  load();
  $("save").addEventListener("click", save);
  document.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener("change", syncRelayVisibility)
  );
});
