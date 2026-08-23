// Minimal, dependency-light EPUB 3 builder.
// Takes cleaned article data + fetched image blobs and returns an EPUB Blob.
// Everything runs client-side — the article never leaves the machine here.

import JSZip from "jszip";

function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function uuid() {
  // RFC4122-ish, good enough for a book identifier.
  return "urn:uuid:xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const CSS = `
body { font-family: Georgia, "Times New Roman", serif; line-height: 1.5; margin: 0 5%; }
h1, h2, h3 { line-height: 1.2; }
h1 { font-size: 1.6em; margin: 1em 0 0.2em; }
.byline { color: #555; font-style: italic; margin: 0 0 0.5em; }
.source { color: #777; font-size: 0.85em; margin-bottom: 1.5em; word-break: break-all; }
img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
figure { margin: 1em 0; }
figcaption { font-size: 0.85em; color: #666; text-align: center; }
blockquote { border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em; color: #444; }
pre { white-space: pre-wrap; overflow-wrap: break-word; font-size: 0.85em; }
hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
`;

// article: { title, byline, url, lang, contentXhtml, images: [{ id, filename, mediaType, data(Uint8Array/ArrayBuffer) }] }
export async function buildEpub(article, { outputType = "blob" } = {}) {
  const zip = new JSZip();
  const bookId = uuid();
  const title = article.title || "Untitled";
  const author = article.byline || "Unknown";
  const lang = article.lang || "en";
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  // 1. mimetype — MUST be first and stored (uncompressed).
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. container
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  zip.file("OEBPS/style.css", CSS);

  // 3. chapter
  const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${xmlEscape(lang)}" lang="${xmlEscape(lang)}">
<head>
  <meta charset="utf-8"/>
  <title>${xmlEscape(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${xmlEscape(title)}</h1>
  ${author ? `<p class="byline">${xmlEscape(author)}</p>` : ""}
  ${article.url ? `<p class="source">${xmlEscape(article.url)}</p>` : ""}
  ${article.contentXhtml || "<p>(no content)</p>"}
</body>
</html>`;
  zip.file("OEBPS/chapter.xhtml", chapterXhtml);

  // 4. nav
  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${xmlEscape(lang)}">
<head><meta charset="utf-8"/><title>${xmlEscape(title)}</title></head>
<body>
  <nav epub:type="toc" id="toc"><h1>Contents</h1>
    <ol><li><a href="chapter.xhtml">${xmlEscape(title)}</a></li></ol>
  </nav>
</body>
</html>`
  );

  // 5. images
  const images = article.images || [];
  for (const img of images) {
    zip.file(`OEBPS/${img.filename}`, img.data);
  }

  // 6. manifest + spine
  const imageItems = images
    .map(
      (img) =>
        `    <item id="${xmlEscape(img.id)}" href="${xmlEscape(
          img.filename
        )}" media-type="${xmlEscape(img.mediaType)}"/>`
    )
    .join("\n");

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${xmlEscape(title)}</dc:title>
    <dc:creator>${xmlEscape(author)}</dc:creator>
    <dc:language>${xmlEscape(lang)}</dc:language>
    ${article.url ? `<dc:source>${xmlEscape(article.url)}</dc:source>` : ""}
    <meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
${imageItems}
  </manifest>
  <spine>
    <itemref idref="chapter"/>
  </spine>
</package>`
  );

  return zip.generateAsync({
    type: outputType,
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
  });
}

export function slugifyFilename(title) {
  const base =
    (title || "article")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "article";
  return `${base}.epub`;
}
