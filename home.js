/* Homepage prototype: scroll reveal + Showroom preview mini-demos (fictional sample data, client-side only). */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- entrance + scroll reveal (skipped entirely under reduced motion) ---------- */
  if (!reduced && "IntersectionObserver" in window) {
    root.classList.add("hm-reveal-on");
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("hs-ready"); }); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]"), function (el) { io.observe(el); });
  }

  /* ---------- mini job board ---------- */
  var stepper = document.querySelector("[data-stepper]");
  var advance = document.querySelector("[data-stepper-advance]");
  var status = document.querySelector("[data-stepper-status]");
  if (stepper && advance && status) {
    var steps = Array.prototype.slice.call(stepper.children);
    var idx = 0;
    var renderStepper = function () {
      steps.forEach(function (li, i) {
        li.classList.toggle("is-done", i <= idx);
        li.classList.toggle("is-current", i === idx);
        if (i === idx) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      var last = idx === steps.length - 1;
      advance.textContent = last ? "Reset sample job" : "Advance status";
      status.textContent = "Status: " + steps[idx].textContent + (last ? ". Job complete (sample)." : "");
    };
    advance.addEventListener("click", function () {
      idx = idx === steps.length - 1 ? 0 : idx + 1;
      renderStepper();
    });
    renderStepper();
  }

  /* ---------- mini cart ---------- */
  var list = document.querySelector("[data-mini-cart]");
  var cartStatus = document.querySelector("[data-cart-status]");
  var clear = document.querySelector("[data-cart-clear]");
  if (list && cartStatus && clear) {
    var count = 0, total = 0;
    var renderCart = function (lastName) {
      cartStatus.textContent = count === 0
        ? "Sample cart: 0 items"
        : "Sample cart: " + count + (count === 1 ? " item" : " items") + ", $" + total.toFixed(2) + " (sample)" + (lastName ? ". Added " + lastName + "." : "");
      clear.disabled = count === 0;
    };
    Array.prototype.forEach.call(list.querySelectorAll("button[data-price]"), function (btn) {
      btn.addEventListener("click", function () {
        count += 1;
        total += Number(btn.getAttribute("data-price"));
        btn.closest("li").classList.add("is-added");
        renderCart(btn.getAttribute("data-name"));
      });
    });
    clear.addEventListener("click", function () {
      count = 0; total = 0;
      Array.prototype.forEach.call(list.querySelectorAll("li"), function (li) { li.classList.remove("is-added"); });
      renderCart();
      list.querySelector("button").focus();
    });
    renderCart();
  }
})();
