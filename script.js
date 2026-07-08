(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const header = document.querySelector(".site-header");
  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  var currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (currentPage === "") currentPage = "index.html";

  if (siteNav) {
    var navLinks = siteNav.querySelectorAll("a");
    navLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      if (href === currentPage || (currentPage === "index.html" && href === "./")) {
        link.classList.add("is-active");
      }
      link.addEventListener("click", closeNav);
    });
  }

  function closeNav() {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
    document.body.style.overflow = "";
    if (header) header.classList.remove("nav-open");
  }

  function openNav() {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute("aria-expanded", "true");
    siteNav.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (header) header.classList.add("nav-open");
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      isOpen ? closeNav() : openNav();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  if (header) {
    window.addEventListener(
      "scroll",
      function () {
        header.classList.toggle("is-scrolled", window.scrollY > 20);
      },
      { passive: true }
    );
  }

  if (form && formStatus) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      formStatus.className = "form-note";
      formStatus.textContent = "";

      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var service = form.service.value;
      var message = form.message.value.trim();

      if (!name || !email || !message) {
        formStatus.className = "form-note error";
        formStatus.textContent = "Please fill in all required fields.";
        return;
      }

      var subject = encodeURIComponent(
        "SignalCrest Systems Inquiry" + (service ? " ΓÇö " + service : "")
      );
      var body = encodeURIComponent(
        "Name: " + name + "\nEmail: " + email +
        (service ? "\nService: " + service : "") +
        "\n\n" + message
      );

      window.location.href =
        "mailto:tom@signalcrestsystems.com?subject=" + subject + "&body=" + body;

      formStatus.className = "form-note success";
      formStatus.textContent =
        "Opening your email client… If it doesn't open, email tom@signalcrestsystems.com directly.";
    });

    var params = new URLSearchParams(window.location.search);
    var preselect = params.get("service");
    if (preselect && form.service) {
      form.service.value = preselect;
    }
  }

  var demoModal = document.getElementById("demoModal");
  if (demoModal) {
    var demoScreen = document.getElementById("demoScreen");
    var demoTitle = document.getElementById("demoTitle");
    var demoExplainer = document.getElementById("demoExplainer");
    var demoUrl = document.getElementById("demoUrl");
    var demoCloseBtn = demoModal.querySelector(".demo-close");
    var lastFocused = null;

      // Keep explainer text ASCII-only to avoid mojibake on some deployments.
      var demoData = {
      starter: {
        title: "SignalCrest Starter Site",
        url: "evergreenlandscaping.com",
        explainer:
<<<<<<< HEAD
          "All 7 content areas ΓÇö Home, About, Services, Gallery, Reviews, Pricing & Contact ΓÇö flow together on one smooth-scrolling page. Use the menu to jump between sections."
=======
          "All 7 content areas - Home, About, Services, Gallery, Reviews, Pricing & Contact - flow together on one smooth-scrolling page. Use the menu to jump between sections."
>>>>>>> 50ca79d (Fix package demo modal explainer text encoding)
      },
      business: {
        title: "SignalCrest Business Website",
        url: "evergreenlandscaping.com/home",
        explainer:
          "The same 7 content areas, organized into 5 dedicated pages for clearer navigation and stronger SEO. Click the menu tabs to switch pages."
      },
      modernization: {
        title: "SignalCrest Website Modernization",
        url: "evergreenlandscaping.com",
        explainer:
<<<<<<< HEAD
          "The same content ΓÇö fully redesigned. Modern layout, trust signals, refined navigation, and clearer calls-to-action across every page."
=======
          "The same content - fully redesigned. Modern layout, trust signals, refined navigation, and clearer calls-to-action across every page."
>>>>>>> 50ca79d (Fix package demo modal explainer text encoding)
      }
    };

    function openDemo(key) {
      var data = demoData[key];
      var tpl = document.getElementById("tpl-" + key);
      if (!data || !tpl) return;
      lastFocused = document.activeElement;
      demoTitle.textContent = data.title;
      demoExplainer.textContent = data.explainer;
      demoUrl.textContent = data.url;
      demoScreen.innerHTML = "";
      demoScreen.appendChild(tpl.content.cloneNode(true));
      demoScreen.scrollTop = 0;
      demoModal.hidden = false;
      document.body.style.overflow = "hidden";
      demoCloseBtn.focus();
    }

    function closeDemo() {
      if (demoModal.hidden) return;
      demoModal.hidden = true;
      demoScreen.innerHTML = "";
      document.body.style.overflow = "";
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    document.querySelectorAll("[data-demo]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDemo(btn.getAttribute("data-demo"));
      });
    });

    demoModal.querySelectorAll("[data-demo-close]").forEach(function (el) {
      el.addEventListener("click", closeDemo);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDemo();
    });

    demoScreen.addEventListener("click", function (e) {
      var scrollLink = e.target.closest("a[data-scroll]");
      if (scrollLink) {
        e.preventDefault();
        var id = scrollLink.getAttribute("href").slice(1);
        var target = demoScreen.querySelector("#" + id);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      var tab = e.target.closest(".d-tab");
      if (tab) {
        var page = tab.getAttribute("data-page");
        var site = tab.closest(".d-site");
        if (!site) return;
        site.querySelectorAll(".d-tab").forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        site.querySelectorAll(".d-page").forEach(function (p) {
          p.classList.toggle("is-active", p.getAttribute("data-page") === page);
        });
        demoScreen.scrollTop = 0;
      }
    });
  }
})();
