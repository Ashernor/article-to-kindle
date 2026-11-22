// MV3 service worker: orchestrates clip -> fetch & compress images -> build EPUB -> deliver.
// Runs on both Chromium and Safari (which lacks downloads/contextMenus).
import { buildEpub, slugifyFilename } from "./lib/epub.js";

const DEFAULTS = { kindleEmail: "", mode: "download", relayUrl: "", relayToken: "" };
const HAS_DOWNLOADS = typeof chrome !== "undefined" && !!(chrome.downloads && chrome.downloads.download);
const t = (k, s) => chrome.i18n.getMessage(k, s) || k;

// Image compression: keeps EPUBs small enough for the relay (Netlify ~6 MB
// request limit) and for data-URL downloads. Diagrams/screenshots re-encode to
// JPEG, which is far smaller than the source PNGs at reading sizes.
const IMG_MAX_DIM = 1600;
const IMG_JPEG_QUALITY = 0.9;
const IMG_COMPRESS_MIN = 100 * 1024; // leave small images untouched

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

async function toImage(ref, blob, type) {
  const data = new Uint8Array(await blob.arrayBuffer());
  return { id: ref.id, filename: ref.filename, originalFilename: ref.filename, mediaType: type || "image/jpeg", data };
}

async function processImage(ref, blob, type) {
  // Leave vector/animated images and already-small images as-is.
  const canCompress =
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined" &&
    type !== "image/svg+xml" &&
    type !== "image/gif" &&
    blob.size > IMG_COMPRESS_MIN;
  if (!canCompress) return toImage(ref, blob, type);

  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, IMG_MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // JPEG has no alpha
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();
    const jpeg = await canvas.convertToBlob({ type: "image/jpeg", quality: IMG_JPEG_QUALITY });
    if (jpeg.size && jpeg.size < blob.size) {
      const filename = ref.filename.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
      const data = new Uint8Array(await jpeg.arrayBuffer());
      return { id: ref.id, filename, originalFilename: ref.filename, mediaType: "image/jpeg", data };
    }
  } catch (_) {
    /* fall back to the original image */
  }
  return toImage(ref, blob, type);
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
        const blob = await res.blob();
        if (blob.size === 0 || blob.size > 20 * 1024 * 1024) return; // skip empty / absurd
        const img = await processImage(ref, blob, type);
        if (img.data.byteLength > 0 && img.data.byteLength <= 10 * 1024 * 1024) images.push(img);
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
  if (!HAS_DOWNLOADS) throw new Error(t("errDownloadUnsupported"));
  const dataUrl = await blobToDataURL(blob);
  await chrome.downloads.download({ url: dataUrl, filename, saveAs: false });
  return t("statusDownloaded", [filename]);
}

async function deliverRelay(blob, filename, settings) {
  if (!settings.relayUrl) throw new Error(t("errNoRelayUrl"));
  if (!settings.kindleEmail) throw new Error(t("errNoKindle"));
  const dataUrl = await blobToDataURL(blob); // data:...;base64,XXXX
  const base64 = String(dataUrl).split(",")[1] || "";
  const res = await fetch(settings.relayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: settings.kindleEmail,
      filename,
      epubBase64: base64,
      token: settings.relayToken || undefined,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Relay: ${res.status} ${text.slice(0, 200)}`);
  return t("statusSent", [settings.kindleEmail]);
}

async function clip(tabId) {
  const settings = await getSettings();

  const article = await extractFromTab(tabId);
  if (!article || article.error) throw new Error(article ? article.error : t("errExtractEmpty"));

  const images = await fetchImages(article.imageRefs || []);

  // Images that were re-encoded changed extension; update the content references.
  let contentXhtml = article.contentXhtml;
  for (const img of images) {
    if (img.originalFilename && img.originalFilename !== img.filename) {
      contentXhtml = contentXhtml.split(img.originalFilename).join(img.filename);
    }
  }

  const blob = await buildEpub({ ...article, contentXhtml, images });
  const filename = slugifyFilename(article.title);

  if (settings.mode === "relay") return deliverRelay(blob, filename, settings);
  return deliverDownload(blob, filename);
}

// --- Popup entry point ---
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "ATK_CLIP" && msg.tabId != null) {
    clip(msg.tabId)
      .then((status) => sendResponse({ ok: true, status }))
      .catch((e) => sendResponse({ ok: false, error: String(e && e.message ? e.message : e) }));
    return true; // async
  }
});

// --- Install: onboarding + optional context menu (guarded for Safari/iOS) ---
chrome.runtime.onInstalled.addListener((details) => {
  if (chrome.contextMenus && chrome.contextMenus.create) {
    try {
      chrome.contextMenus.create({
        id: "atk-send-page",
        title: t("ctxSend"),
        contexts: ["page", "selection"],
      });
    } catch (_) {
      /* contextMenus unavailable on this platform */
    }
  }
  if (details && details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome/welcome.html") });
  }
});

function setBadgeSafe(text, color, tabId) {
  try {
    if (chrome.action && chrome.action.setBadgeText) {
      if (color && chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({ color, tabId });
      }
      chrome.action.setBadgeText({ text, tabId });
    }
  } catch (_) {
    /* badges unsupported (e.g. iOS) */
  }
}

async function clipWithBadge(tabId) {
  try {
    setBadgeSafe("…", null, tabId);
    const status = await clip(tabId);
    setBadgeSafe("✓", "#059669", tabId);
    return status;
  } catch (e) {
    setBadgeSafe("!", "#dc2626", tabId);
    throw e;
  } finally {
    setTimeout(() => setBadgeSafe("", null, tabId), 4000);
  }
}

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "atk-send-page" && tab && tab.id != null) {
      clipWithBadge(tab.id).catch((e) => console.warn("ATK:", e.message || e));
    }
  });
}
