(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const navLinks = siteNav.querySelectorAll("a");
  const header = document.querySelector(".site-header");
  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const yearEl = document.getElementById("year");

  yearEl.textContent = new Date().getFullYear();

  function closeNav() {
    navToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function openNav() {
    navToggle.setAttribute("aria-expanded", "true");
    siteNav.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  navToggle.addEventListener("click", function () {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeNav() : openNav();
  });

  navLinks.forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  window.addEventListener("scroll", function () {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  }, { passive: true });

  const sections = document.querySelectorAll("section[id]");
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach(function (link) {
            const href = link.getAttribute("href");
            link.classList.toggle("is-active", href === "#" + id);
          });
        }
      });
    },
    { rootMargin: "-40% 0px -50% 0px" }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formStatus.className = "form-note";
    formStatus.textContent = "";

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const service = form.service.value;
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      formStatus.className = "form-note error";
      formStatus.textContent = "Please fill in all required fields.";
      return;
    }

    const subject = encodeURIComponent(
      "SignalCrest Systems Inquiry" + (service ? " — " + service : "")
    );
    const body = encodeURIComponent(
      "Name: " + name + "\nEmail: " + email +
      (service ? "\nService: " + service : "") +
      "\n\n" + message
    );

    window.location.href = "mailto:signalcrestsystems@gmail.com?subject=" + subject + "&body=" + body;

    formStatus.className = "form-note success";
    formStatus.textContent = "Opening your email client… If it doesn't open, email signalcrestsystems@gmail.com directly.";
  });

  // Package demo modal
  const demoModal = document.getElementById("demoModal");
  if (demoModal) {
    const demoScreen = document.getElementById("demoScreen");
    const demoTitle = document.getElementById("demoTitle");
    const demoExplainer = document.getElementById("demoExplainer");
    const demoUrl = document.getElementById("demoUrl");
    const demoCloseBtn = demoModal.querySelector(".demo-close");
    let lastFocused = null;

    const demoData = {
      starter: {
        title: "SignalCrest Starter Site",
        url: "evergreenlandscaping.com",
        explainer:
          "All 7 content areas — Home, About, Services, Gallery, Reviews, Pricing & Contact — flow together on one smooth-scrolling page. Use the menu to jump between sections."
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
          "The same content — fully redesigned. Modern layout, trust signals, refined navigation, and clearer calls-to-action across every page."
      }
    };

    function openDemo(key) {
      const data = demoData[key];
      const tpl = document.getElementById("tpl-" + key);
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
      const scrollLink = e.target.closest("a[data-scroll]");
      if (scrollLink) {
        e.preventDefault();
        const id = scrollLink.getAttribute("href").slice(1);
        const target = demoScreen.querySelector("#" + id);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const tab = e.target.closest(".d-tab");
      if (tab) {
        const page = tab.getAttribute("data-page");
        const site = tab.closest(".d-site");
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
