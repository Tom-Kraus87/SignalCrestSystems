/*
  Homepage illustrative workflow demos (secondary educational section).
  Connected Systems interactive map lives in the hero (hero-systems.js).
  No backend calls — UI progression only. CSP-safe (no inline).
*/
(function () {
  "use strict";

  var root = document.querySelector("[data-wf-root]");
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"][data-wf]'));
  var panels = Array.prototype.slice.call(root.querySelectorAll("[data-wf-panel]"));
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reduceQuery.matches;
  var autoTimers = {};
  var live = document.createElement("p");
  live.className = "hs-sr";
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  root.appendChild(live);

  function announce(msg) {
    live.textContent = "";
    window.setTimeout(function () { live.textContent = msg; }, 30);
  }

  function clearAuto(id) {
    if (autoTimers[id]) {
      window.clearInterval(autoTimers[id]);
      autoTimers[id] = null;
    }
  }

  function clearAllAutos() {
    Object.keys(autoTimers).forEach(clearAuto);
  }

  function selectWorkflow(id, opts) {
    opts = opts || {};
    tabs.forEach(function (tab) {
      var on = tab.getAttribute("data-wf") === id;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      tab.classList.toggle("is-selected", on);
    });
    panels.forEach(function (panel) {
      var on = panel.getAttribute("data-wf-panel") === id;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
    clearAllAutos();
    var panel = root.querySelector('[data-wf-panel="' + id + '"]');
    if (panel) startDemo(panel, { auto: !opts.skipAuto && !reduced });
    if (!opts.silent) {
      var label = (root.querySelector('[data-wf="' + id + '"]') || {}).textContent || id;
      announce("Showing illustrative workflow: " + String(label).trim());
    }
  }

  function renderDemo(demo, idx) {
    var steps = Array.prototype.slice.call(demo.querySelectorAll(".wf-step"));
    var status = demo.querySelector("[data-wf-status]");
    var advance = demo.querySelector("[data-wf-advance]");
    var last = idx >= steps.length - 1;
    steps.forEach(function (li, i) {
      li.classList.toggle("is-done", i < idx || (last && i === idx));
      li.classList.toggle("is-current", i === idx);
      if (i === idx) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    var title = steps[idx] ? (steps[idx].querySelector("strong") || {}).textContent || "" : "";
    if (status) {
      status.textContent = "Step " + (idx + 1) + " of " + steps.length + ": " + title;
    }
    if (advance) {
      advance.textContent = last ? "Replay example" : "Advance step";
    }
    demo.setAttribute("data-wf-index", String(idx));
  }

  function startDemo(panel, opts) {
    var demo = panel.querySelector("[data-wf-demo]");
    if (!demo) return;
    var steps = Array.prototype.slice.call(demo.querySelectorAll(".wf-step"));
    if (!steps.length) return;
    var id = demo.getAttribute("data-wf-demo");
    var idx = 0;
    renderDemo(demo, idx);

    var advance = demo.querySelector("[data-wf-advance]");
    if (advance && !advance._wfBound) {
      advance._wfBound = true;
      advance.addEventListener("click", function () {
        clearAuto(id);
        var cur = Number(demo.getAttribute("data-wf-index") || "0");
        var next = cur >= steps.length - 1 ? 0 : cur + 1;
        renderDemo(demo, next);
        announce(demo.querySelector("[data-wf-status]").textContent);
      });
    }

    if (opts && opts.auto && steps.length > 1) {
      clearAuto(id);
      autoTimers[id] = window.setInterval(function () {
        if (panel.hidden) { clearAuto(id); return; }
        var cur = Number(demo.getAttribute("data-wf-index") || "0");
        if (cur >= steps.length - 1) {
          clearAuto(id);
          return;
        }
        renderDemo(demo, cur + 1);
      }, 2200);
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      selectWorkflow(tab.getAttribute("data-wf"));
    });
  });

  var picker = root.querySelector(".wf-picker");
  if (picker) {
    picker.addEventListener("keydown", function (e) {
      var cur = document.activeElement;
      if (!cur || !cur.classList.contains("wf-tab")) return;
      var i = tabs.indexOf(cur);
      if (i < 0) return;
      var next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      else return;
      e.preventDefault();
      next.focus();
      selectWorkflow(next.getAttribute("data-wf"));
    });
  }

  reduceQuery.addEventListener("change", function (ev) {
    reduced = ev.matches;
    if (reduced) clearAllAutos();
  });

  // Default: Connected Systems educational walkthrough; no auto-start.
  selectWorkflow("systems", { silent: true, skipAuto: true });
})();
