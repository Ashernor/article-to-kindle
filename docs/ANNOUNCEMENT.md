# Announcement copy (English)

## Show HN / Hacker News

**Title:** Show HN: Article to Kindle – open-source, local-first "send to Kindle" (EPUB)

**Body:**
I read a lot on my Kindle and got tired of paying a subscription just to send web
articles to it, so I built an open-source alternative.

Article to Kindle is a browser extension (Chrome/Edge/Brave + Safari on macOS &
iOS) that extracts the article you're reading with Mozilla Readability, converts
it to a clean EPUB in the browser, and gets it onto your Kindle. EPUB, not PDF,
because Kindles reflow EPUB properly.

The part I care about most is privacy: extraction and EPUB building happen
entirely on-device. There's no backend of mine involved. For one-tap email
delivery you deploy a tiny stateless relay to your own Netlify account with your
own SMTP credentials, so the mail goes out from your mailbox to your @kindle.com
address — I never see your content or your credentials.

It's MIT-licensed. You can load the unpacked extension, or build the Safari/iOS
app from the included Xcode project. Free; there's an optional tip jar if it
saves you a subscription.

Repo: https://github.com/Ashernor/article-to-kindle

Feedback welcome — especially on article extraction edge cases and paywalled
sites.

---

## Reddit (r/kindle, r/opensource, r/selfhosted)

**Title:** I built a free, open-source "send to Kindle" that converts articles to EPUB (Chrome + Safari/iOS)

**Body:**
Paid "send to Kindle" tools always bugged me, so I made an open-source one.

- Extracts the article (Readability), builds a clean **EPUB** on your device.
- **Download** mode = 100% local, no server, no account.
- Optional **one-tap email** mode via a relay you self-host on Netlify (your SMTP,
  your mailbox → your @kindle.com). I never touch your data.
- Works on Chrome/Edge/Brave and **Safari on macOS + iOS**.
- English/French UI, MIT license.

It's free; there's an optional tip jar and GitHub Sponsors if you want to chip in.

Repo + setup: https://github.com/Ashernor/article-to-kindle

Happy to answer questions about the EPUB pipeline or the self-hosted relay.

---

## Short social (X / Mastodon / LinkedIn)

Tired of paying to send articles to your Kindle? I open-sourced a tool that does
it for free.

📖 Reader-view extraction → clean EPUB (not PDF)
🔒 Converts on-device; email delivery via a relay you self-host
🧩 Chrome/Edge/Brave + Safari (macOS & iOS)
⚖️ MIT licensed

https://github.com/Ashernor/article-to-kindle

---

## One-liner (for the GitHub repo "About")

Free, open-source, local-first way to send web articles to your Kindle as clean EPUB. Chrome + Safari/iOS.
