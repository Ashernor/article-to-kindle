// MV3 service worker: orchestrates clip -> fetch images -> build EPUB -> deliver.
import { buildEpub, slugifyFilename } from "./lib/epub.js";

const DEFAULTS = { kindleEmail: "", mode: "download", relayUrl: "", relayToken: "" };

async function getSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function fetchImages(imageRefs) {
  const images = [];
  await Promise.all(
    imageRefs.map(async (ref) => {
      try {
        const res = await fetch(ref.url, { credentials: "omit" });
        if (!res.ok) return;
        const type = (res.headers.get("content-type") || "").split(";")[0].trim();
        if (type && !type.startsWith("image/")) return;
        const buf = await res.arrayBuffer();
        if (buf.byteLength === 0 || buf.byteLength > 8 * 1024 * 1024) return; // skip huge
        images.push({
          id: ref.id,
          filename: ref.filename,
          mediaType: type || "image/jpeg",
          data: new Uint8Array(buf),
        });
      } catch (_) {
        /* image dropped silently; text still ships */
      }
    })
  );
  return images;
}

async function extractFromTab(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["dist/content.js"] });
  return chrome.tabs.sendMessage(tabId, { type: "ATK_EXTRACT" });
}

async function deliverDownload(blob, filename) {
  const dataUrl = await blobToDataURL(blob);
  await chrome.downloads.download({ url: dataUrl, filename, saveAs: false });
  return `EPUB téléchargé : ${filename}`;
}

async function deliverRelay(blob, filename, settings) {
  if (!settings.relayUrl) throw new Error("Aucune URL de relais configurée.");
  if (!settings.kindleEmail) throw new Error("Aucune adresse Kindle configurée.");
  const dataUrl = await blobToDataURL(blob); // data:...;base64,XXXX
  const base64 = String(dataUrl).split(",")[1] || "";
  const res = await fetch(settings.relayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: settings.kindleEmail, filename, epubBase64: base64, token: settings.relayToken || undefined }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Relais: ${res.status} ${text.slice(0, 200)}`);
  return `Envoyé à ${settings.kindleEmail}`;
}

async function clip(tabId) {
  const settings = await getSettings();
  const article = await extractFromTab(tabId);
  if (!article || article.error) throw new Error(article ? article.error : "Extraction vide.");

  const images = await fetchImages(article.imageRefs || []);
  const blob = await buildEpub({ ...article, images });
  const filename = slugifyFilename(article.title);

  if (settings.mode === "relay") return deliverRelay(blob, filename, settings);
  return deliverDownload(blob, filename);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "ATK_CLIP" && msg.tabId != null) {
    clip(msg.tabId)
      .then((status) => sendResponse({ ok: true, status }))
      .catch((e) => sendResponse({ ok: false, error: String(e && e.message ? e.message : e) }));
    return true; // async
  }
});
