const t = (k) => (chrome.i18n && chrome.i18n.getMessage(k)) || k;
document.querySelectorAll("[data-i18n]").forEach((el) => {
  const m = t(el.getAttribute("data-i18n"));
  if (m) el.textContent = m;
});
try {
  document.getElementById("version").textContent = chrome.runtime.getManifest().version;
} catch (_) {}
