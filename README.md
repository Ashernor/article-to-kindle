# Article → Kindle

A free, open-source way to send the web article you're reading straight to your
Kindle as a clean **EPUB**, a self-hosted alternative to other « send to Kindle » services.

- **Local-first.** The article is extracted and converted to EPUB entirely in
  your browser. In *download* mode nothing ever touches a server.
- **Clean reading.** Uses Mozilla Readability (the engine behind Firefox Reader
  View) to strip nav, ads and clutter, then embeds the images.
- **EPUB, not PDF.** Kindles reflow EPUB properly; PDFs read badly on e-ink.
- **Optional one-click email.** Deploy a tiny relay to your own Netlify account
  and the extension emails the EPUB to your `@kindle.com` address.
- **Browsers extensions** for Chromium browsers (Chrome, Edge, Brave) and Safari (macOS + iOS).

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
Everything else is local. On Safari/iOS the download API is unavailable, so the email relay is used automatically when a relay URL is set.

## Install the extension (Chrome / Edge / Brave)

```bash
npm install
npm run build      # outputs extension/dist/
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select the `extension/` folder.

Click the toolbar icon, pick a mode in **Settings**, and hit **Send to Kindle**.

## Email delivery — send straight to your Kindle (optional)

Download mode needs no setup. **Email mode** gives you one-click send to your
Kindle. It takes two one-time things — a tiny relay you host for free, and
approving your sender address on Amazon — about 10 minutes total.

> **Why a relay?** Browsers can't speak SMTP, so they can't send email. The
> relay is a stateless function that forwards the EPUB through **your** mailbox
> to **your** `@kindle.com` address. It stores nothing, and nothing ever reaches
> the developer. (A full walkthrough is also on the
> [website](https://article-to-kindle.netlify.app/setup.html).)

### 1. Deploy your own relay on Netlify (free)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Ashernor/article-to-kindle)

The button deploys this repo (it reads the root `netlify.toml`, base directory
`server`). Or do it manually: sign in at
[app.netlify.com](https://app.netlify.com), then drag the `server/` folder onto
the **Deploys** area, or connect the Git repo with **Base directory = `server`**.

### 2. Get an email app password

You need SMTP credentials for your mailbox — always an **app password**, never
your login password:

| Provider | SMTP host / port | Where to get an app password |
|---|---|---|
| Gmail | `smtp.gmail.com` / `465` | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (2FA required) |
| Fastmail | `smtp.fastmail.com` / `465` | Settings → Privacy & Security → **App Passwords** → new, access **IMAP/SMTP** |
| iCloud+ | `smtp.mail.me.com` / `587` | [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords |
| Other | your provider's SMTP | your provider's app-password page |

### 3. Set the environment variables on Netlify

Site configuration → **Environment variables** → add these (scope: **Functions**):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@example.com
SMTP_PASS=your_app_password
SMTP_FROM=you@example.com
RELAY_TOKEN=a-long-random-string
```

`RELAY_TOKEN` is optional but **recommended** — it stops anyone else using your
public endpoint. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Then **Deploys → Trigger deploy** (env-var changes only apply on a new deploy).
Check it's live: opening `https://<your-site>.netlify.app/.netlify/functions/send`
in a browser should show **"Method not allowed"** (not a 404).

### 4. Approve your sender on Amazon (the step people forget)

Amazon **silently drops** documents from addresses you haven't approved.

1. Open **Manage Your Content and Devices → Preferences → Personal Document
   Settings** (use your country's Amazon):
   [.com](https://www.amazon.com/hz/mycd/digital-console/alldevices) ·
   [.co.uk](https://www.amazon.co.uk/hz/mycd/digital-console/alldevices) ·
   [.fr](https://www.amazon.fr/hz/mycd/digital-console/alldevices) ·
   [.de](https://www.amazon.de/hz/mycd/digital-console/alldevices) ·
   [.ca](https://www.amazon.ca/hz/mycd/digital-console/alldevices)
2. Under **Approved Personal Document E-mail List** → **Add a new approved
   e-mail address** → enter your `SMTP_FROM` address → **Add**.
3. On the same page, under **Send-to-Kindle E-Mail Settings**, copy your
   device's **`…@kindle.com`** address.

### 5. Configure the extension

Extension → **Settings** → **Send by email**, then fill:

- **Kindle address** — the `…@kindle.com` from step 4.3
- **Relay URL** — `https://<your-site>.netlify.app/.netlify/functions/send`
- **Relay token** — the `RELAY_TOKEN` from step 3 (if you set one)

Save, open an article, hit **Send to Kindle** — it arrives in a few minutes.

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Relay: 404` | Wrong relay URL — it must end with `/.netlify/functions/send` |
| `Relay: 401` | Token mismatch — the extension's token must equal `RELAY_TOKEN` |
| `Relay error: Invalid login` (500) | Wrong `SMTP_USER`/`SMTP_PASS` — use an **app password** |
| `ECONNREFUSED 127.0.0.1` | `SMTP_HOST` not set, or you didn't redeploy after adding env vars |
| Sent OK but nothing on the Kindle | Sender not on Amazon's approved list, or wrong `@kindle.com` address |

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
- [ ] Localization
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
