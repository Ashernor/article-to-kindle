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
  and the extension emails the EPUB to your `@kindle.com` address.
- **Chrome, Edge, Brave — and Safari (macOS + iOS).**
- **Localized** (English / French, follows your browser language).

## How it works

```
Browser extension (Manifest V3)
  1. Readability  → extract the article        (local)
  2. fetch images → embed them                 (local)
  3. build EPUB   → a .epub file               (local)
  4. deliver:
       • Download the .epub  (default, zero config), OR
       • POST to YOUR Netlify relay → SMTP email to your Kindle
```

Browsers cannot speak SMTP, so the *only* part that needs a server is emailing.
Everything else is local. On Safari/iOS the download API is unavailable, so the
email relay is used automatically when a relay URL is set.

## Install the extension (Chrome / Edge / Brave)

```bash
npm install
npm run build      # outputs extension/dist/
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select the `extension/` folder.

Click the toolbar icon, pick a mode in **Settings**, and hit **Send to Kindle**.

## Optional: the email relay (Netlify)

The relay lets the extension email the EPUB to your Kindle in one click. You
deploy **your own** copy so the email is sent from **your** mailbox — required
because Amazon only accepts documents from addresses on your
*Approved Personal Document E-mail List*.

1. Deploy the `server/` folder to Netlify (drag-and-drop, or connect the repo
   with **base directory = `server`**).
2. In Netlify → *Environment variables*, set the values from
   [`server/.env.example`](server/.env.example) (SMTP host, user, app password…),
   scoped to **Functions**. For Gmail/Fastmail, create an **App Password** —
   never use your real password. **Redeploy** after changing variables.
3. In Amazon → *Manage Your Content and Devices* → *Preferences* →
   *Personal Document Settings*: add your `SMTP_FROM` address to the approved
   list, and copy your device's `@kindle.com` address.
4. In the extension settings, choose **Send by email**, paste your Kindle
   address and your relay URL
   (`https://<your-site>.netlify.app/.netlify/functions/send`).

The relay is stateless — it forwards the attachment and forgets it. Set
`RELAY_TOKEN` to stop others using your endpoint.

## Safari & iOS

The `safari/` folder holds an Xcode project generated from the extension with
`xcrun safari-web-extension-converter` (regenerate after extension changes). It
bundles the same code for **macOS and iOS** Safari.

- **Build/run:** open `safari/Article to Kindle/Article to Kindle.xcodeproj` in
  Xcode, pick the *(macOS)* or *(iOS)* scheme, set your signing team, Run.
- **Enable in Safari (macOS):** Safari → Settings → Extensions. For an unsigned
  dev build, first enable *Develop → Allow Unsigned Extensions*.
- **iOS:** run on a device/simulator, then Settings → Apps → Safari →
  Extensions → enable it.
- **Delivery on Safari/iOS:** use the **email relay** mode — the extension falls
  back to it automatically when a relay URL is set. Right-click (context menu) is
  macOS-only.

## Support the project 💛

Article → Kindle is free and open-source. If it saves you the price of a paid
service, you can support development:

- **GitHub Sponsors:** https://github.com/sponsors/Ashernor
- **Ko-fi (one-off tip):** https://ko-fi.com/ashernor
- **In the iOS/macOS app:** an optional in-app tip jar.

## Roadmap

- [x] Chrome / Edge / Brave extension
- [x] Right-click context menu
- [x] Onboarding page + persistent settings
- [x] English / French localization
- [x] Safari & iOS app (Web Extension, macOS + iOS) — `safari/`
- [ ] App Store release
- [ ] Per-site extraction tweaks / paywalled-content handling
- [ ] Cover image + multi-article "issues"

## Development

```bash
npm run watch      # rebuild extension/dist on change
```

Source lives in `extension/src/` (bundled by esbuild into `extension/dist/`).
The EPUB builder is `extension/src/lib/epub.js` and is dependency-free apart
from JSZip. UI strings live in `extension/_locales/`.

## License

MIT — see [LICENSE](LICENSE).
