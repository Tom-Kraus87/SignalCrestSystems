/*
  Signal Crest hero: interactive system map (prototype)
  - Plain JavaScript, no dependencies, works under CSP script-src 'self'.
  - Nodes are real <button> elements; the canvas only draws decoration
    (connecting lines, moving dots, pointer-reactive dot grid, halos).
  - Honest framing: an illustration of how systems connect, not a live system.
*/
(function () {
  "use strict";

  var map = document.getElementById("hs-map");
  if (!map) return;

  var stage = map.closest(".hs-stage");
  var canvas = map.querySelector(".hs-canvas");
  var ctx = canvas.getContext("2d");
  var buttons = Array.prototype.slice.call(map.querySelectorAll(".hs-node"));
  var chips = Array.prototype.slice.call(stage.querySelectorAll(".hs-chip"));
  var panelTitle = stage.querySelector(".hs-panel-title");
  var panelBody = stage.querySelector(".hs-panel-body");
  var stepsList = stage.querySelector(".hs-steps");
  var panelCta = stage.querySelector(".hs-panel-cta");
  var live = stage.querySelector("[data-hs-live]");
  var motionToggle = stage.querySelector(".hs-motion-toggle");
  var record = stage.querySelector(".hs-record");

  var DEFAULT_TITLE = panelTitle.textContent;
  var DEFAULT_BODY = panelBody.textContent;

  /* ---------------- graph ---------------- */

  var EDGES = [
    ["forms", "sw"], ["forms", "auto"], ["email", "ai"], ["email", "auto"],
    ["crm", "ai"], ["crm", "sw"], ["apis", "sw"], ["apis", "auto"],
    ["ai", "dash"], ["ai", "follow"], ["sw", "portal"], ["sw", "dash"],
    ["auto", "follow"], ["auto", "portal"],
    ["ai", "sw"], ["sw", "auto"]
  ];

  // Each step lights one or more hops; text is read aloud and listed in the panel.
  var SCENARIOS = {
    quote: {
      title: "Quote request",
      record: { id: "Q-2041", label: "Spring cleanup quote", status: ["Received", "Job record created", "In client portal, follow-up scheduled"] },
      steps: [
        { hops: [["forms", "auto"]], text: "A quote request arrives through your website form." },
        { hops: [["auto", "sw"]], text: "Workflow automation checks the details and creates the job record." },
        { hops: [["sw", "portal"], ["auto", "follow"]], text: "Your team sees it in the client portal, and an approved follow-up is scheduled." }
      ]
    },
    invoice: {
      title: "Invoice email",
      record: { id: "INV-7731", label: "Supplier invoice, 3 line items", status: ["Received by email", "Fields drafted, awaiting review", "Approved, reporting updated"] },
      steps: [
        { hops: [["email", "ai"]], text: "A supplier invoice arrives by email." },
        { hops: [["ai", "sw"]], text: "An AI step drafts the key fields, and a person reviews and approves them." },
        { hops: [["sw", "dash"]], text: "The approved record lands in your system and reporting updates." }
      ]
    },
    update: {
      title: "Customer update",
      record: { id: "CUS-318", label: "Contact details changed", status: ["Changed in CRM", "Synced to portal", "Follow-up queued by rule"] },
      steps: [
        { hops: [["crm", "sw"]], text: "A customer record changes in your CRM." },
        { hops: [["sw", "auto"], ["sw", "portal"]], text: "Custom software syncs the change to the portal and the systems that need it." },
        { hops: [["auto", "follow"]], text: "Automation sends only the follow-ups your rules allow." }
      ]
    },
    booking: {
      title: "Appointment booking",
      record: { id: "APT-552", label: "Site visit, Thu 2:00 PM", status: ["Requested via form", "Slot confirmed in scheduler", "Reminder queued"] },
      steps: [
        { hops: [["forms", "auto"], ["apis", "auto"]], text: "A booking request arrives from your website and checks the scheduling API." },
        { hops: [["auto", "sw"], ["auto", "portal"]], text: "Workflow automation confirms the slot and writes it into your system and client portal." },
        { hops: [["auto", "follow"]], text: "An approved reminder is queued for the customer before the appointment." }
      ]
    },
    reporting: {
      title: "Business reporting",
      record: { id: "RPT-090", label: "Weekly ops digest", status: ["Sources collected", "Summary drafted for review", "Dashboard published"] },
      steps: [
        { hops: [["crm", "ai"], ["email", "ai"]], text: "Operational signals are pulled from CRM records and inbound documents." },
        { hops: [["ai", "sw"]], text: "An AI step drafts a summary; a person reviews before anything is published." },
        { hops: [["sw", "dash"]], text: "Approved figures land on dashboards your team already uses." }
      ]
    }
  };

  var nodes = {};
  buttons.forEach(function (btn, i) {
    var id = btn.getAttribute("data-id");
    nodes[id] = {
      id: id, btn: btn, tier: btn.getAttribute("data-tier"), index: i,
      full: btn.textContent.trim(), short: btn.getAttribute("data-short") || btn.textContent.trim(),
      x: 0, y: 0, w: 0, h: 0, pulse: 0
    };
    btn.setAttribute("aria-label", nodes[id].full);
    btn.setAttribute("aria-pressed", "false");
    btn.tabIndex = i === 0 ? 0 : -1;
  });

  var edges = EDGES.map(function (pair) {
    return { a: pair[0], b: pair[1], pts: [], len: 0, lateral: nodes[pair[0]].tier === nodes[pair[1]].tier };
  });

  function findEdge(from, to) {
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (e.a === from && e.b === to) return { edge: e, dir: 1 };
      if (e.a === to && e.b === from) return { edge: e, dir: -1 };
    }
    return null;
  }

  /* ---------------- state ---------------- */

  var W = 0, H = 0, DPR = 1, compact = false;
  var pointer = { x: 0, y: 0, inside: false };
  var selected = null;          // node id chosen by click / Enter
  var hovered = null;           // node id under the pointer (preview only)
  var scenario = null;          // { key, step, t, done }
  var packets = [];
  var ripples = [];
  var colors = {};
  var gridLayer = document.createElement("canvas");
  var glowSprite = document.createElement("canvas");
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reduceQuery.matches;
  var paused = reduced;
  var visible = true;
  var rafId = 0;
  var lastTime = 0;
  var lastDraw = 0;
  var lastInteraction = 0;
  var clock = 0;
  function touch() { lastInteraction = performance.now(); }

  /* ---------------- colors (follow the active theme) ---------------- */

  var probe = document.createElement("canvas").getContext("2d");
  function toRGB(value, fallback) {
    probe.fillStyle = fallback;
    probe.fillStyle = (value || "").trim() || fallback;
    var c = probe.fillStyle; // normalized: #rrggbb or rgba(r, g, b, a)
    if (c.charAt(0) === "#") {
      return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
    }
    var m = c.match(/\d+(\.\d+)?/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
  }
  function rgba(rgb, a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")"; }

  function readColors() {
    var cs = getComputedStyle(map);
    colors.signal = toRGB(cs.getPropertyValue("--hs-signal"), "#3b9eff");
    colors.accent = toRGB(cs.getPropertyValue("--hs-accent"), "#c9a227");
    colors.text = toRGB(cs.getPropertyValue("--hs-text"), "#e8ecf1");
    colors.bg = toRGB(cs.getPropertyValue("--hs-bg"), "#000b1e");
    var lum = (0.2126 * colors.bg[0] + 0.7152 * colors.bg[1] + 0.0722 * colors.bg[2]) / 255;
    colors.light = lum > 0.55; // light themes: no additive blending
    buildSprites();
  }

  function buildSprites() {
    var s = 48;
    glowSprite.width = glowSprite.height = s;
    var g = glowSprite.getContext("2d");
    var grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, rgba(colors.accent, 0.95));
    grad.addColorStop(0.25, rgba(colors.accent, 0.45));
    grad.addColorStop(1, rgba(colors.accent, 0));
    g.clearRect(0, 0, s, s);
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    buildGrid();
  }

  /* ---------------- layout ---------------- */

  var GRID = 26;
  function buildGrid() {
    if (!W) return;
    gridLayer.width = Math.round(W * DPR);
    gridLayer.height = Math.round(H * DPR);
    var g = gridLayer.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = rgba(colors.text, colors.light ? 0.14 : 0.09);
    for (var y = GRID / 2; y < H; y += GRID) {
      for (var x = GRID / 2; x < W; x += GRID) g.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
    }
  }

  function layout() {
    var rect = map.getBoundingClientRect();
    W = rect.width; H = rect.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var wasCompact = compact;
    compact = W < 620;
    map.classList.toggle("is-compact", compact);
    if (compact !== wasCompact || !map.classList.contains("is-enhanced")) {
      buttons.forEach(function (btn) {
        var n = nodes[btn.getAttribute("data-id")];
        btn.textContent = compact ? n.short : n.full;
      });
    }
    map.classList.add("is-enhanced");

    var tiers = { in: [], core: [], out: [] };
    buttons.forEach(function (btn) { var n = nodes[btn.getAttribute("data-id")]; tiers[n.tier].push(n); });
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      n.w = n.btn.offsetWidth; n.h = n.btn.offsetHeight;
    });

    var pad = 10;
    function spread(list, axisLen, start, end) {
      var span = end - start;
      list.forEach(function (n, i) { n[axisLen] = start + span * (i + 0.5) / list.length; });
    }
    if (!compact) {
      spread(tiers.in, "y", 8, H - 8);
      spread(tiers.core, "y", H * 0.08, H * 0.92);
      spread(tiers.out, "y", H * 0.08, H * 0.92);
      tiers.in.forEach(function (n) { n.x = pad + n.w / 2; });
      tiers.core.forEach(function (n) { n.x = W / 2; });
      tiers.out.forEach(function (n) { n.x = W - pad - n.w / 2; });
    } else {
      spread(tiers.in, "x", 0, W);
      spread(tiers.core, "x", 0, W);
      spread(tiers.out, "x", 0, W);
      tiers.in.forEach(function (n) { n.y = 34; });
      tiers.core.forEach(function (n) { n.y = H / 2; });
      tiers.out.forEach(function (n) { n.y = H - 34; });
    }
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      n.btn.style.setProperty("--x", n.x.toFixed(1) + "px");
      n.btn.style.setProperty("--y", n.y.toFixed(1) + "px");
    });

    edges.forEach(buildEdgePath);
    buildGrid();
    if (packets.length === 0) seedPackets();
    if (!running()) drawStatic();
  }

  // Edge anchors sit on the node edges facing the flow, joined by a smooth curve.
  function anchor(n, side) {
    if (side === "right") return [n.x + n.w / 2, n.y];
    if (side === "left") return [n.x - n.w / 2, n.y];
    if (side === "bottom") return [n.x, n.y + n.h / 2];
    return [n.x, n.y - n.h / 2];
  }
  function buildEdgePath(e) {
    var A = nodes[e.a], B = nodes[e.b], p0, p3, c1, c2;
    if (e.lateral) {
      if (!compact) {
        p0 = anchor(A, "bottom"); p3 = anchor(B, "top");
        var bulge = 34;
        c1 = [p0[0] + bulge, p0[1] + (p3[1] - p0[1]) * 0.35];
        c2 = [p3[0] + bulge, p3[1] - (p3[1] - p0[1]) * 0.35];
      } else {
        p0 = anchor(A, "right"); p3 = anchor(B, "left");
        c1 = [p0[0] + (p3[0] - p0[0]) * 0.35, p0[1] + 18];
        c2 = [p3[0] - (p3[0] - p0[0]) * 0.35, p3[1] + 18];
      }
    } else if (!compact) {
      p0 = anchor(A, "right"); p3 = anchor(B, "left");
      var dx = (p3[0] - p0[0]) * 0.5;
      c1 = [p0[0] + dx, p0[1]]; c2 = [p3[0] - dx, p3[1]];
    } else {
      p0 = anchor(A, "bottom"); p3 = anchor(B, "top");
      var dy = (p3[1] - p0[1]) * 0.5;
      c1 = [p0[0], p0[1] + dy]; c2 = [p3[0], p3[1] - dy];
    }
    var pts = [], len = 0, SEG = 40;
    for (var i = 0; i <= SEG; i++) {
      var t = i / SEG, u = 1 - t;
      var x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0];
      var y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1];
      if (i > 0) len += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
      pts.push([x, y]);
    }
    e.pts = pts; e.len = len;
  }

  function pointAt(e, t) {
    var f = Math.max(0, Math.min(1, t)) * (e.pts.length - 1);
    var i = Math.floor(f), r = f - i;
    var a = e.pts[i], b = e.pts[Math.min(i + 1, e.pts.length - 1)];
    return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
  }

  /* ---------------- focus / highlight logic ---------------- */

  // Which edges and nodes are "lit" right now: scenario > selection > hover.
  function litSet() {
    var lit = { edges: new Set(), nodes: new Set() };
    if (scenario) {
      var sc = SCENARIOS[scenario.key];
      sc.steps.forEach(function (st, si) {
        if (si > scenario.step && !scenario.done) return;
        st.hops.forEach(function (h) {
          var f = findEdge(h[0], h[1]);
          if (f) lit.edges.add(f.edge);
          lit.nodes.add(h[0]); if (si < scenario.step || scenario.done) lit.nodes.add(h[1]);
        });
      });
      return lit;
    }
    var focus = selected || hovered;
    if (!focus) return null;
    lit.nodes.add(focus);
    edges.forEach(function (e) {
      if (e.a === focus || e.b === focus) { lit.edges.add(e); lit.nodes.add(e.a); lit.nodes.add(e.b); }
    });
    return lit;
  }

  function applyNodeClasses() {
    var lit = litSet();
    map.classList.toggle("has-focus", !!lit);
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      n.btn.classList.toggle("is-linked", !!lit && lit.nodes.has(id) && id !== selected);
      n.btn.classList.toggle("is-dim", !!lit && !lit.nodes.has(id));
      n.btn.setAttribute("aria-pressed", id === selected ? "true" : "false");
    });
  }

  /* ---------------- panel ---------------- */

  function announce(msg) {
    live.textContent = "";
    // Small delay so screen readers notice the change even for repeated text.
    window.setTimeout(function () { live.textContent = msg; }, 30);
  }

  function showDefaultPanel() {
    panelTitle.textContent = DEFAULT_TITLE;
    panelBody.textContent = DEFAULT_BODY;
    panelBody.hidden = false;
    stepsList.hidden = true;
    panelCta.hidden = true;
    record.hidden = true;
  }

  function showNodePanel(id) {
    var n = nodes[id];
    var btn = n.btn;
    var linked = edges.filter(function (e) { return e.a === id || e.b === id; })
      .map(function (e) { return nodes[e.a === id ? e.b : e.a].full; });
    panelTitle.textContent = n.full;
    panelBody.textContent = btn.getAttribute("data-detail");
    panelBody.hidden = false;
    stepsList.hidden = true;
    record.hidden = true;
    var cta = btn.getAttribute("data-cta");
    if (cta) {
      panelCta.href = cta;
      panelCta.textContent = btn.getAttribute("data-cta-label");
      panelCta.hidden = false;
    } else {
      panelCta.hidden = true;
    }
    announce(n.full + ". " + btn.getAttribute("data-detail") + " Connects to " + linked.join(", ") + ".");
  }

  function renderSteps() {
    var sc = SCENARIOS[scenario.key];
    stepsList.innerHTML = "";
    sc.steps.forEach(function (st, i) {
      var li = document.createElement("li");
      li.textContent = st.text;
      if (scenario.done || i < scenario.step) li.className = "is-done";
      if (!scenario.done && i === scenario.step) li.className = "is-current";
      stepsList.appendChild(li);
    });
    record.querySelector(".hs-record-id").textContent = sc.record.id;
    record.querySelector(".hs-record-label").textContent = sc.record.label;
    record.querySelector(".hs-record-status").textContent = sc.record.status[Math.min(scenario.done ? sc.steps.length - 1 : scenario.step, sc.record.status.length - 1)];
    record.hidden = false;
  }

  /* ---------------- interactions ---------------- */

  function select(id) {
    touch();
    stopScenario(false);
    selected = selected === id ? null : id;
    if (selected) {
      showNodePanel(selected);
      nodes[selected].pulse = 1;
      // Send a burst of dots along the selected node's connections.
      edges.forEach(function (e) {
        if (e.a === selected) spawnPacket(e, 1, 0, true);
        else if (e.b === selected) spawnPacket(e, -1, 0, true);
      });
    } else {
      showDefaultPanel();
      announce("Selection cleared.");
    }
    applyNodeClasses();
    if (!running()) drawStatic();
  }

  function startScenario(key) {
    var sc = SCENARIOS[key];
    // Guard: chips without matching SCENARIOS data (parallel HTML/JS drift) must not throw.
    if (!sc || !sc.steps || !sc.steps.length) {
      announce("That scenario is unavailable.");
      return;
    }
    touch();
    selected = null;
    scenario = { key: key, step: 0, t: 0, done: reduced || paused };
    chips.forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-scenario") === key ? "true" : "false"); });
    panelTitle.textContent = sc.title + " (illustrative example)";
    panelBody.hidden = true;
    stepsList.hidden = false;
    panelCta.hidden = true;
    renderSteps();
    if (scenario.done) {
      sc.steps.forEach(function (st) { st.hops.forEach(function (h) { nodes[h[1]].pulse = 0; }); });
      announce(sc.title + ", illustrative example. " + sc.steps.map(function (s, i) { return "Step " + (i + 1) + ": " + s.text; }).join(" "));
    } else {
      nodes[sc.steps[0].hops[0][0]].pulse = 1;
      announce(sc.title + ", illustrative example. Step 1: " + sc.steps[0].text);
    }
    applyNodeClasses();
    if (!running()) drawStatic();
  }

  function stopScenario(resetPanel) {
    if (!scenario) return;
    scenario = null;
    chips.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
    if (resetPanel) showDefaultPanel();
  }

  buttons.forEach(function (btn) {
    var id = btn.getAttribute("data-id");
    btn.addEventListener("click", function () { select(id); });
    btn.addEventListener("pointerenter", function () {
      if (selected || scenario) return;
      hovered = id; applyNodeClasses(); if (!running()) drawStatic();
    });
    btn.addEventListener("pointerleave", function () {
      if (hovered === id) { hovered = null; applyNodeClasses(); if (!running()) drawStatic(); }
    });
    btn.addEventListener("focus", function () {
      buttons.forEach(function (b) { b.tabIndex = b === btn ? 0 : -1; });
    });
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () { startScenario(chip.getAttribute("data-scenario")); });
  });

  // Arrow keys move to the nearest node in that direction (spatial roving focus).
  map.addEventListener("keydown", function (ev) {
    var cur = document.activeElement;
    if (!cur || !cur.classList.contains("hs-node")) return;
    var key = ev.key, from = nodes[cur.getAttribute("data-id")], best = null, bestScore = Infinity;
    if (key === "Escape") {
      if (selected || scenario) { stopScenario(true); selected = null; showDefaultPanel(); applyNodeClasses(); announce("Selection cleared."); if (!running()) drawStatic(); }
      return;
    }
    if (key === "Home" || key === "End") {
      best = nodes[buttons[key === "Home" ? 0 : buttons.length - 1].getAttribute("data-id")];
    } else {
      var dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
      if (!dir) return;
      // Prefer nodes inside a 45-degree cone in the arrow's direction; fall back to the nearest ahead.
      var fallback = null, fallbackScore = Infinity;
      Object.keys(nodes).forEach(function (id) {
        if (id === from.id) return;
        var n = nodes[id], dx = n.x - from.x, dy = n.y - from.y;
        var along = dx * dir[0] + dy * dir[1];
        if (along <= 4) return;
        var across = Math.abs(dx * dir[1] - dy * dir[0]);
        var score = along + across * 2;
        if (along >= across) {
          if (score < bestScore) { bestScore = score; best = n; }
        } else if (score < fallbackScore) { fallbackScore = score; fallback = n; }
      });
      if (!best) best = fallback;
    }
    if (best) { ev.preventDefault(); best.btn.focus(); }
  });

  // Pointer: magnetic dot grid + click-on-empty-space "ping".
  map.addEventListener("pointermove", function (ev) {
    var r = map.getBoundingClientRect();
    pointer.x = ev.clientX - r.left; pointer.y = ev.clientY - r.top; pointer.inside = true; touch();
  });
  map.addEventListener("pointerleave", function () { pointer.inside = false; touch(); if (!running()) drawStatic(); });
  map.addEventListener("click", function (ev) {
    if (ev.target.closest(".hs-node")) return;
    var r = map.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    var nearest = null, nd = Infinity;
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id], d = Math.hypot(n.x - x, n.y - y);
      if (d < nd) { nd = d; nearest = n; }
    });
    if (!running()) return;
    ripples.push({ x: x, y: y, t: 0 });
    if (nearest) {
      nearest.pulse = 1;
      edges.forEach(function (e) {
        if (e.a === nearest.id) spawnPacket(e, 1, 0, true);
        else if (e.b === nearest.id) spawnPacket(e, -1, 0, true);
      });
    }
  });

  motionToggle.addEventListener("click", function () {
    paused = !paused;
    syncMotionToggle();
    if (paused && scenario && !scenario.done) { scenario.done = true; renderSteps(); applyNodeClasses(); }
    if (running()) start(); else { stop(); drawStatic(); }
  });
  function syncMotionToggle() {
    motionToggle.setAttribute("aria-pressed", paused ? "true" : "false");
    motionToggle.textContent = paused ? "Play motion" : "Pause motion";
  }
  syncMotionToggle();

  reduceQuery.addEventListener("change", function (e) {
    reduced = e.matches; paused = reduced; syncMotionToggle();
    if (running()) start(); else { stop(); drawStatic(); }
  });

  /* ---------------- packets ---------------- */

  function forwardEdgesFrom(id) {
    return edges.filter(function (e) { return e.a === id && !e.lateral; });
  }
  function spawnPacket(e, dir, t, bright) {
    if (packets.length > 60) packets.shift();
    packets.push({ e: e, dir: dir, t: t || 0, speed: (bright ? 150 : 55 + Math.random() * 35), bright: !!bright, life: bright ? 1 : 0 });
  }
  function seedPackets() {
    packets = [];
    var count = compact ? 7 : 11;
    var inbound = edges.filter(function (e) { return nodes[e.a].tier === "in"; });
    for (var i = 0; i < count; i++) {
      spawnPacket(inbound[i % inbound.length], 1, Math.random(), false);
    }
  }
  function advancePacket(p, dt) {
    p.t += (p.speed * dt) / Math.max(p.e.len, 1);
    if (p.t < 1) return true;
    if (p.bright) return false; // burst dots end at the next node
    var end = p.dir === 1 ? p.e.b : p.e.a;
    var next = forwardEdgesFrom(end);
    if (next.length) {
      p.e = next[(Math.random() * next.length) | 0]; p.dir = 1; p.t = 0;
    } else {
      var inbound = edges.filter(function (e) { return nodes[e.a].tier === "in"; });
      p.e = inbound[(Math.random() * inbound.length) | 0]; p.dir = 1; p.t = 0;
    }
    return true;
  }

  /* ---------------- drawing ---------------- */

  function strokePath(e, from, to, dir) {
    var n = e.pts.length - 1;
    var a = Math.floor(from * n), b = Math.ceil(to * n);
    ctx.beginPath();
    for (var i = a; i <= b; i++) {
      var idx = dir === 1 ? i : n - i;
      var p = e.pts[idx];
      if (i === a) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }

  function drawGlow(x, y, size, alpha) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(glowSprite, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  function drawFrame(animated) {
    ctx.clearRect(0, 0, W, H);
    if (gridLayer.width) ctx.drawImage(gridLayer, 0, 0, W, H);

    // Magnetic grid: dots near the pointer bulge outward and brighten.
    if (animated && pointer.inside) {
      var R = 110;
      ctx.fillStyle = rgba(colors.signal, colors.light ? 0.55 : 0.8);
      var gx0 = Math.max(0, Math.floor((pointer.x - R) / GRID)), gx1 = Math.ceil((pointer.x + R) / GRID);
      var gy0 = Math.max(0, Math.floor((pointer.y - R) / GRID)), gy1 = Math.ceil((pointer.y + R) / GRID);
      for (var gy = gy0; gy <= gy1; gy++) {
        for (var gx = gx0; gx <= gx1; gx++) {
          var x = gx * GRID + GRID / 2, y = gy * GRID + GRID / 2;
          var dx = x - pointer.x, dy = y - pointer.y, d = Math.hypot(dx, dy);
          if (d > R || d < 0.01) continue;
          var k = 1 - d / R, push = k * k * 12;
          var s = 1.2 + k * 1.8;
          ctx.globalAlpha = k;
          ctx.fillRect(x + (dx / d) * push - s / 2, y + (dy / d) * push - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
    }

    var lit = litSet();

    // Base connections.
    ctx.lineCap = "round";
    edges.forEach(function (e) {
      var on = lit && lit.edges.has(e);
      if (on) return;
      ctx.strokeStyle = rgba(colors.signal, lit ? 0.1 : (colors.light ? 0.32 : 0.24));
      ctx.lineWidth = 1.25;
      strokePath(e, 0, 1, 1);
    });

    // Lit connections (selection, hover, or scenario progress).
    if (lit) {
      edges.forEach(function (e) {
        if (!lit.edges.has(e)) return;
        var full = true, from = 0, to = 1, dir = 1;
        if (scenario && !scenario.done) {
          var sc = SCENARIOS[scenario.key], st = sc.steps[scenario.step];
          st.hops.forEach(function (h) {
            var f = findEdge(h[0], h[1]);
            if (f && f.edge === e) { full = false; to = easeInOut(scenario.t); dir = f.dir; }
          });
        }
        ctx.strokeStyle = rgba(colors.accent, 0.9);
        ctx.lineWidth = 2.2;
        if (full) {
          strokePath(e, 0, 1, 1);
        } else {
          strokePath(e, from, to, dir);
          var head = pointAt(e, dir === 1 ? to : 1 - to);
          setBlend(true); drawGlow(head[0], head[1], 30, 1); setBlend(false);
        }
      });
    }

    // Core halos: soft ring with a slowly rotating arc.
    ["ai", "sw", "auto"].forEach(function (id, i) {
      var n = nodes[id];
      // Compact layout: halos hug the node so neighbours never overlap.
      var rx = compact ? n.w / 2 + 6 : Math.max(n.w, n.h) / 2 + 10;
      var ry = compact ? n.h / 2 + 6 : n.h / 2 + 10;
      var on = !lit || lit.nodes.has(id);
      ctx.strokeStyle = rgba(colors.signal, on ? 0.35 : 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(n.x, n.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      if (animated) {
        var a = clock * 0.6 + i * 2.1;
        ctx.strokeStyle = rgba(on && lit ? colors.accent : colors.signal, on ? 0.75 : 0.2);
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(n.x, n.y, rx, ry, 0, a, a + 0.9); ctx.stroke();
      }
    });

    // Node pulses (arrival / selection).
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      if (n.pulse <= 0) return;
      var k = 1 - n.pulse;
      ctx.strokeStyle = rgba(colors.accent, n.pulse * 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(n.x, n.y, n.w / 2 + 6 + k * 18, n.h / 2 + 6 + k * 18, 0, 0, Math.PI * 2); ctx.stroke();
    });

    // Moving dots.
    if (animated) {
      setBlend(true);
      packets.forEach(function (p) {
        var dim = lit && !lit.edges.has(p.e);
        var tt = p.dir === 1 ? p.t : 1 - p.t;
        for (var k = 4; k >= 0; k--) {
          var back = p.dir === 1 ? tt - k * 0.018 : tt + k * 0.018;
          if (back < 0 || back > 1) continue;
          var pt = pointAt(p.e, back);
          var al = (1 - k / 5) * (dim ? 0.15 : (p.bright ? 1 : 0.7));
          if (k === 0) { drawGlow(pt[0], pt[1], p.bright ? 26 : 18, al); }
          else {
            ctx.fillStyle = rgba(p.bright ? colors.accent : colors.signal, al * 0.6);
            ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.6 - k * 0.2, 0, Math.PI * 2); ctx.fill();
          }
        }
      });
      setBlend(false);

      ripples.forEach(function (r) {
        ctx.strokeStyle = rgba(colors.accent, (1 - r.t) * 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, 8 + r.t * 90, 0, Math.PI * 2); ctx.stroke();
      });
    }
  }

  function setBlend(on) {
    ctx.globalCompositeOperation = on && !colors.light ? "lighter" : "source-over";
  }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function drawStatic() { if (W) drawFrame(false); }

  /* ---------------- animation loop ---------------- */

  function running() { return !paused && visible && !document.hidden; }

  // Ambient motion runs at ~30 fps; interaction, scenarios and click effects get full frame rate.
  function isActive(now) {
    if (scenario && !scenario.done) return true;
    if (pointer.inside || ripples.length) return true;
    for (var i = 0; i < packets.length; i++) if (packets[i].bright) return true;
    return now - lastInteraction < 1200;
  }

  function tick(now) {
    rafId = 0;
    if (!running()) return;
    if (!isActive(now) && now - lastDraw < 31) { rafId = requestAnimationFrame(tick); return; }
    lastDraw = now;
    var dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;
    clock += dt;

    for (var i = packets.length - 1; i >= 0; i--) {
      if (!advancePacket(packets[i], dt)) packets.splice(i, 1);
    }
    for (var j = ripples.length - 1; j >= 0; j--) {
      ripples[j].t += dt * 1.4;
      if (ripples[j].t >= 1) ripples.splice(j, 1);
    }
    Object.keys(nodes).forEach(function (id) { var n = nodes[id]; if (n.pulse > 0) n.pulse = Math.max(0, n.pulse - dt * 1.6); });

    if (scenario && !scenario.done) {
      scenario.t += dt / 0.9;
      if (scenario.t >= 1) {
        var sc = SCENARIOS[scenario.key];
        sc.steps[scenario.step].hops.forEach(function (h) { nodes[h[1]].pulse = 1; });
        scenario.step += 1; scenario.t = 0;
        if (scenario.step >= sc.steps.length) {
          scenario.done = true;
        } else {
          announce("Step " + (scenario.step + 1) + ": " + sc.steps[scenario.step].text);
        }
        renderSteps();
        applyNodeClasses();
      }
    }

    drawFrame(true);
    rafId = requestAnimationFrame(tick);
  }
  function start() { if (!rafId) { lastTime = 0; rafId = requestAnimationFrame(tick); } }
  function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

  /* ---------------- lifecycle ---------------- */

  readColors();
  layout();

  if ("ResizeObserver" in window) {
    new ResizeObserver(function () { layout(); }).observe(map);
  } else {
    window.addEventListener("resize", layout);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (running()) start(); else stop();
    }).observe(map);
  }
  document.addEventListener("visibilitychange", function () { if (running()) start(); else stop(); });

  // Re-read colors when the site's theme engine switches themes.
  new MutationObserver(function () { readColors(); if (!running()) drawStatic(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if (running()) start();
})();
