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
  if (currentPage.indexOf(".") === -1) currentPage = currentPage + ".html";

  var moreDetails = document.querySelector(".nav-more-details");

  function closeMore() {
    if (moreDetails) moreDetails.open = false;
  }

  if (siteNav) {
    var navLinks = siteNav.querySelectorAll("a");
    navLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      if (href === currentPage || (currentPage === "index.html" && href === "./")) {
        link.classList.add("is-active");
        if (link.closest(".nav-more-panel") && moreDetails) {
          moreDetails.classList.add("is-active");
          var summary = moreDetails.querySelector(".nav-more-toggle");
          if (summary) summary.classList.add("is-active");
        }
        if (href === "case-studies.html") {
          var workLink = siteNav.querySelector('a[href="work.html"]');
          if (workLink) workLink.classList.add("is-active");
        }
      }
      link.addEventListener("click", function () {
        closeMore();
        closeNav();
      });
    });
  }

  function closeNav() {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
    document.body.style.overflow = "";
    if (header) header.classList.remove("nav-open");
    closeMore();
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

  if (moreDetails) {
    document.addEventListener("click", function (e) {
      if (!moreDetails.open) return;
      if (e.target.closest(".nav-more")) return;
      closeMore();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeMore();
      closeNav();
    }
  });  if (header) {
    window.addEventListener(
      "scroll",
      function () {
        header.classList.toggle("is-scrolled", window.scrollY > 20);
      },
      { passive: true }
    );
  }

  if (form && formStatus) {
    var submitBtn = document.getElementById("contact-submit");
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
      ["name", "email", "message"].forEach(function (name) {
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
          "All 7 content areas - Home, About, Services, Gallery, Reviews, Pricing & Contact - flow together on one smooth-scrolling page. Use the menu to jump between sections."
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
          "The same content - fully redesigned. Modern layout, trust signals, refined navigation, and clearer calls-to-action across every page."
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
