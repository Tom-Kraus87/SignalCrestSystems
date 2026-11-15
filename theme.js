(function () {
  var STORAGE_KEY = "scs-theme-preference";
  var DEFAULT_DARK = "midnight-tech";
  var DEFAULT_LIGHT = "clean-corporate";

  var THEMES = {
    "midnight-tech": { name: "Midnight Tech", group: "professional-dark" },
    "clean-corporate": { name: "Clean Corporate", group: "professional-light" },
    "obsidian-black": { name: "Obsidian Black", group: "professional-dark" },
    "stealth-carbon": { name: "Stealth Carbon", group: "professional-dark" },
    "emerald-night": { name: "Emerald Night", group: "professional-dark" },
    "royal-indigo": { name: "Royal Indigo", group: "professional-dark" },
    "neural-future": { name: "Neural Future", group: "futuristic" },
    holographic: { name: "Holographic", group: "futuristic" },
    "cyberpunk-2099": { name: "Cyberpunk 2099", group: "futuristic" },
    "cyber-terminal": { name: "Cyber Terminal", group: "futuristic" },
    "retro-computing": { name: "Retro Computing", group: "retro" },
    "synthwave-sunset": { name: "Synthwave Sunset", group: "retro" },
    "arcade-1995": { name: "Arcade 1995", group: "retro" },
    "blueprint-studio": { name: "Blueprint Studio", group: "professional-light" },
    "industrial-slate": { name: "Industrial Slate", group: "professional-dark" },
    "vintage-paper": { name: "Vintage Paper", group: "professional-light" }
  };

  function systemPrefersLight() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    );
  }

  function resolveTheme(preference) {
    if (!preference || preference === "auto") {
      return systemPrefersLight() ? DEFAULT_LIGHT : DEFAULT_DARK;
    }
    return THEMES[preference] ? preference : DEFAULT_DARK;
  }

  function getPreference() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "auto" || THEMES[stored]) return stored;
    } catch (e) {
      /* ignore */
    }
    return "auto";
  }

  function applyTheme(preference) {
    var resolved = resolveTheme(preference);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute(
      "data-theme-preference",
      preference === "auto" || !preference ? "auto" : "manual"
    );
    return resolved;
  }

  function savePreference(preference) {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch (e) {
      /* ignore */
    }
  }

  function setPreference(preference) {
    savePreference(preference);
    var resolved = applyTheme(preference);
    syncPickerUI(preference, resolved);
    return resolved;
  }

  // Expose for early boot / debugging
  window.SCSTheme = {
    THEMES: THEMES,
    getPreference: getPreference,
    resolveTheme: resolveTheme,
    setPreference: setPreference,
    applyTheme: applyTheme,
    DEFAULT_DARK: DEFAULT_DARK,
    DEFAULT_LIGHT: DEFAULT_LIGHT,
    STORAGE_KEY: STORAGE_KEY
  };

  var root = document.documentElement;
  var picker = document.querySelector(".theme-picker");
  if (!picker) return;

  var toggle = picker.querySelector(".theme-picker-toggle");
  var panel = picker.querySelector(".theme-picker-panel");
  var autoBtn = picker.querySelector("[data-theme-choice='auto']");
  var options = picker.querySelectorAll(".theme-option");
  var live = picker.querySelector(".theme-picker-live");

  function syncPickerUI(preference, resolved) {
    var isAuto = preference === "auto";
    if (autoBtn) autoBtn.setAttribute("aria-pressed", isAuto ? "true" : "false");
    options.forEach(function (btn) {
      var id = btn.getAttribute("data-theme-id");
      var pressed = !isAuto && id === preference;
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
    if (live) {
      var label = isAuto
        ? "Auto (" + (THEMES[resolved] ? THEMES[resolved].name : resolved) + ")"
        : THEMES[resolved]
          ? THEMES[resolved].name
          : resolved;
      live.textContent = "Theme: " + label;
    }
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        "Theme settings, current theme " +
          (THEMES[resolved] ? THEMES[resolved].name : resolved) +
          (isAuto ? ", automatic" : "")
      );
    }
  }

  function openPanel() {
    if (!panel || !toggle) return;
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    var focusTarget =
      panel.querySelector('[aria-pressed="true"]') ||
      autoBtn ||
      panel.querySelector("button");
    if (focusTarget) focusTarget.focus();
  }

  function closePanel(returnFocus) {
    if (!panel || !toggle) return;
    if (panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (returnFocus !== false) toggle.focus();
  }

  function togglePanel() {
    if (!panel) return;
    if (panel.hidden) openPanel();
    else closePanel();
  }

  var preference = getPreference();
  var resolved = applyTheme(preference);
  syncPickerUI(preference, resolved);

  if (toggle) {
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      togglePanel();
    });
  }

  if (autoBtn) {
    autoBtn.addEventListener("click", function () {
      setPreference("auto");
    });
  }

  options.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-theme-id");
      if (id && THEMES[id]) setPreference(id);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel && !panel.hidden) {
      e.stopPropagation();
      closePanel(true);
    }
  });

  document.addEventListener("click", function (e) {
    if (!panel || panel.hidden) return;
    if (!picker.contains(e.target)) closePanel(false);
  });

  // Close when keyboard focus leaves the whole picker (not when moving between controls)
  picker.addEventListener("focusout", function () {
    if (!panel || panel.hidden) return;
    window.setTimeout(function () {
      if (!panel || panel.hidden) return;
      if (!picker.contains(document.activeElement)) closePanel(false);
    }, 0);
  });

  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: light)");
    var onSchemeChange = function () {
      if (getPreference() === "auto") {
        var next = applyTheme("auto");
        syncPickerUI("auto", next);
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onSchemeChange);
    else if (mq.addListener) mq.addListener(onSchemeChange);
  }
})();
