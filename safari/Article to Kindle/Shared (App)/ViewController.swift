//
//  ViewController.swift
//  Shared (App)
//

import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "app.articletokindle.Extension"
let appGroupIdentifier = "group.app.articletokindle"
let settingsKeys = ["kindleEmail", "relayUrl", "relayToken"]

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

#if os(iOS)
        self.webView.scrollView.isScrollEnabled = true
#endif

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    // Open external http(s) links in the system browser instead of inside the app.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated,
           let url = navigationAction.request.url,
           let scheme = url.scheme?.lowercased(),
           scheme == "http" || scheme == "https" {
#if os(iOS)
            UIApplication.shared.open(url)
#elseif os(macOS)
            NSWorkspace.shared.open(url)
#endif
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let version = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? ""
        webView.evaluateJavaScript("if (window.setVersion) { setVersion('\(version)') }")

        // Pre-fill the share-sheet delivery form with saved App Group values.
        let defaults = UserDefaults(suiteName: appGroupIdentifier)
        var settings: [String: String] = [:]
        for key in settingsKeys { settings[key] = defaults?.string(forKey: key) ?? "" }
        if let data = try? JSONSerialization.data(withJSONObject: settings),
           let json = String(data: data, encoding: .utf8) {
            webView.evaluateJavaScript("if (window.loadSettings) { loadSettings(\(json)) }")
        }

#if os(iOS)
        webView.evaluateJavaScript("show('ios')")
#elseif os(macOS)
        webView.evaluateJavaScript("show('mac')")

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                return
            }

            DispatchQueue.main.async {
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show('mac', \(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show('mac', \(state.isEnabled), false)")
                }
            }
        }
#endif
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // Save share-sheet delivery settings into the App Group (both platforms).
        if let body = message.body as? [String: Any],
           (body["type"] as? String) == "save-settings" {
            let defaults = UserDefaults(suiteName: appGroupIdentifier)
            for key in settingsKeys {
                defaults?.set((body[key] as? String) ?? "", forKey: key)
            }
            return
        }

#if os(macOS)
        guard let action = message.body as? String, action == "open-preferences" else {
            return
        }

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            guard error == nil else {
                return
            }

            DispatchQueue.main.async {
                NSApp.terminate(self)
            }
        }
#endif
    }

}
