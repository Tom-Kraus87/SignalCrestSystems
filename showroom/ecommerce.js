/**
 * Showroom Demo 2 — E-commerce (client-side only, fictional catalog / no payments)
 */
(function () {
  "use strict";

  var PRODUCTS = [
    { id: "nl-pack", name: "Trail daypack 22L", category: "Bags", price: 89, blurb: "Light pack for day hikes." },
    { id: "nl-bottle", name: "Insulated bottle 32oz", category: "Drinkware", price: 34, blurb: "Keeps drinks cold on the trail." },
    { id: "nl-shell", name: "Storm shell jacket", category: "Apparel", price: 168, blurb: "Packable rain shell." },
    { id: "nl-lamp", name: "Camp lantern", category: "Camp", price: 46, blurb: "USB-C rechargeable lantern." },
    { id: "nl-mat", name: "Sleeping pad", category: "Camp", price: 79, blurb: "Compact foam pad." },
    { id: "nl-cap", name: "Summit cap", category: "Apparel", price: 28, blurb: "Breathable trail cap." }
  ];

  var CATEGORIES = ["All", "Bags", "Drinkware", "Apparel", "Camp"];

  function money(n) {
    return "$" + n.toFixed(2);
  }

  function createState() {
    return {
      category: "All",
      selectedId: PRODUCTS[0].id,
      cart: {},
      checkoutStep: "browse",
      orderId: null,
      message: ""
    };
  }

  function cartLines(state) {
    return Object.keys(state.cart)
      .map(function (id) {
        var product = PRODUCTS.find(function (p) {
          return p.id === id;
        });
        if (!product || state.cart[id] < 1) return null;
        return { product: product, qty: state.cart[id] };
      })
      .filter(Boolean);
  }

  function cartTotal(lines) {
    return lines.reduce(function (sum, line) {
      return sum + line.product.price * line.qty;
    }, 0);
  }

  function restoreFocus(root, selector) {
    var candidates = Array.isArray(selector) ? selector : [selector];
    for (var i = 0; i < candidates.length; i++) {
      var sel = candidates[i];
      if (!sel) continue;
      var el = root.querySelector(sel);
      if (el && !el.disabled) {
        el.focus();
        return;
      }
    }
    var status = root.querySelector("#ec-live-status");
    if (status) {
      status.focus();
    }
  }

  function render(root, state, setState, focusSelector) {
    var filtered =
      state.category === "All"
        ? PRODUCTS
        : PRODUCTS.filter(function (p) {
            return p.category === state.category;
          });

    var selected =
      PRODUCTS.find(function (p) {
        return p.id === state.selectedId;
      }) || filtered[0] || PRODUCTS[0];

    var lines = cartLines(state);
    var total = cartTotal(lines);

    var catHtml = CATEGORIES.map(function (c) {
      return (
        '<button type="button" class="sh-btn' +
        (state.category === c ? " sh-btn-primary" : "") +
        '" data-cat="' +
        c +
        '" data-focus-key="cat-' +
        c +
        '">' +
        c +
        "</button>"
      );
    }).join("");

    var productHtml = filtered
      .map(function (p) {
        return (
          '<button type="button" class="sh-product' +
          (p.id === selected.id ? " is-selected" : "") +
          '" data-product="' +
          p.id +
          '" data-focus-key="product-' +
          p.id +
          '">' +
          '<span class="sh-swatch" aria-hidden="true"></span>' +
          "<strong>" +
          escapeHtml(p.name) +
          "</strong>" +
          '<span class="sh-muted">' +
          escapeHtml(p.category) +
          " · " +
          money(p.price) +
          "</span>" +
          "</button>"
        );
      })
      .join("");

    var cartHtml =
      lines.length === 0
        ? '<p class="sh-muted">Cart is empty.</p>'
        : lines
            .map(function (line) {
              return (
                '<div class="sh-cart-line">' +
                "<span>" +
                escapeHtml(line.product.name) +
                " × " +
                line.qty +
                "</span>" +
                "<strong>" +
                money(line.product.price * line.qty) +
                "</strong>" +
                '<button type="button" class="sh-btn" data-remove="' +
                line.product.id +
                '" data-focus-key="remove-' +
                line.product.id +
                '">Remove</button>' +
                "</div>"
              );
            })
            .join("") +
          "<p><strong>Subtotal:</strong> " +
          money(total) +
          " <span class=\"sh-muted\">(sample)</span></p>";

    var checkoutBlock = "";
    if (state.checkoutStep === "browse") {
      checkoutBlock =
        '<button type="button" class="sh-btn sh-btn-primary" id="ec-checkout"' +
        (lines.length === 0 ? " disabled" : "") +
        ">Start simulated checkout</button>";
    } else if (state.checkoutStep === "review") {
      checkoutBlock =
        '<p class="sh-muted">Review sample order — no payment method is collected and nothing is charged.</p>' +
        '<div class="sh-row">' +
        '<button type="button" class="sh-btn sh-btn-primary" id="ec-confirm">Confirm sample order</button>' +
        '<button type="button" class="sh-btn" id="ec-cancel">Back to cart</button>' +
        "</div>";
    } else {
      checkoutBlock =
        '<button type="button" class="sh-btn" id="ec-reset">Start another browse session</button>';
    }

    var statusHtml = "";
    if (state.checkoutStep === "done") {
      statusHtml =
        "Sample order <strong>" +
        escapeHtml(state.orderId || "") +
        "</strong> confirmed in-browser only. No payment processed, no inventory updated, no email sent.";
    } else if (state.message) {
      statusHtml = escapeHtml(state.message);
    }

    root.innerHTML =
      '<div class="sh-grid">' +
      '<div class="sh-card">' +
      "<h4>Catalog</h4>" +
      '<div class="sh-row" role="group" aria-label="Category filter">' +
      catHtml +
      "</div>" +
      '<div class="sh-product-grid">' +
      productHtml +
      "</div>" +
      "</div>" +
      '<div class="sh-card">' +
      "<h4>Product detail</h4>" +
      "<p><strong>" +
      escapeHtml(selected.name) +
      '</strong> <span class="sh-badge">' +
      escapeHtml(selected.category) +
      "</span></p>" +
      '<p class="sh-muted">' +
      escapeHtml(selected.blurb) +
      "</p>" +
      "<p>" +
      money(selected.price) +
      "</p>" +
      '<button type="button" class="sh-btn sh-btn-primary" id="ec-add">Add to cart</button>' +
      "</div>" +
      '<div class="sh-card">' +
      "<h4>Cart &amp; checkout simulation</h4>" +
      cartHtml +
      '<div class="sh-checkout-actions">' +
      checkoutBlock +
      "</div>" +
      '<p class="sh-toast sh-live-status" id="ec-live-status" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">' +
      statusHtml +
      "</p>" +
      "</div>" +
      "</div>";

    root.querySelectorAll("[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-cat");
        var next = Object.assign({}, state, { category: cat, message: "" });
        var stillVisible = PRODUCTS.some(function (p) {
          return (
            p.id === next.selectedId &&
            (next.category === "All" || p.category === next.category)
          );
        });
        if (!stillVisible) {
          var first =
            next.category === "All"
              ? PRODUCTS[0]
              : PRODUCTS.find(function (p) {
                  return p.category === next.category;
                });
          if (first) next.selectedId = first.id;
        }
        setState(next, '[data-focus-key="cat-' + cat + '"]');
      });
    });

    root.querySelectorAll("[data-product]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-product");
        setState(
          Object.assign({}, state, { selectedId: id, message: "" }),
          '[data-focus-key="product-' + id + '"]'
        );
      });
    });

    root.querySelector("#ec-add").addEventListener("click", function () {
      var next = Object.assign({}, state, { cart: Object.assign({}, state.cart) });
      next.cart[selected.id] = (next.cart[selected.id] || 0) + 1;
      next.checkoutStep = "browse";
      next.message = selected.name + " added to sample cart.";
      setState(next, ["#ec-checkout", "#ec-add", "#ec-live-status"]);
    });

    root.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var removeId = btn.getAttribute("data-remove");
        var next = Object.assign({}, state, { cart: Object.assign({}, state.cart) });
        delete next.cart[removeId];
        next.message = "Item removed from sample cart.";
        if (Object.keys(next.cart).length === 0) next.checkoutStep = "browse";
        setState(next, ["#ec-checkout", "#ec-add", "#ec-live-status"]);
      });
    });

    var checkoutBtn = root.querySelector("#ec-checkout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function () {
        setState(Object.assign({}, state, { checkoutStep: "review", message: "" }), "#ec-confirm");
      });
    }

    var confirmBtn = root.querySelector("#ec-confirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        setState(
          Object.assign({}, state, {
            checkoutStep: "done",
            orderId: "NL-" + (5400 + Math.floor(Math.random() * 400)),
            message: ""
          }),
          ["#ec-reset", "#ec-live-status"]
        );
      });
    }

    var cancelBtn = root.querySelector("#ec-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        setState(Object.assign({}, state, { checkoutStep: "browse" }), "#ec-checkout");
      });
    }

    var resetBtn = root.querySelector("#ec-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        setState(createState(), "#ec-add");
      });
    }

    if (focusSelector) {
      restoreFocus(root, focusSelector);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.SCSShowroomEcommerce = {
    mount: function (root) {
      var state = createState();
      function setState(next, focusSelector) {
        state = next;
        render(root, state, setState, focusSelector);
      }
      render(root, state, setState);
    }
  };
})();
