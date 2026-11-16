/**
 * Early theme boot — must remain a classic script (no type=module) so it runs
 * before first paint and stays CSP-friendly without inline scripts.
 */
(function () {
  try {
    var KEY = "scs-theme-preference";
    var pref = localStorage.getItem(KEY);
    var dark = "midnight-tech";
    var light = "clean-corporate";
    var themes = {
      "midnight-tech": 1,
      "clean-corporate": 1,
      "obsidian-black": 1,
      "stealth-carbon": 1,
      "emerald-night": 1,
      "royal-indigo": 1,
      "neural-future": 1,
      "holographic": 1,
      "cyberpunk-2099": 1,
      "cyber-terminal": 1,
      "retro-computing": 1,
      "synthwave-sunset": 1,
      "arcade-1995": 1,
      "blueprint-studio": 1,
      "industrial-slate": 1,
      "vintage-paper": 1
    };
    var resolved;
    if (!pref || pref === "auto" || !themes[pref]) {
      resolved =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
          ? light
          : dark;
      if (!pref || !themes[pref]) pref = "auto";
    } else {
      resolved = pref;
    }
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute(
      "data-theme-preference",
      pref === "auto" ? "auto" : "manual"
    );
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "midnight-tech");
  }
})();
