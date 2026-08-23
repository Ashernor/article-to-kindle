# In-app tip jar (StoreKit 2)

A minimal, Apple-compliant "leave a tip" using **consumable** IAPs. Free app,
optional tips.

## 1. App Store Connect
Create 3 **Consumable** in-app purchases with these Product IDs:
- `app.articletokindle.tip.small`
- `app.articletokindle.tip.medium`
- `app.articletokindle.tip.large`

For local testing, add the same IDs to a **StoreKit Configuration file**
(File → New → StoreKit Configuration File) and select it in the scheme's Run
options.

## 2. Add this file to the App targets (iOS + macOS)
`TipJar.swift`:

```swift
import StoreKit

@MainActor
final class TipJar: ObservableObject {
    static let ids = [
        "app.articletokindle.tip.small",
        "app.articletokindle.tip.medium",
        "app.articletokindle.tip.large",
    ]

    @Published var products: [Product] = []
    @Published var thanks = false

    func load() async {
        do {
            let items = try await Product.products(for: TipJar.ids)
            products = items.sorted { $0.price < $1.price }
        } catch {
            print("TipJar load error:", error)
        }
    }

    func tip(_ product: Product) async {
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                if case .verified(let transaction) = verification {
                    await transaction.finish()   // consumable: just finish
                    thanks = true
                }
            case .userCancelled, .pending:
                break
            @unknown default:
                break
            }
        } catch {
            print("TipJar purchase error:", error)
        }
    }
}
```

## 3. Present it (SwiftUI — simplest)
Add a SwiftUI tip sheet and host it from the existing app view. Example view:

```swift
import SwiftUI
import StoreKit

struct TipJarView: View {
    @StateObject private var jar = TipJar()
    var body: some View {
        VStack(spacing: 16) {
            Text("Support Article → Kindle").font(.headline)
            Text("This app is free and open-source. Tips are optional and appreciated 💛")
                .font(.footnote).multilineTextAlignment(.center).foregroundStyle(.secondary)
            ForEach(jar.products, id: \.id) { p in
                Button { Task { await jar.tip(p) } } label: {
                    HStack { Text(p.displayName); Spacer(); Text(p.displayPrice) }
                        .padding().frame(maxWidth: .infinity)
                        .background(Color.orange.opacity(0.15)).clipShape(.rect(cornerRadius: 10))
                }
            }
            if jar.thanks { Text("Thank you! 🙏").foregroundStyle(.green) }
        }
        .padding()
        .task { await jar.load() }
    }
}
```

- **iOS (UIKit ViewController):** present via
  `present(UIHostingController(rootView: TipJarView()), animated: true)` from a
  "Tip" button.
- **macOS (AppKit):** show it in a sheet with `NSHostingController(rootView: TipJarView())`.

## 4. Notes
- Consumables don't need restore. Keep the app fully functional without tipping —
  never gate features behind a tip (Apple requires this, and it's the point).
- Also link **GitHub Sponsors** and **Ko-fi** from the app's About screen for
  web-based supporters (lower fees than IAP).
