function show(platform, enabled, useSettingsInsteadOfPreferences) {
    document.body.classList.add(`platform-${platform}`);

    if (useSettingsInsteadOfPreferences) {
        var on = document.querySelector('.platform-mac.state-on');
        var off = document.querySelector('.platform-mac.state-off');
        var unknown = document.querySelector('.platform-mac.state-unknown');
        var btn = document.querySelector('.platform-mac.open-preferences');
        if (on) on.innerText = "Article to Kindle’s extension is currently on. You can turn it off in the Extensions section of Safari Settings.";
        if (off) off.innerText = "Article to Kindle’s extension is currently off. You can turn it on in the Extensions section of Safari Settings.";
        if (unknown) unknown.innerText = "You can turn on Article to Kindle’s extension in the Extensions section of Safari Settings.";
        if (btn) btn.innerText = "Quit and Open Safari Settings…";
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

function setVersion(v) {
    var el = document.getElementById('ver');
    if (el && v) el.textContent = v;
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

var prefBtn = document.querySelector("button.open-preferences");
if (prefBtn) prefBtn.addEventListener("click", openPreferences);

// --- Share-sheet delivery settings (stored natively in the App Group) ---

// Called by the native app on load to pre-fill the form.
function loadSettings(s) {
    s = s || {};
    var k = document.getElementById("kindle");
    var r = document.getElementById("relay");
    var t = document.getElementById("token");
    if (k) k.value = s.kindleEmail || "";
    if (r) r.value = s.relayUrl || "";
    if (t) t.value = s.relayToken || "";
}

var form = document.getElementById("settings");
if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var payload = {
            type: "save-settings",
            kindleEmail: (document.getElementById("kindle").value || "").trim(),
            relayUrl: (document.getElementById("relay").value || "").trim(),
            relayToken: (document.getElementById("token").value || "").trim()
        };
        try { webkit.messageHandlers.controller.postMessage(payload); } catch (err) {}
        var saved = document.getElementById("saved");
        if (saved) {
            saved.hidden = false;
            clearTimeout(form._t);
            form._t = setTimeout(function () { saved.hidden = true; }, 2200);
        }
    });
}
