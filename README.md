# Article â Kindle

A free, open-source way to send the web article you're reading straight to your
Kindle as a clean **EPUB** â a self-hosted alternative to paid "send to Kindle"
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
  1. Readability  â extract the article        (local)
  2. fetch images â embed them                 (local)
  3. build EPUB   â a .epub file               (local)
  4. deliver:
       â¢ Download the .epub  (default, zero config), OR
       â¢ POST to YOUR Netlify relay â SMTP email to your Kindle
```

Browsers cannot speak SMTP, so the *only* part that needs a server is emailing.
Everything else is local. If you don't want a server, use download mode and drop
the file in via Amazon's own "Send to Kindle", or keep it in any EPUB reader.

## Install the extension (developer / unpacked)

```bash
npm install
npm run build      # outputs extension/dist/
```

Then in Chrome: `chrome://extensions` â enable **Developer mode** â
**Load unpacked** â select the `extension/` folder.

Click the toolbar icon, pick a mode in **RÃ©glages**, and hit
**Envoyer vers le Kindle**.

## Optional: the email relay (Netlify)

The relay lets the extension email the EPUB to your Kindle in one click. You
deploy **your own** copy so the email is sent from **your** mailbox â required
because Amazon only accepts documents from addresses on your
*Approved Personal Document E-mail List*.

1. Deploy the `server/` folder to Netlify (drag-and-drop, or connect the repo).
2. In Netlify â *Environment variables*, set the values from
   [`server/.env.example`](server/.env.example) (SMTP host, user, app passwordâ¦).
   For Gmail, create an **App Password** â never use your real password.
3. In Amazon â *Manage Your Content and Devices* â *Preferences* â
   *Personal Document Settings*: add your `SMTP_FROM` address to the approved
   list, and copy your device's `@kindle.com` address.
4. In the extension settings, choose **Envoyer par email**, paste your Kindle
   address and your relay URL
   (`https://<your-site>.netlify.app/.netlify/functions/send`).

The relay is stateless â it forwards the attachment and forgets it. Set
`RELAY_TOKEN` to stop others using your endpoint.

## Roadmap

- [ ] Toolbar icons
- [ ] Right-click context-menu action
- [x] Safari & iOS app (Web Extension, macOS + iOS) â `safari/`
- [ ] Per-site extraction tweaks / paywalled-content handling
- [ ] Cover image + multi-article "issues"

## Safari & iOS

The `safari/` folder holds an Xcode project generated from the extension with
`xcrun safari-web-extension-converter` (regenerate after extension changes).
It bundles the same code for **macOS and iOS** Safari.

- **Build/run:** open `safari/Article to Kindle/Article to Kindle.xcodeproj` in
  Xcode, pick the *(macOS)* or *(iOS)* scheme, set your signing team, Run.
- **Enable in Safari (macOS):** Safari → Settings → Extensions, tick *Article to
  Kindle*. For an unsigned dev build, first enable *Develop → Allow Unsigned
  Extensions*.
- **iOS:** run on a device/simulator, then Settings → Apps → Safari →
  Extensions → enable it.
- **Delivery on Safari/iOS:** the `downloads` API is unavailable, so use the
  **email relay** mode — the extension falls back to it automatically when a
  relay URL is set. Right-click *(contextMenus)* is macOS-only.

## Development

```bash
npm run watch      # rebuild extension/dist on change
```

Source lives in `extension/src/` (bundled by esbuild into `extension/dist/`).
The EPUB builder is `extension/src/lib/epub.js` and is dependency-free apart
from JSZip.

## License

MIT â see [LICENSE](LICENSE).
