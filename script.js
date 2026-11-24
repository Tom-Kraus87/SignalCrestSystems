(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const header = document.querySelector(".site-header");
  const form = document.getElementById("contact-form") || document.getElementById("project-request-form");
  const formStatus = document.getElementById("form-status");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  var currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (currentPage === "") currentPage = "index.html";
  if (currentPage.indexOf(".") === -1) currentPage = currentPage + ".html";

  var moreDetails = document.querySelector(".nav-more-details");
  var mainEl = document.getElementById("main");
  var footerEl = document.querySelector(".site-footer");
  var navFocusHandler = null;

  function isMobileNav() {
    return navToggle && window.getComputedStyle(navToggle).display !== "none";
  }

  function setBackgroundInert(on) {
    if (mainEl) {
      if (on) mainEl.setAttribute("inert", "");
      else mainEl.removeAttribute("inert");
    }
    if (footerEl) {
      if (on) footerEl.setAttribute("inert", "");
      else footerEl.removeAttribute("inert");
    }
  }

  function getMobileNavFocusables() {
    var items = [];
    if (navToggle) items.push(navToggle);
    if (!siteNav) return items;
    siteNav.querySelectorAll("a[href], button, summary, [tabindex]:not([tabindex='-1'])").forEach(function (el) {
      if (!el.hasAttribute("disabled") && el.offsetParent !== null) items.push(el);
    });
    return items;
  }

  function bindNavFocusTrap() {
    unbindNavFocusTrap();
    navFocusHandler = function (e) {
      if (!siteNav || !siteNav.classList.contains("is-open") || !isMobileNav()) return;
      if (e.key !== "Tab") return;
      var focusables = getMobileNavFocusables();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", navFocusHandler, true);
  }

  function unbindNavFocusTrap() {
    if (navFocusHandler) {
      document.removeEventListener("keydown", navFocusHandler, true);
      navFocusHandler = null;
    }
  }

  function closeMore(returnFocus) {
    if (!moreDetails || !moreDetails.open) return;
    moreDetails.open = false;
    if (returnFocus !== false) {
      var summary = moreDetails.querySelector(".nav-more-toggle, summary");
      if (summary && typeof summary.focus === "function") summary.focus();
    }
  }

  function pageMatchesHref(href) {
    if (!href) return false;
    var clean = href.split("#")[0].split("?")[0];
    if (clean.charAt(0) === "/") clean = clean.slice(1);
    if (!clean || clean === "./") clean = "index.html";
    return clean === currentPage || (currentPage === "index.html" && (clean === "" || clean === "./" || clean === "index.html"));
  }

  if (siteNav) {
    var navLinks = siteNav.querySelectorAll("a");
    navLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      if (pageMatchesHref(href) || href === currentPage || (currentPage === "index.html" && href === "./")) {
        link.classList.add("is-active");
        if ((link.closest(".nav-more-panel") || link.closest(".nav-explorer-panel")) && moreDetails) {
          moreDetails.classList.add("is-active");
          var summary = moreDetails.querySelector(".nav-more-toggle");
          if (summary) summary.classList.add("is-active");
        }
        if (href === "case-studies.html" || href === "/case-studies.html") {
          var workLink = siteNav.querySelector('a[href="work.html"], a[href="/work.html"]');
          if (workLink) workLink.classList.add("is-active");
        }
      }
      link.addEventListener("click", function () {
        closeMore(false);
        closeNav(true);
      });
    });
  }

  var explorerClose = moreDetails && moreDetails.querySelector(".nav-explorer-close");
  if (explorerClose) {
    explorerClose.addEventListener("click", function () {
      closeMore(true);
    });
  }

  function setMobileNavInert(on) {
    if (!siteNav) return;
    // Desktop nav must stay keyboard-reachable; only inert the drawer while closed on mobile.
    if (!isMobileNav()) {
      siteNav.removeAttribute("inert");
      return;
    }
    if (on) siteNav.setAttribute("inert", "");
    else siteNav.removeAttribute("inert");
  }

  function closeNav(returnFocus) {
    if (!navToggle || !siteNav) return;
    var wasOpen = siteNav.classList.contains("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    // Immediately block keyboard access to drawer links (including during close animation)
    setMobileNavInert(true);
    siteNav.classList.remove("is-open");
    document.body.style.overflow = "";
    if (header) header.classList.remove("nav-open");
    setBackgroundInert(false);
    unbindNavFocusTrap();
    closeMore(false);
    if (wasOpen && returnFocus !== false && isMobileNav() && typeof navToggle.focus === "function") {
      navToggle.focus();
    }
  }

  function openNav() {
    if (!navToggle || !siteNav) return;
    if (!isMobileNav()) return;
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    siteNav.classList.add("is-open");
    setMobileNavInert(false);
    setBackgroundInert(true);
    bindNavFocusTrap();
    document.body.style.overflow = "hidden";
    if (header) header.classList.add("nav-open");
    var firstLink = siteNav.querySelector("a[href]");
    if (firstLink && typeof firstLink.focus === "function") {
      window.setTimeout(function () {
        firstLink.focus();
      }, 0);
    }
  }

  function syncNavForViewport() {
    if (!siteNav || !navToggle) return;
    if (!isMobileNav()) {
      // Crossed into desktop: tear down drawer state without stealing focus
      if (
        siteNav.classList.contains("is-open") ||
        (mainEl && mainEl.hasAttribute("inert")) ||
        (footerEl && footerEl.hasAttribute("inert")) ||
        siteNav.hasAttribute("inert")
      ) {
        closeNav(false);
      }
      siteNav.removeAttribute("inert");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    } else if (!siteNav.classList.contains("is-open")) {
      setMobileNavInert(true);
    }
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) closeNav(true);
      else openNav();
    });
  }

  window.addEventListener("resize", syncNavForViewport);
  // Initial: closed mobile drawer must not expose links to Tab
  syncNavForViewport();

  function syncExplorerAria() {
    if (!moreDetails) return;
    var summary = moreDetails.querySelector(".nav-more-toggle, summary");
    if (summary) summary.setAttribute("aria-expanded", moreDetails.open ? "true" : "false");
  }
  if (moreDetails) {
    syncExplorerAria();
    moreDetails.addEventListener("toggle", syncExplorerAria);
    document.addEventListener("click", function (e) {
      if (!moreDetails.open) return;
      if (e.target.closest(".nav-more") || e.target.closest(".nav-explorer-panel")) return;
      closeMore(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (moreDetails && moreDetails.open) {
      closeMore(true);
      e.preventDefault();
      return;
    }
    if (siteNav && siteNav.classList.contains("is-open") && isMobileNav()) {
      closeNav(true);
      e.preventDefault();
    }
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
    var submitBtn = document.getElementById("contact-submit") || document.getElementById("project-request-submit");
    var FALLBACK_EMAIL = "tom@signalcrestsystems.com";

    function setFieldError(fieldName, message) {
      var field = form.elements[fieldName];
      var errorEl = document.getElementById(fieldName + "-error");
      if (!field) return;
      if (message) {
        field.setAttribute("aria-invalid", "true");
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = message;
          field.setAttribute("aria-describedby", errorEl.id);
        }
      } else {
        field.removeAttribute("aria-invalid");
        if (errorEl) {
          errorEl.hidden = true;
          errorEl.textContent = "";
          field.removeAttribute("aria-describedby");
        }
      }
    }

    function clearErrors() {
      ["name", "email", "message", "consent"].forEach(function (name) {
        setFieldError(name, "");
      });
      formStatus.className = "form-note";
      formStatus.textContent = "";
    }

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validateForm() {
      clearErrors();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var message = form.message.value.trim();
      var firstInvalid = null;

      if (!name) {
        setFieldError("name", "Please enter your name.");
        firstInvalid = firstInvalid || form.name;
      }
      if (!email) {
        setFieldError("email", "Please enter your email address.");
        firstInvalid = firstInvalid || form.email;
      } else if (!isValidEmail(email)) {
        setFieldError("email", "Please enter a valid email address.");
        firstInvalid = firstInvalid || form.email;
      }
      if (!message) {
        setFieldError("message", "Please enter a message.");
        firstInvalid = firstInvalid || form.message;
      }
      if (form.consent && !form.consent.checked) {
        setFieldError("consent", "Please confirm we may use this information to respond.");
        firstInvalid = firstInvalid || form.consent;
      }

      if (firstInvalid) {
        formStatus.className = "form-note error";
        formStatus.textContent = "Please fix the highlighted fields and try again.";
        firstInvalid.focus();
        return false;
      }
      return true;
    }

    function encodeFormBody(formEl) {
      var data = new FormData(formEl);
      var pairs = [];
      data.forEach(function (value, key) {
        pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
      });
      return pairs.join("&");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateForm()) return;

      if (form.elements["bot-field"] && form.elements["bot-field"].value) {
        formStatus.className = "form-note success";
        formStatus.textContent = "Thanks — your message has been received.";
        form.reset();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
      }
      formStatus.className = "form-note";
      formStatus.textContent = "Sending your message…";

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodeFormBody(form),
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Form submission failed");
          try {
            sessionStorage.removeItem("scsAdvisorHandoff");
          } catch (err) {
            /* ignore */
          }
          form.reset();
          clearErrors();
          formStatus.className = "form-note success";
          formStatus.textContent =
            "Thanks — your message was sent. I will get back to you soon.";
        })
        .catch(function () {
          formStatus.className = "form-note error";
          formStatus.textContent =
            "Something went wrong sending the form. Please email " +
            FALLBACK_EMAIL +
            " directly.";
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute("aria-busy");
          }
        });
    });

    var params = new URLSearchParams(window.location.search);
    var preselect = params.get("service");
    if (preselect && form.service) {
      form.service.value = preselect;
    }

    /* Advisor handoff → project-request (R3.2 safe source attribution) */
    var sourceField = form.elements["source"] || document.getElementById("request-source");
    var privacyField = form.elements["privacy-version"] || document.getElementById("privacy-version");
    var briefField = form.elements["advisor-brief"] || document.getElementById("advisor-brief");
    var HANDOFF_KEY = "scsAdvisorHandoff";

    function readAdvisorHandoff() {
      try {
        var raw = sessionStorage.getItem(HANDOFF_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || !data.flag) return null;
        return data;
      } catch (err) {
        return null;
      }
    }

    function clearAdvisorHandoff() {
      try {
        sessionStorage.removeItem(HANDOFF_KEY);
      } catch (err) {
        /* ignore */
      }
    }

    var handoff = readAdvisorHandoff();
    var wantsAdvisorSource = params.get("source") === "advisor";
    if (handoff && wantsAdvisorSource) {
      if (sourceField) sourceField.value = "advisor";
      if (privacyField && handoff.privacyVersion) privacyField.value = handoff.privacyVersion;
      if (briefField) briefField.value = handoff.brief || "";
      if (form.service && handoff.service) form.service.value = handoff.service;
      if (form.name && handoff.name) form.name.value = handoff.name;
      if (form.email && handoff.email) form.email.value = handoff.email;
      if (form.company && handoff.company) form.company.value = handoff.company;
      if (form.message && handoff.brief) {
        form.message.value = handoff.brief;
      }
      var banner = document.getElementById("advisor-handoff-note");
      if (!banner) {
        banner = document.createElement("p");
        banner.id = "advisor-handoff-note";
        banner.className = "form-note";
        banner.setAttribute("role", "status");
        banner.textContent =
          "Prefilled from the Guided Solutions Advisor. Review the brief, confirm consent, then submit. Nothing was sent yet.";
        form.insertBefore(banner, form.firstChild);
      }
    } else if (sourceField) {
      sourceField.value = "contact";
    }

    /* Visibly disable submit until consent checked (project-request / contact with consent) */
    var consentEl = form.consent;
    if (consentEl && submitBtn) {
      function syncConsentSubmit() {
        if (consentEl.checked) {
          submitBtn.disabled = false;
          submitBtn.classList.remove("is-disabled");
          submitBtn.removeAttribute("aria-disabled");
        } else {
          submitBtn.disabled = true;
          submitBtn.classList.add("is-disabled");
          submitBtn.setAttribute("aria-disabled", "true");
        }
      }
      consentEl.addEventListener("change", syncConsentSubmit);
      syncConsentSubmit();
      form.addEventListener("reset", function () {
        setTimeout(function () {
          if (sourceField) sourceField.value = "contact";
          if (briefField) briefField.value = "";
          clearAdvisorHandoff();
          syncConsentSubmit();
        }, 0);
      });
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
        title: "Starter landscaping concept — Evergreen",
        url: "evergreenlandscaping.example / starter",
        explainer:
          "Fictional Evergreen Landscaping demonstration only — not a completed client project. Home, About, Services, Gallery, Pricing, and Contact flow together on one smooth-scrolling page. Use the menu to jump between sections."
      },
      business: {
        title: "Professional landscaping concept — Evergreen",
        url: "evergreenlandscaping.example / professional",
        explainer:
          "Fictional Evergreen Landscaping demonstration only — not a completed client project. The same landscaping content, organized into dedicated pages for clearer navigation. Click the menu tabs to switch pages."
      },
      modernization: {
        title: "Advanced landscaping concept — Evergreen",
        url: "evergreenlandscaping.example / advanced",
        explainer:
          "Fictional Evergreen Landscaping demonstration only — not a completed client project. The same content, fully redesigned with a modern layout, refined navigation, and clearer calls-to-action across every page."
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
