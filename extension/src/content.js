// Injected into the active tab on demand. Extracts the readable article with
// Mozilla Readability, sanitizes it to XHTML, and lists the images to embed.
// Runs entirely in the page — no network calls happen here.

import { Readability } from "@mozilla/readability";

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
      // strip disallowed / event-handler attributes
      for (const attr of Array.from(node.attributes)) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name) || name.startsWith("on")) {
          node.removeAttribute(attr.name);
        }
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
          toRemove.push(node); // data:/blob:/relative we can't fetch reliably
        }
      }
    }
    node = walker.nextNode();
  }
  // unwrap removed elements (keep their text where sensible; drop media)
  for (const el of toRemove) {
    if (["img", "pre", "code"].includes(el.tagName.toLowerCase())) el.remove();
    else if (el.parentNode) el.replaceWith(...el.childNodes);
  }
}

function extract() {
  const docClone = document.cloneNode(true);
  const reader = new Readability(docClone, { charThreshold: 300 });
  const parsed = reader.parse();
  if (!parsed || !parsed.content) {
    return { error: chrome.i18n.getMessage("errExtractEmpty") };
  }

  // Parse Readability's HTML into a DOM we can walk & serialize as XHTML.
  const doc = new DOMParser().parseFromString(
    `<div id="atk-root">${parsed.content}</div>`,
    "text/html"
  );
  const rootEl = doc.getElementById("atk-root");
  const imageRefs = [];
  sanitize(rootEl, imageRefs);

  const contentXhtml = new XMLSerializer().serializeToString(rootEl);

  return {
    title: parsed.title || document.title || "Article",
    byline: parsed.byline || "",
    url: location.href,
    lang: document.documentElement.getAttribute("lang") || "en",
    contentXhtml,
    imageRefs,
  };
}

if (!window.__ATK_LOADED) {
  window.__ATK_LOADED = true;
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "ATK_EXTRACT") {
      try {
        sendResponse(extract());
      } catch (e) {
        sendResponse({ error: String(e && e.message ? e.message : e) });
      }
      return true;
    }
  });
}
