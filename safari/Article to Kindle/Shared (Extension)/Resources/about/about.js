const t = (k) => (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getMessage(k)) || "";
document.querySelectorAll("[data-i18n]").forEach((el) => {
  const m = t(el.getAttribute("data-i18n"));
  if (m) el.textContent = m; // only override the HTML default when a translation exists
});
try {
  document.getElementById("version").textContent = chrome.runtime.getManifest().version;
} catch (_) {}
