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
})();
