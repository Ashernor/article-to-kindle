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
