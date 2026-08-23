# App Store submission guide — Article → Kindle

Model: **Free app + optional in-app tip (IAP) + web donations.**
Everything below is copy-paste ready. Items marked ⚙️ require your Apple
Developer account (they can't be done from source).

## 0. Prerequisites ⚙️
- Apple Developer Program membership ($99/year).
- In Xcode → Signing & Capabilities, set your **Team** on all 4 targets
  (iOS/macOS × App/Extension) and unique bundle IDs:
  - App: `app.articletokindle`
  - Extension: `app.articletokindle.Extension`
- Enroll in the **App Store Small Business Program** (15% instead of 30%).

## 1. App metadata (App Store Connect)

- **Name:** `Article to Kindle`
- **Subtitle (≤30):** `Save web articles to Kindle`
- **Category:** Primary *Productivity*, Secondary *Utilities*
- **Price:** Free
- **Promotional text (≤170):**
  > Turn any web article into a clean EPUB and send it straight to your Kindle. Private, open-source, no account.
- **Keywords (≤100, comma-sep):**
  `kindle,epub,read later,article,reader,save to kindle,safari extension,readability,web to epub,offline`
- **Description:**
  > Article to Kindle turns the web page you're reading into a clean EPUB and sends it to your Kindle — the way e-ink is meant to be read (EPUB reflows; PDFs don't).
  >
  > • One tap from Safari to your Kindle.
  > • Clean reading: strips nav, ads and clutter, keeps the text and images.
  > • Private by design: the article is converted on your device. Email delivery uses a relay YOU host, through YOUR mailbox — nothing goes to us.
  > • Free and open-source (MIT). Build it yourself, or support development with an optional tip.
  >
  > Email delivery requires a one-time setup of a free personal relay (see the project page) and adding your sender address to Amazon's Approved Personal Document list.
- **Support URL:** `https://github.com/Ashernor/article-to-kindle`
- **Marketing URL:** `https://article-to-kindle.netlify.app`
- **Privacy Policy URL:** `https://article-to-kindle.netlify.app/privacy.html`
- **Age rating:** 4+

## 2. App Privacy ("nutrition label")
Answer: **Data Not Collected** (no data is collected). No tracking.

## 3. Export compliance
Add to BOTH app targets' Info.plist:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```
(The app only uses standard HTTPS — exempt.)

## 4. In-app tips (IAP) ⚙️
Create 3 **Consumable** products in App Store Connect:
| Reference name | Product ID | Price |
|---|---|---|
| Small tip | `app.articletokindle.tip.small` | Tier 1 (~0.99) |
| Medium tip | `app.articletokindle.tip.medium` | ~2.99 |
| Large tip | `app.articletokindle.tip.large` | ~4.99 |
Implementation: see [`IAP_TIP_JAR.md`](IAP_TIP_JAR.md) (StoreKit 2).

## 5. Screenshots ⚙️
Required sizes (App Store Connect will tell you the exact set):
- iPhone 6.9" (1320×2868) and 6.5"; iPad 13" if you ship iPad.
- macOS: 1280×800 or 2560×1600.
Capture from the iOS Simulator (⌘S) showing: (1) the article, (2) the extension
popup, (3) "Sent to your Kindle" confirmation, (4) the onboarding screen.

## 6. Build & upload ⚙️
1. Xcode → select **Any iOS Device (arm64)** → Product → **Archive**.
2. Organizer → **Distribute App** → App Store Connect → Upload.
3. Repeat with the macOS scheme (Mac App Store) if shipping macOS.
4. In App Store Connect, attach the build, fill metadata, submit for review.

## 7. Review notes (paste into "Notes for Review")
> This is a Safari Web Extension. To test email delivery the reviewer needs a
> personal relay + Kindle address, which requires external setup. The core
> feature (extract article → build EPUB → Download) works with no configuration
> and no account. Everything runs locally; no backend receives user data.

## 8. Notes
- The App Store **app icon** is the opaque amber icon in the asset catalog
  (`docs/appstore-icon-1024.png`) — not the transparent toolbar icon.
- Regenerate the Safari project after any `extension/` change:
  `rm -rf safari && xcrun safari-web-extension-converter extension --project-location safari --app-name "Article to Kindle" --bundle-identifier app.articletokindle --swift --no-open --force --copy-resources`
