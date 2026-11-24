/**
 * Interactive Showroom shell — Batch S1
 * Keyboard tabs, hash routing, demo mounting. No third-party deps.
 */
(function () {
  "use strict";

  var DEMOS = [
    {
      id: "home-services",
      tabId: "tab-home-services",
      panelId: "panel-home-services",
      label: "Home Services",
      banner: "Home Services demo loaded. Sample data only — no bookings or messages are sent."
    },
    {
      id: "ecommerce",
      tabId: "tab-ecommerce",
      panelId: "panel-ecommerce",
      label: "E-commerce",
      banner: "E-commerce demo loaded. Fictional catalog — no real payments or orders."
    }
  ];

  function getDemo(id) {
    return (
      DEMOS.find(function (d) {
        return d.id === id;
      }) || DEMOS[0]
    );
  }

  function mountDemo(id) {
    if (id === "home-services" && window.SCSShowroomHomeServices) {
      var hs = document.getElementById("demo-home-services-root");
      if (hs && !hs.dataset.mounted) {
        window.SCSShowroomHomeServices.mount(hs);
        hs.dataset.mounted = "1";
      }
    }
    if (id === "ecommerce" && window.SCSShowroomEcommerce) {
      var ec = document.getElementById("demo-ecommerce-root");
      if (ec && !ec.dataset.mounted) {
        window.SCSShowroomEcommerce.mount(ec);
        ec.dataset.mounted = "1";
      }
    }
  }

  function activate(demoId, opts) {
    var demo = getDemo(demoId);
    var tabs = document.querySelectorAll(".showroom-demo-tab");
    var panels = document.querySelectorAll("[data-demo-panel]");
    var banner = document.getElementById("showroom-stage-banner");

    tabs.forEach(function (tab) {
      var selected = tab.getAttribute("data-demo-id") === demo.id;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach(function (panel) {
      var on = panel.getAttribute("data-demo-panel") === demo.id;
      panel.classList.toggle("is-active", on);
      if (on) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });

    if (banner) banner.textContent = demo.banner;
    mountDemo(demo.id);

    if (!opts || opts.updateHash !== false) {
      var nextHash = "#demo-" + demo.id;
      if (location.hash !== nextHash) {
        history.replaceState(null, "", nextHash);
      }
    }
  }

  function bindTabs() {
    var tablist = document.getElementById("showroom-tablist");
    if (!tablist) return;

    tablist.addEventListener("click", function (e) {
      var tab = e.target.closest(".showroom-demo-tab");
      if (!tab) return;
      activate(tab.getAttribute("data-demo-id"));
    });

    tablist.addEventListener("keydown", function (e) {
      var tabs = Array.prototype.slice.call(tablist.querySelectorAll(".showroom-demo-tab"));
      var current = document.activeElement;
      var idx = tabs.indexOf(current);
      if (idx < 0) return;

      var nextIdx = idx;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        nextIdx = (idx + 1) % tabs.length;
        e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
        e.preventDefault();
      } else if (e.key === "Home") {
        nextIdx = 0;
        e.preventDefault();
      } else if (e.key === "End") {
        nextIdx = tabs.length - 1;
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        activate(current.getAttribute("data-demo-id"));
        e.preventDefault();
        return;
      } else {
        return;
      }

      tabs[nextIdx].focus();
      activate(tabs[nextIdx].getAttribute("data-demo-id"));
    });
  }

  function initialDemoId() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash === "demo-ecommerce" || hash === "ecommerce") return "ecommerce";
    if (hash === "demo-home-services" || hash === "home-services") return "home-services";
    return "home-services";
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindTabs();
    activate(initialDemoId(), { updateHash: true });
    window.addEventListener("hashchange", function () {
      activate(initialDemoId(), { updateHash: false });
    });
  });
})();
