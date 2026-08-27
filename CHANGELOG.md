# Changelog

All notable changes to **Article to Kindle**. Loosely follows
[Keep a Changelog](https://keepachangelog.com) and [SemVer](https://semver.org).

> The browser extension and the App Store apps are versioned independently:
> the extension has its own version (currently **0.2.1**), while the iOS/macOS
> apps use their App Store marketing version (**1.0**, **1.0.1**, …).

## [1.0.1] — Unreleased (iOS / macOS update)

### Fixed
- **The delivery mode you pick is now always respected.** Previously, choosing
  "Download" on Safari (where the browser download API isn't available) while a
  relay was configured could silently send the article by email instead. Your
  explicit choice now wins.
- **Full-width popup on iPhone** — it used to render as a narrow column with
  empty space on the right.
- On Safari, the **"Download" mode is clearly marked as unavailable** and the
  extension defaults to email, so you can't get stuck on a mode that can't work.

### Added
- A proper **in-app home screen**: what the app does, how to enable the
  extension, how to use it, delivery-settings guidance, and an **About** section
  (source code, GitHub Sponsors, Ko-fi, privacy) with links that open in the
  browser.
- App content now respects the **safe area** (Dynamic Island / notch / home
  indicator) and scrolls on iPhone.

### Changed
- **Renamed to "Article to Kindle"** (dropped the `→` from the name) so it's
  found when searching the stores. The `→` wordmark stays as the visual logo.
- Extension internal version bumped to **0.2.1**.

## [1.0] — Initial release

### Added
- Send the web article you're reading to your Kindle as a clean **EPUB**.
- On-device article extraction (Mozilla Readability) and EPUB building (JSZip).
- Two delivery modes: **download** the EPUB, or **email** it to your Kindle via
  a relay you self-host.
- Right-click / context-menu **"Send to Kindle"** (macOS).
- Onboarding page, persistent settings, **English / French** localization.
- **Safari Web Extension** app for macOS and iOS, plus a **Chrome/Edge/Brave**
  build.
- **Private by design**: the article is converted on your device; nothing is
  sent to the developer; no accounts, no tracking, no data collection.
