/**
 * Showroom Demo 1 — Home Services (client-side only, fictional data)
 */
(function () {
  "use strict";

  var SERVICES = [
    { id: "lawn", label: "Lawn care & mowing", base: 85 },
    { id: "cleanup", label: "Seasonal cleanup", base: 160 },
    { id: "hvac", label: "HVAC checkup", base: 129 },
    { id: "plumbing", label: "Plumbing visit", base: 145 }
  ];

  var STATUS_FLOW = ["Received", "Estimate sent", "Scheduled", "In progress", "Complete"];

  function money(n) {
    return "$" + n.toFixed(0);
  }

  function createState() {
    return {
      customerName: "",
      customerPhone: "",
      serviceId: "lawn",
      notes: "",
      estimate: null,
      jobId: null,
      statusIndex: -1,
      followUp: "",
      message: ""
    };
  }

  function estimateFor(serviceId) {
    var svc = SERVICES.find(function (s) {
      return s.id === serviceId;
    });
    if (!svc) return null;
    var low = svc.base;
    var high = Math.round(svc.base * 1.35);
    return { low: low, high: high, label: svc.label };
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
    var status = root.querySelector("#hs-live-status");
    if (status) {
      status.focus();
    }
  }

  function syncInquiryFields(root, state) {
    var form = root.querySelector("#hs-inquiry");
    if (!form) return;
    var fd = new FormData(form);
    state.customerName = String(fd.get("name") || "");
    state.customerPhone = String(fd.get("phone") || "");
    state.serviceId = String(fd.get("service") || "lawn");
    state.notes = String(fd.get("notes") || "");
  }

  function render(root, state, setState, focusSelector) {
    var svcOptions = SERVICES.map(function (s) {
      return (
        '<option value="' +
        s.id +
        '"' +
        (state.serviceId === s.id ? " selected" : "") +
        ">" +
        s.label +
        "</option>"
      );
    }).join("");

    var stepsHtml = STATUS_FLOW.map(function (label, idx) {
      var cls = "sh-step";
      if (state.statusIndex > idx) cls += " is-done";
      if (state.statusIndex === idx) cls += " is-current";
      return '<li class="' + cls + '">' + label + "</li>";
    }).join("");

    var estimateBlock = state.estimate
      ? '<p class="sh-muted">Suggested range for <strong>' +
        state.estimate.label +
        "</strong>: " +
        money(state.estimate.low) +
        " – " +
        money(state.estimate.high) +
        " (sample pricing only).</p>"
      : '<p class="sh-muted">Submit an inquiry to generate a sample estimate range.</p>';

    var jobBlock =
      state.jobId == null
        ? '<p class="sh-muted">No active sample job yet.</p>'
        : "<p><span class=\"sh-badge sh-badge-accent\">Job " +
          state.jobId +
          '</span> · Status: <strong>' +
          (STATUS_FLOW[state.statusIndex] || "—") +
          "</strong></p>";

    root.innerHTML =
      '<div class="sh-grid">' +
      '<div class="sh-card">' +
      "<h4>1. Customer inquiry</h4>" +
      '<p class="sh-muted">Fictional intake form — values stay in this browser session.</p>' +
      '<form id="hs-inquiry" class="sh-grid">' +
      '<label class="sh-label">Customer name<input class="sh-input" name="name" autocomplete="off" value="' +
      escapeAttr(state.customerName) +
      '" required></label>' +
      '<label class="sh-label">Phone or email<input class="sh-input" name="phone" autocomplete="off" value="' +
      escapeAttr(state.customerPhone) +
      '" required></label>' +
      '<label class="sh-label">Service needed<select class="sh-select" name="service">' +
      svcOptions +
      "</select></label>" +
      '<label class="sh-label">Job notes<textarea class="sh-textarea" name="notes">' +
      escapeHtml(state.notes) +
      "</textarea></label>" +
      '<div class="sh-row">' +
      '<button type="submit" class="sh-btn sh-btn-primary" id="hs-submit">Request sample estimate</button>' +
      "</div>" +
      "</form>" +
      "</div>" +
      '<div class="sh-card">' +
      "<h4>2. Estimate &amp; job board</h4>" +
      estimateBlock +
      jobBlock +
      '<ul class="sh-steps" aria-label="Job status progression">' +
      stepsHtml +
      "</ul>" +
      '<div class="sh-row">' +
      '<button type="button" class="sh-btn" id="hs-advance"' +
      (state.jobId == null || state.statusIndex >= STATUS_FLOW.length - 1 ? " disabled" : "") +
      ">Advance job status</button>" +
      '<button type="button" class="sh-btn" id="hs-reset">Reset demo</button>' +
      "</div>" +
      "</div>" +
      '<div class="sh-card">' +
      "<h4>3. Follow-up simulation</h4>" +
      '<p class="sh-muted">Draft a post-job note the office would send. Sample text only.</p>' +
      '<label class="sh-label">Follow-up message<textarea class="sh-textarea" id="hs-followup">' +
      escapeHtml(state.followUp) +
      "</textarea></label>" +
      '<div class="sh-row">' +
      '<button type="button" class="sh-btn sh-btn-primary" id="hs-send-followup"' +
      (state.statusIndex < STATUS_FLOW.length - 1 ? " disabled" : "") +
      ">Simulate send follow-up</button>" +
      "</div>" +
      '<p class="sh-toast sh-live-status" id="hs-live-status" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">' +
      (state.message ? escapeHtml(state.message) : "") +
      "</p>" +
      "</div>" +
      "</div>";

    var form = root.querySelector("#hs-inquiry");
    form.addEventListener("input", function () {
      syncInquiryFields(root, state);
    });
    form.addEventListener("change", function () {
      syncInquiryFields(root, state);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      syncInquiryFields(root, state);
      var next = Object.assign({}, state, {
        customerName: String(state.customerName || "").trim(),
        customerPhone: String(state.customerPhone || "").trim(),
        serviceId: String(state.serviceId || "lawn"),
        notes: String(state.notes || "").trim()
      });
      next.estimate = estimateFor(next.serviceId);
      next.jobId = "SP-" + (1200 + Math.floor(Math.random() * 700));
      next.statusIndex = 0;
      next.followUp =
        "Hi " +
        (next.customerName.split(" ")[0] || "there") +
        ", thanks for choosing Summit Peak Home Care (demo). Your " +
        next.estimate.label.toLowerCase() +
        " visit is marked complete in this sample workflow.";
      next.message =
        "Sample estimate created for " +
        next.customerName +
        ". Job " +
        next.jobId +
        " is now Received.";
      setState(next, "#hs-advance");
    });

    root.querySelector("#hs-advance").addEventListener("click", function () {
      if (state.jobId == null || state.statusIndex >= STATUS_FLOW.length - 1) return;
      syncInquiryFields(root, state);
      var followupEl = root.querySelector("#hs-followup");
      if (followupEl) state.followUp = followupEl.value;
      var next = Object.assign({}, state);
      next.statusIndex += 1;
      next.message = "Job " + next.jobId + " moved to “" + STATUS_FLOW[next.statusIndex] + "”.";
      var focusTo =
        next.statusIndex >= STATUS_FLOW.length - 1
          ? ["#hs-send-followup", "#hs-followup", "#hs-live-status"]
          : "#hs-advance";
      setState(next, focusTo);
    });

    root.querySelector("#hs-reset").addEventListener("click", function () {
      setState(createState(), "#hs-submit");
    });

    root.querySelector("#hs-followup").addEventListener("input", function (e) {
      state.followUp = e.target.value;
    });

    root.querySelector("#hs-send-followup").addEventListener("click", function () {
      if (state.statusIndex < STATUS_FLOW.length - 1) return;
      syncInquiryFields(root, state);
      var next = Object.assign({}, state);
      next.followUp = root.querySelector("#hs-followup").value;
      next.message =
        "Follow-up simulated for " +
        (next.customerName || "sample customer") +
        ". No email or SMS was sent.";
      setState(next, ["#hs-send-followup", "#hs-live-status"]);
    });

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

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  window.SCSShowroomHomeServices = {
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
