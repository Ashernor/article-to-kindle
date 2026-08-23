# Article → Kindle

A free, open-source way to send the web article you're reading straight to your
Kindle as a clean **EPUB** — a self-hosted alternative to paid "send to Kindle"
services.

- **Local-first.** The article is extracted and converted to EPUB entirely in
  your browser. In *download* mode nothing ever touches a server.
- **Clean reading.** Uses Mozilla Readability (the engine behind Firefox Reader
  View) to strip nav, ads and clutter, then embeds the images.
- **EPUB, not PDF.** Kindles reflow EPUB properly; PDFs read badly on e-ink.
- **Optional one-click email.** Deploy a tiny relay to your own Netlify account
  and the extension will email the EPUB to your `@kindle.com` address.

## How it works

```
Browser extension (Chrome/Edge/Brave, Manifest V3)
  1. Readability  → extract the article        (local)
  2. fetch images → embed them                 (local)
  3. build EPUB   → a .epub file               (local)
  4. deliver:
       • Download the .epub  (default, zero config), OR
       • POST to YOUR Netlify relay → SMTP email to your Kindle
```

Browsers cannot speak SMTP, so the *only* part that needs a server is emailing.
Everything else is local. If you don't want a server, use download mode and drop
the file in via Amazon's own "Send to Kindle", or keep it in any EPUB reader.

## Install the extension (developer / unpacked)

```bash
npm install
npm run build      # outputs extension/dist/
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select the `extension/` folder.

Click the toolbar icon, pick a mode in **Réglages**, and hit
**Envoyer vers le Kindle**.

## Optional: the email relay (Netlify)

The relay lets the extension email the EPUB to your Kindle in one click. You
deploy **your own** copy so the email is sent from **your** mailbox — required
because Amazon only accepts documents from addresses on your
*Approved Personal Document E-mail List*.

1. Deploy the `server/` folder to Netlify (drag-and-drop, or connect the repo).
2. In Netlify → *Environment variables*, set the values from
   [`server/.env.example`](server/.env.example) (SMTP host, user, app password…).
   For Gmail, create an **App Password** — never use your real password.
3. In Amazon → *Manage Your Content and Devices* → *Preferences* →
   *Personal Document Settings*: add your `SMTP_FROM` address to the approved
   list, and copy your device's `@kindle.com` address.
4. In the extension settings, choose **Envoyer par email**, paste your Kindle
   address and your relay URL
   (`https://<your-site>.netlify.app/.netlify/functions/send`).

The relay is stateless — it forwards the attachment and forgets it. Set
`RELAY_TOKEN` to stop others using your endpoint.

## Roadmap

- [ ] Toolbar icons
- [ ] Right-click context-menu action
- [ ] Safari port (`xcrun safari-web-extension-converter`)
- [ ] Per-site extraction tweaks / paywalled-content handling
- [ ] Cover image + multi-article "issues"

## Development

```bash
npm run watch      # rebuild extension/dist on change
```

Source lives in `extension/src/` (bundled by esbuild into `extension/dist/`).
The EPUB builder is `extension/src/lib/epub.js` and is dependency-free apart
from JSZip.

## License

MIT — see [LICENSE](LICENSE).
