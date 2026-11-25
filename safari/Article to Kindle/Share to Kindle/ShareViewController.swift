//
//  ShareViewController.swift
//  Share to Kindle
//
//  Receives a shared web page, extracts + builds the EPUB in a hidden
//  WKWebView (via share.js), and POSTs it to the user's relay.
//

import UIKit
import WebKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController, WKNavigationDelegate {

    private let appGroup = "group.app.articletokindle"

    private var webView: WKWebView?
    private var didRun = false

    // MARK: UI
    private let card = UIView()
    private let spinner = UIActivityIndicatorView(style: .large)
    private let icon = UILabel()
    private let title_ = UILabel()
    private let status = UILabel()
    private let doneButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
        loadSharedURL()
    }

    // MARK: - Settings (shared with the app via App Group)

    private struct Settings { var relayUrl = ""; var kindleEmail = ""; var relayToken = "" }

    private func readSettings() -> Settings {
        let d = UserDefaults(suiteName: appGroup)
        var s = Settings()
        s.relayUrl = d?.string(forKey: "relayUrl") ?? ""
        s.kindleEmail = d?.string(forKey: "kindleEmail") ?? ""
        s.relayToken = d?.string(forKey: "relayToken") ?? ""
        return s
    }

    // MARK: - Input URL

    private func loadSharedURL() {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let providers = items.flatMap { $0.attachments ?? [] }
        guard !providers.isEmpty else { fail("Nothing to share."); return }

        let urlType = UTType.url.identifier
        // Preferred: a proper web URL attachment (Safari and most browsers).
        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(urlType) }) {
            p.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] (data, _) in
                DispatchQueue.main.async {
                    if let url = data as? URL, url.scheme?.hasPrefix("http") == true {
                        self?.start(url: url)
                    } else {
                        self?.tryText(providers)   // some apps hand us a URL-less item
                    }
                }
            }
            return
        }
        // Fallback: a text item that contains a link (e.g. "Title — https://…"),
        // which is how some native news apps share an article.
        tryText(providers)
    }

    private func tryText(_ providers: [NSItemProvider]) {
        let textType = UTType.plainText.identifier
        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(textType) }) {
            p.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] (data, _) in
                DispatchQueue.main.async {
                    if let text = data as? String, let url = ShareViewController.firstLink(in: text) {
                        self?.start(url: url)
                    } else {
                        self?.fail("No web link found in what you shared. Open the article in a browser and share it from there.")
                    }
                }
            }
            return
        }
        fail("Share a web page to send it to your Kindle.")
    }

    private static func firstLink(in text: String) -> URL? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        for m in detector.matches(in: text, options: [], range: range) {
            if let u = m.url, let s = u.scheme?.lowercased(), s == "http" || s == "https" { return u }
        }
        return nil
    }

    // MARK: - Pipeline

    private func start(url: URL) {
        let s = readSettings()
        guard !s.relayUrl.isEmpty, !s.kindleEmail.isEmpty else {
            fail("Open the Article to Kindle app first and set your Kindle address and relay.")
            return
        }
        status.text = "Reading \(url.host ?? "page")…"

        guard let jsURL = Bundle.main.url(forResource: "share", withExtension: "js"),
              let js = try? String(contentsOf: jsURL, encoding: .utf8) else {
            fail("Internal error: missing script.")
            return
        }

        // Speed up loading image-heavy pages: stop the WebView from downloading
        // images/media/fonts just to render them. We only need the DOM for
        // extraction; share.js re-fetches the images it embeds via fetch(),
        // which is classified as "raw" and is not matched by this rule.
        let blockRules = """
        [{"trigger":{"url-filter":".*","resource-type":["image","media","font"]},"action":{"type":"block"}}]
        """
        WKContentRuleListStore.default()?.compileContentRuleList(
            forIdentifier: "atk-block-media", encodedContentRuleList: blockRules
        ) { [weak self] ruleList, _ in
            self?.launch(url: url, js: js, ruleList: ruleList)
        }
    }

    private func launch(url: URL, js: String, ruleList: WKContentRuleList?) {
        let config = WKWebViewConfiguration()
        let userScript = WKUserScript(source: js, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        config.userContentController.addUserScript(userScript)
        if let ruleList = ruleList { config.userContentController.add(ruleList) }

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.navigationDelegate = self
        wv.isHidden = true
        view.addSubview(wv)
        webView = wv
        wv.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !didRun else { return }
        didRun = true

        let s = readSettings()
        let args: [String: Any] = [
            "relayUrl": s.relayUrl,
            "kindleEmail": s.kindleEmail,
            "relayToken": s.relayToken,
        ]
        status.text = "Building your EPUB…"

        webView.callAsyncJavaScript(
            "return await window.__ATK_run(settings);",
            arguments: ["settings": args],
            in: nil,
            in: .page
        ) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let value):
                    if let dict = value as? [String: Any], let ok = dict["ok"] as? Bool {
                        if ok {
                            self?.succeed(dict["message"] as? String ?? "Sent to your Kindle.")
                        } else {
                            self?.fail(dict["error"] as? String ?? "Could not send the article.")
                        }
                    } else {
                        self?.fail("Unexpected response.")
                    }
                case .failure(let error):
                    self?.fail(error.localizedDescription)
                }
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fail("Could not load the page.")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fail("Could not load the page.")
    }

    // MARK: - Completion

    private func succeed(_ message: String) {
        spinner.stopAnimating()
        spinner.isHidden = true
        icon.text = "✓"
        icon.textColor = .systemGreen
        icon.isHidden = false
        title_.text = "Sent to your Kindle"
        status.text = message
        doneButton.setTitle("Done", for: .normal)
        doneButton.isHidden = false
        tearDownWebView()
        // Auto-dismiss, but give it long enough to be read after a slow build.
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func fail(_ message: String) {
        spinner.stopAnimating()
        icon.text = "✕"
        icon.textColor = .systemRed
        icon.isHidden = false
        status.text = message
        doneButton.isHidden = false
        tearDownWebView()
    }

    private func tearDownWebView() {
        webView?.stopLoading()
        webView?.navigationDelegate = nil
        webView?.removeFromSuperview()
        webView = nil
    }

    @objc private func close() {
        extensionContext?.completeRequest(returningItems: nil)
    }

    // MARK: - UI

    private func buildUI() {
        view.backgroundColor = UIColor.black.withAlphaComponent(0.25)

        card.backgroundColor = .secondarySystemBackground
        card.layer.cornerRadius = 16
        card.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(card)

        icon.font = .systemFont(ofSize: 34, weight: .semibold)
        icon.textAlignment = .center
        icon.isHidden = true

        spinner.startAnimating()

        title_.text = "Article to Kindle"
        title_.font = .systemFont(ofSize: 17, weight: .semibold)
        title_.textAlignment = .center

        status.text = "Preparing…"
        status.font = .systemFont(ofSize: 14)
        status.textColor = .secondaryLabel
        status.textAlignment = .center
        status.numberOfLines = 0

        doneButton.setTitle("Done", for: .normal)
        doneButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        doneButton.addTarget(self, action: #selector(close), for: .touchUpInside)
        doneButton.isHidden = true

        let stack = UIStackView(arrangedSubviews: [icon, spinner, title_, status, doneButton])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            card.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.82),
            card.widthAnchor.constraint(greaterThanOrEqualToConstant: 260),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 26),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -22),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 22),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -22),
        ])
    }
}
