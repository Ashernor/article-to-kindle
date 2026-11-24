// Runs inside a hidden WKWebView loaded on the article URL (iOS/macOS Share
// Extension). Reuses Mozilla Readability + the EPUB builder, fetches & compresses
// images, and emails the EPUB through the user's relay.
// Exposes window.__ATK_run(settings) -> Promise<{ok, message|error, title}>.
import { Readability } from "@mozilla/readability";
import { buildEpub, slugifyFilename } from "./lib/epub.js";

const ALLOWED_TAGS = new Set([
  "p","br","hr","h1","h2","h3","h4","h5","h6","blockquote","pre","code",
  "ul","ol","li","dl","dt","dd","a","em","strong","b","i","u","s","sub","sup",
  "img","figure","figcaption","table","thead","tbody","tfoot","tr","td","th",
  "span","div","section","article","small","mark","time","abbr","cite","q",
]);
const ALLOWED_ATTRS = new Set(["href", "src", "alt", "title", "colspan", "rowspan"]);

function extFromUrl(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    const m = path.match(/\.(jpe?g|png|gif|webp|svg)$/);
    if (m) return m[1] === "jpeg" ? "jpg" : m[1];
  } catch (_) {}
  return "jpg";
}

function sanitize(root, imageRefs) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  const toRemove = [];
  let node = walker.currentNode;
  while (node) {
    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      toRemove.push(node);
    } else {
      for (const attr of Array.from(node.attributes)) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name) || name.startsWith("on")) node.removeAttribute(attr.name);
      }
      if (tag === "img") {
        const abs = node.currentSrc || node.src || node.getAttribute("src") || "";
        if (abs && /^https?:/i.test(abs)) {
          let ref = imageRefs.find((r) => r.url === abs);
          if (!ref) {
            const id = `img${imageRefs.length + 1}`;
            ref = { id, url: abs, filename: `images/${id}.${extFromUrl(abs)}` };
            imageRefs.push(ref);
          }
          node.setAttribute("src", ref.filename);
        } else {
          toRemove.push(node);
        }
      }
    }
    node = walker.nextNode();
  }
  for (const el of toRemove) {
    if (["img", "pre", "code"].includes(el.tagName.toLowerCase())) el.remove();
    else if (el.parentNode) el.replaceWith(...el.childNodes);
  }
}

function extract() {
  const docClone = document.cloneNode(true);
  const parsed = new Readability(docClone, { charThreshold: 300 }).parse();
  if (!parsed || !parsed.content) return { error: "Could not extract a readable article from this page." };
  const doc = new DOMParser().parseFromString(`<div id="atk-root">${parsed.content}</div>`, "text/html");
  const rootEl = doc.getElementById("atk-root");
  const imageRefs = [];
  sanitize(rootEl, imageRefs);
  return {
    title: parsed.title || document.title || "Article",
    byline: parsed.byline || "",
    url: location.href,
    lang: document.documentElement.getAttribute("lang") || "en",
    contentXhtml: new XMLSerializer().serializeToString(rootEl),
    imageRefs,
  };
}

// --- image fetch + compression (2D canvas, WKWebView-compatible) ---
const IMG_MAX_DIM = 1600, IMG_JPEG_QUALITY = 0.9, IMG_COMPRESS_MIN = 100 * 1024;
function canvasToBlob(canvas, type, q) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, q));
}
async function compress(ref, blob, type) {
  const original = async () => ({
    id: ref.id, filename: ref.filename, originalFilename: ref.filename,
    mediaType: type || "image/jpeg", data: new Uint8Array(await blob.arrayBuffer()),
  });
  if (type === "image/svg+xml" || type === "image/gif" || blob.size <= IMG_COMPRESS_MIN ||
      typeof createImageBitmap === "undefined") return original();
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, IMG_MAX_DIM / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const jpeg = await canvasToBlob(canvas, "image/jpeg", IMG_JPEG_QUALITY);
    if (jpeg && jpeg.size && jpeg.size < blob.size) {
      return {
        id: ref.id, filename: ref.filename.replace(/\.[a-z0-9]+$/i, "") + ".jpg",
        originalFilename: ref.filename, mediaType: "image/jpeg", data: new Uint8Array(await jpeg.arrayBuffer()),
      };
    }
  } catch (_) {}
  return original();
}

async function fetchImages(refs) {
  const images = [];
  await Promise.all(refs.map(async (ref) => {
    try {
      const res = await fetch(ref.url);
      if (!res.ok) return;
      const type = (res.headers.get("content-type") || "").split(";")[0].trim();
      if (type && !type.startsWith("image/")) return;
      const blob = await res.blob();
      if (blob.size === 0 || blob.size > 20 * 1024 * 1024) return;
      const img = await compress(ref, blob, type);
      if (img.data.byteLength > 0 && img.data.byteLength <= 10 * 1024 * 1024) images.push(img);
    } catch (_) {}
  }));
  return images;
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function run(settings) {
  settings = settings || {};
  const article = extract();
  if (!article || article.error) return { ok: false, error: (article && article.error) || "No article found." };
  const images = await fetchImages(article.imageRefs || []);
  let content = article.contentXhtml;
  const includedIds = new Set(images.map((im) => im.id));
  // rewrite filenames for images we recompressed (e.g. .png -> .jpg)
  for (const im of images) {
    if (im.originalFilename && im.originalFilename !== im.filename) {
      content = content.split(im.originalFilename).join(im.filename);
    }
  }
  // drop <img> tags for images we could not fetch/embed (e.g. cross-origin
  // CDN images blocked by CORS in the WebView) so the EPUB stays valid.
  for (const ref of article.imageRefs || []) {
    if (!includedIds.has(ref.id) && ref.filename) {
      const esc = ref.filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      content = content.replace(new RegExp("<img\\b[^>]*" + esc + "[^>]*>", "gi"), "");
    }
  }
  const blob = await buildEpub({ ...article, contentXhtml: content, images });
  const filename = slugifyFilename(article.title);
  if (!settings.relayUrl) return { ok: false, error: "No relay URL set — configure email delivery in the app first." };
  if (!settings.kindleEmail) return { ok: false, error: "No Kindle address set — configure it in the app first." };
  const dataUrl = await blobToDataURL(blob);
  const base64 = String(dataUrl).split(",")[1] || "";
  try {
    const res = await fetch(settings.relayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: settings.kindleEmail, filename, epubBase64: base64, token: settings.relayToken || undefined }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `Relay ${res.status}: ${text.slice(0, 120)}` };
    return { ok: true, message: `Sent “${article.title}” to ${settings.kindleEmail}`, title: article.title };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

window.__ATK_run = run;
