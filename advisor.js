/**
 * Signal Crest AI Solutions Advisor — Phase A (deterministic).
 * Rules-based guided qualification + knowledge-pack troubleshooting.
 * Not live conversational AI. No network LLM calls.
 */
(function (global) {
  "use strict";

  var HANDOFF_KEY = "scsAdvisorHandoff";
  var PRIVACY_VERSION = "advisor-privacy-2026-11-16";
  var FREE_ISSUE_LIMIT = 3;

  var SERVICE_LABELS = {
    "package-landing": "Website: Landing Page ($950)",
    "package-starter": "Website: Starter Business ($1,500)",
    "package-professional": "Website: Professional ($2,750)",
    "package-advanced": "Website: Advanced (from $5,000)",
    "custom-software": "Custom Software & Web Applications",
    "ai-automation": "AI Automation & Integrations",
    "it-consulting": "IT Consulting & Support ($110/hour)",
    cybersecurity: "Cybersecurity Guidance (custom quote)",
    "qa-automation": "Quality Assurance & Software Testing ($90/hour)",
    "care-plan": "Website Care Plan ($79 / $149 / $349 mo)",
    "local-seo": "Local SEO ($475/month)",
    other: "Discovery consultation / something else",
  };

  var ALLOWED_SERVICES = Object.keys(SERVICE_LABELS);

  var PROJECT_TYPES = [
    { id: "website", label: "Website" },
    { id: "custom_software", label: "Custom software / app" },
    { id: "ai_automation", label: "AI automation" },
    { id: "it_cyber", label: "IT / cyber" },
    { id: "qa_seo_care", label: "QA / SEO / care" },
    { id: "not_sure", label: "Not sure" },
  ];

  var PRIMARY_NEEDS = [
    { id: "new_build", label: "New build" },
    { id: "improve", label: "Improve existing" },
    { id: "automate", label: "Automate workflow" },
    { id: "local_seo", label: "Get found locally" },
    { id: "stabilize_it", label: "Stabilize IT/security" },
    { id: "testing", label: "Testing quality" },
    { id: "not_sure", label: "Not sure" },
  ];

  var STAGES = [
    { id: "exploring", label: "Exploring" },
    { id: "ready", label: "Ready to scope" },
    { id: "in_progress", label: "In progress" },
    { id: "live", label: "Live / maintain" },
    { id: "not_sure", label: "Not sure" },
  ];

  var TIMINGS = [
    { id: "asap", label: "ASAP" },
    { id: "1-3mo", label: "1–3 months" },
    { id: "3-6mo", label: "3–6 months" },
    { id: "flexible", label: "Flexible" },
    { id: "discuss", label: "Prefer discuss live" },
  ];

  var DETAIL_BY_TYPE = {
    website: [
      { id: "landing", label: "Landing page" },
      { id: "starter", label: "Starter / multi-page" },
      { id: "professional", label: "Professional / broader marketing" },
      { id: "advanced", label: "Advanced / complex" },
      { id: "care", label: "Website care plan" },
      { id: "not_sure", label: "Not sure" },
    ],
    it_cyber: [
      { id: "it", label: "IT consulting & support" },
      { id: "cyber", label: "Cybersecurity guidance" },
      { id: "not_sure", label: "Not sure" },
    ],
    qa_seo_care: [
      { id: "qa", label: "QA / testing" },
      { id: "seo", label: "Local SEO" },
      { id: "care", label: "Website care" },
      { id: "not_sure", label: "Not sure" },
    ],
    custom_software: [
      { id: "any", label: "Continue" },
      { id: "not_sure", label: "Not sure yet" },
    ],
    ai_automation: [
      { id: "any", label: "Continue" },
      { id: "not_sure", label: "Not sure yet" },
    ],
    not_sure: [{ id: "skip", label: "Continue to timing" }],
  };

  var OS_CHIPS = [
    { id: "windows", label: "Windows" },
    { id: "macos", label: "macOS" },
    { id: "ios", label: "iOS" },
    { id: "android", label: "Android" },
    { id: "other", label: "Other / unsure" },
  ];

  var DEVICE_CHIPS = [
    { id: "laptop", label: "Laptop" },
    { id: "desktop", label: "Desktop" },
    { id: "phone", label: "Phone / tablet" },
    { id: "printer", label: "Printer" },
    { id: "router", label: "Router / network gear" },
    { id: "other", label: "Other" },
  ];

  var SECRET_RE =
    /(password|passwd|passphrase|mfa|otp|one[-\s]?time|auth(?:entication)?\s*code|recovery\s*key|backup\s*code|seed\s*phrase|private\s*key|api\s*key|ssn|social\s*security)/i;

  function createState() {
    return {
      mode: null,
      screen: "welcome",
      answers: {},
      recommendation: null,
      brief: "",
      contact: { name: "", email: "", company: "" },
      consent: false,
      tech: {
        creditsUsed: 0,
        activeIssueId: null,
        stepIndex: 0,
        context: {},
        history: [],
        awaitingConfirm: false,
      },
    };
  }

  /** R3.1 project-type-first PRIMARY mapping */
  function recommendPrimary(answers) {
    var pt = answers.project_type;
    var detail = answers.detail;

    if (answers.human_exit) return { service: "other", display: SERVICE_LABELS.other, rationale: "human_exit" };
    if (!pt || pt === "not_sure") return { service: "other", display: SERVICE_LABELS.other, rationale: "unclear_type" };

    if (pt === "website") {
      if (detail === "care") return { service: "care-plan", display: SERVICE_LABELS["care-plan"], rationale: "website_care" };
      if (detail === "landing") return { service: "package-landing", display: SERVICE_LABELS["package-landing"], rationale: "website_landing" };
      if (detail === "starter") return { service: "package-starter", display: SERVICE_LABELS["package-starter"], rationale: "website_starter" };
      if (detail === "professional") return { service: "package-professional", display: SERVICE_LABELS["package-professional"], rationale: "website_pro" };
      if (detail === "advanced") return { service: "package-advanced", display: SERVICE_LABELS["package-advanced"], rationale: "website_adv" };
      return { service: "other", display: SERVICE_LABELS.other, rationale: "website_discovery" };
    }

    if (pt === "custom_software") {
      return { service: "custom-software", display: SERVICE_LABELS["custom-software"], rationale: "project_type_software" };
    }
    if (pt === "ai_automation") {
      return { service: "ai-automation", display: SERVICE_LABELS["ai-automation"], rationale: "project_type_ai" };
    }
    if (pt === "it_cyber") {
      if (detail === "cyber") return { service: "cybersecurity", display: SERVICE_LABELS.cybersecurity, rationale: "it_cyber_cyber" };
      if (detail === "it") return { service: "it-consulting", display: SERVICE_LABELS["it-consulting"], rationale: "it_cyber_it" };
      return { service: "other", display: SERVICE_LABELS.other, rationale: "it_cyber_unresolved" };
    }
    if (pt === "qa_seo_care") {
      if (detail === "care") return { service: "care-plan", display: SERVICE_LABELS["care-plan"], rationale: "qsc_care" };
      if (detail === "seo") return { service: "local-seo", display: SERVICE_LABELS["local-seo"], rationale: "qsc_seo" };
      if (detail === "qa") return { service: "qa-automation", display: SERVICE_LABELS["qa-automation"], rationale: "qsc_qa" };
      return { service: "other", display: SERVICE_LABELS.other, rationale: "qsc_unresolved" };
    }

    return { service: "other", display: SERVICE_LABELS.other, rationale: "fallback" };
  }

  function secondarySuggestions(answers, primary) {
    var out = [];
    if (answers.primary_need === "local_seo" && primary.service !== "local-seo") {
      out.push("Local SEO may also help if visibility is a goal.");
    }
    if (answers.primary_need === "testing" && primary.service !== "qa-automation") {
      out.push("QA testing can be scoped alongside the primary engagement.");
    }
    if (answers.primary_need === "stabilize_it" && primary.service !== "it-consulting" && primary.service !== "cybersecurity") {
      out.push("IT Consulting or Cybersecurity Guidance can stabilize operations.");
    }
    return out;
  }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label;
    }
    return id || "—";
  }

  function buildBrief(state) {
    var a = state.answers;
    var rec = state.recommendation || recommendPrimary(a);
    var lines = [
      "PROJECT BRIEF (DRAFT)",
      "Generated by Signal Crest Guided Solutions Advisor (Phase A — rules-based, not live AI).",
      "",
      "Recommended starting point: " + rec.display,
      "Published pricing reference only — not a quote or guarantee.",
      "",
      "Project type: " + labelOf(PROJECT_TYPES, a.project_type),
      "Primary need: " + labelOf(PRIMARY_NEEDS, a.primary_need),
      "Stage: " + labelOf(STAGES, a.stage),
      "Detail: " + (a.detail ? String(a.detail) : "—"),
      "Timing: " + labelOf(TIMINGS, a.timing),
    ];
    if (a.notes) lines.push("Visitor notes: " + a.notes);
    var sec = secondarySuggestions(a, rec);
    if (sec.length) {
      lines.push("");
      lines.push("Secondary suggestions (do not override primary):");
      sec.forEach(function (s) {
        lines.push("- " + s);
      });
    }
    if (state.tech.history.length) {
      lines.push("");
      lines.push("Troubleshooting session notes:");
      state.tech.history.forEach(function (h, idx) {
        lines.push((idx + 1) + ". " + h.label + " — " + (h.outcome || "in progress") + (h.os ? " (" + h.os + ")" : ""));
      });
    }
    lines.push("");
    lines.push("Next step: human review via project request after explicit consent.");
    return lines.join("\n");
  }

  function buildTechSummary(state) {
    if (!state.tech.history.length && !state.tech.activeIssueId) {
      return "No troubleshooting topics recorded in this session.";
    }
    var lines = ["TROUBLESHOOTING SUMMARY (DRAFT)", "Phase A guided knowledge pack — not live AI.", ""];
    state.tech.history.forEach(function (h, idx) {
      lines.push((idx + 1) + ". " + h.label);
      lines.push("   Outcome: " + (h.outcome || "unresolved"));
      if (h.os) lines.push("   OS: " + h.os);
      if (h.device) lines.push("   Device: " + h.device);
    });
    if (state.tech.activeIssueId) {
      var topic = findTopic(state.tech.activeIssueId);
      lines.push("");
      lines.push("Active topic: " + (topic ? topic.label : state.tech.activeIssueId));
      lines.push("Step index: " + state.tech.stepIndex);
    }
    lines.push("");
    lines.push("Recommended professional route: IT Consulting & Support ($110/hour) unless security-focused.");
    return lines.join("\n");
  }

  function findTopic(id) {
    var topics = KB.troubleshooting.topics;
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].id === id) return topics[i];
    }
    return null;
  }

  var KB = {
    troubleshooting: { freeIssueLimit: FREE_ISSUE_LIMIT, topics: [] },
  };

  function hydrateKb(json) {
    if (!json) return;
    KB = json;
    if (KB.privacyVersion) PRIVACY_VERSION = KB.privacyVersion;
    if (KB.troubleshooting && KB.troubleshooting.freeIssueLimit) {
      FREE_ISSUE_LIMIT = KB.troubleshooting.freeIssueLimit;
    }
  }

  function creditsRemaining(state) {
    return Math.max(0, FREE_ISSUE_LIMIT - state.tech.creditsUsed);
  }

  function classifySecret(text) {
    return SECRET_RE.test(String(text || ""));
  }

  /* ---------- Pure engine API (testable) ---------- */

  var Engine = {
    createState: createState,
    recommendPrimary: recommendPrimary,
    secondarySuggestions: secondarySuggestions,
    buildBrief: buildBrief,
    buildTechSummary: buildTechSummary,
    creditsRemaining: creditsRemaining,
    classifySecret: classifySecret,
    ALLOWED_SERVICES: ALLOWED_SERVICES,
    SERVICE_LABELS: SERVICE_LABELS,
    FREE_ISSUE_LIMIT: FREE_ISSUE_LIMIT,
    HANDOFF_KEY: HANDOFF_KEY,
    PRIVACY_VERSION: PRIVACY_VERSION,
    hydrateKb: hydrateKb,
    getKb: function () {
      return KB;
    },
    startIssue: function (state, topicId) {
      if (state.tech.activeIssueId) {
        return { ok: false, reason: "active_issue" };
      }
      if (state.tech.creditsUsed >= FREE_ISSUE_LIMIT) {
        return { ok: false, reason: "soft_cap" };
      }
      var topic = findTopic(topicId);
      if (!topic) return { ok: false, reason: "unknown_topic" };
      state.tech.creditsUsed += 1;
      state.tech.activeIssueId = topicId;
      state.tech.stepIndex = 0;
      state.tech.awaitingConfirm = false;
      state.tech.context = {};
      state.screen = "tech_context";
      return { ok: true, topic: topic, remaining: creditsRemaining(state) };
    },
    completeIssue: function (state, outcome) {
      var topic = findTopic(state.tech.activeIssueId);
      if (topic) {
        state.tech.history.push({
          id: topic.id,
          label: topic.label,
          outcome: outcome || "closed",
          os: state.tech.context.os,
          device: state.tech.context.device,
        });
      }
      state.tech.activeIssueId = null;
      state.tech.stepIndex = 0;
      state.tech.awaitingConfirm = false;
      if (state.tech.creditsUsed >= FREE_ISSUE_LIMIT) {
        state.screen = "tech_softcap";
      } else {
        state.screen = "tech_pick";
      }
    },
    writeHandoff: function (payload) {
      var data = {
        flag: true,
        service: payload.service,
        brief: payload.brief || "",
        name: payload.name || "",
        email: payload.email || "",
        company: payload.company || "",
        source: "advisor",
        privacyVersion: PRIVACY_VERSION,
      };
      try {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(data));
      } catch (e) {
        /* private mode */
      }
      return data;
    },
    readHandoff: function () {
      try {
        var raw = sessionStorage.getItem(HANDOFF_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || !data.flag) return null;
        return data;
      } catch (e) {
        return null;
      }
    },
    clearHandoff: function () {
      try {
        sessionStorage.removeItem(HANDOFF_KEY);
      } catch (e) {
        /* ignore */
      }
    },
  };

  /* ---------- UI ---------- */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function chipButton(label, onClick, opts) {
    opts = opts || {};
    return el(
      "button",
      {
        type: "button",
        className: "adv-chip" + (opts.primary ? " is-primary" : "") + (opts.selected ? " is-selected" : ""),
        onClick: onClick,
      },
      [label]
    );
  }

  function mountAdvisor(root) {
    if (!root) return;

    var state = createState();
    var live = $("#adv-live", root) || el("div", { id: "adv-live", className: "visually-hidden", "aria-live": "polite" });
    if (!live.parentNode) root.appendChild(live);

    function announce(msg) {
      live.textContent = "";
      setTimeout(function () {
        live.textContent = msg;
      }, 20);
    }

    function setScreen(name) {
      state.screen = name;
      render();
    }

    function humanHandoff(prefillService) {
      state.answers.human_exit = true;
      state.recommendation = { service: prefillService || "other", display: SERVICE_LABELS[prefillService || "other"], rationale: "human_exit" };
      state.brief = state.mode === "tech" ? buildTechSummary(state) : buildBrief(state);
      setScreen("brief");
    }

    function chromeActions(extra) {
      var bar = el("div", { className: "adv-actions" });
      bar.appendChild(
        chipButton("Talk to a human", function () {
          humanHandoff(state.mode === "tech" ? "it-consulting" : "other");
        })
      );
      (extra || []).forEach(function (b) {
        bar.appendChild(b);
      });
      return bar;
    }

    function renderSidebar() {
      var side = $("#adv-sidebar", root);
      if (!side) return;
      side.innerHTML = "";
      side.appendChild(el("p", { className: "adv-kicker", text: "Signal Crest Systems LLC" }));
      side.appendChild(el("h1", { className: "adv-title", id: "adv-heading", text: "AI Solutions Advisor" }));
      side.appendChild(
        el("p", {
          className: "adv-disclosure",
          text: "Guided · rules-based · deterministic — not live conversational AI.",
        })
      );

      if (state.mode === "commercial") {
        var steps = ["Project type", "Primary need", "Stage", "Detail", "Timing", "Review"];
        var stepIndex = commercialStepIndex();
        var list = el("ol", { className: "adv-stepper", "aria-label": "Qualification progress" });
        steps.forEach(function (label, i) {
          var li = el("li", {
            className: "adv-step" + (i === stepIndex ? " is-current" : "") + (i < stepIndex ? " is-done" : ""),
          });
          li.appendChild(el("span", { className: "adv-step-num", text: String(i + 1) }));
          li.appendChild(el("span", { className: "adv-step-label", text: label }));
          list.appendChild(li);
        });
        side.appendChild(list);
        var summary = el("div", { className: "adv-summary-rail", "aria-label": "Answers so far" });
        if (state.answers.project_type) {
          summary.appendChild(el("p", { text: "Project type: " + labelOf(PROJECT_TYPES, state.answers.project_type) }));
        }
        if (state.answers.primary_need) {
          summary.appendChild(el("p", { text: "Primary need: " + labelOf(PRIMARY_NEEDS, state.answers.primary_need) }));
        }
        if (state.answers.stage) {
          summary.appendChild(el("p", { text: "Stage: " + labelOf(STAGES, state.answers.stage) }));
        }
        side.appendChild(summary);
      }

      if (state.mode === "tech") {
        side.appendChild(
          el("p", {
            className: "adv-credit",
            text: "Free troubleshooting topics remaining: " + creditsRemaining(state) + " of " + FREE_ISSUE_LIMIT,
          })
        );
        if (state.tech.history.length) {
          var hist = el("ul", { className: "adv-history" });
          state.tech.history.forEach(function (h) {
            hist.appendChild(el("li", { text: h.label + " — " + (h.outcome || "closed") }));
          });
          side.appendChild(hist);
        }
      }

      side.appendChild(el("p", { className: "adv-tip", text: "Tip: Tab to move, Enter to select." }));
    }

    function commercialStepIndex() {
      if (state.screen === "q_project") return 0;
      if (state.screen === "q_need") return 1;
      if (state.screen === "q_stage") return 2;
      if (state.screen === "q_detail") return 3;
      if (state.screen === "q_timing") return 4;
      return 5;
    }

    function cardShell(stepLabel, title, bodyNodes, footerNodes) {
      var card = el("section", { className: "adv-card", "aria-labelledby": "adv-q" });
      if (stepLabel) card.appendChild(el("p", { className: "adv-step-meta", text: stepLabel }));
      card.appendChild(el("h2", { id: "adv-q", className: "adv-question", text: title }));
      bodyNodes.forEach(function (n) {
        card.appendChild(n);
      });
      if (footerNodes && footerNodes.length) {
        var foot = el("div", { className: "adv-card-foot" });
        footerNodes.forEach(function (n) {
          foot.appendChild(n);
        });
        card.appendChild(foot);
      }
      return card;
    }

    function renderWelcome() {
      var chips = el("div", { className: "adv-chip-list", role: "group", "aria-label": "Advisor modes" });
      chips.appendChild(
        chipButton("Help Me Fix Something", function () {
          state.mode = "tech";
          setScreen("tech_pick");
        }, { primary: true })
      );
      chips.appendChild(
        chipButton("Find a Business Solution", function () {
          state.mode = "commercial";
          setScreen("q_project");
        }, { primary: true })
      );
      chips.appendChild(
        chipButton("Talk to a human", function () {
          state.mode = "commercial";
          humanHandoff("other");
        })
      );
      return cardShell(
        null,
        "How can we help?",
        [
          el("p", {
            className: "adv-lead",
            text: "Choose technical troubleshooting or business qualification. Pricing comes only from published packages. Nothing is sent without your consent.",
          }),
          chips,
        ],
        []
      );
    }

    function pickList(options, onPick) {
      var wrap = el("div", { className: "adv-chip-list", role: "listbox", "aria-label": "Choices" });
      options.forEach(function (opt) {
        wrap.appendChild(
          chipButton(opt.label, function () {
            onPick(opt.id);
          })
        );
      });
      return wrap;
    }

    function renderCommercial() {
      if (state.screen === "q_project") {
        return cardShell("Step 1 of 6", "What are you exploring?", [
          pickList(PROJECT_TYPES, function (id) {
            state.answers.project_type = id;
            delete state.answers.detail;
            setScreen("q_need");
          }),
        ], [chromeActions([
          chipButton("Not sure", function () {
            state.answers.project_type = "not_sure";
            setScreen("q_need");
          }),
        ])]);
      }
      if (state.screen === "q_need") {
        return cardShell("Step 2 of 6", "What outcome matters most?", [
          pickList(PRIMARY_NEEDS, function (id) {
            state.answers.primary_need = id;
            setScreen("q_stage");
          }),
        ], [chromeActions([
          chipButton("Back", function () {
            setScreen("q_project");
          }),
        ])]);
      }
      if (state.screen === "q_stage") {
        return cardShell("Step 3 of 6", "Where are you now?", [
          pickList(STAGES, function (id) {
            state.answers.stage = id;
            setScreen("q_detail");
          }),
        ], [chromeActions([
          chipButton("Back", function () {
            setScreen("q_need");
          }),
        ])]);
      }
      if (state.screen === "q_detail") {
        var details = DETAIL_BY_TYPE[state.answers.project_type] || DETAIL_BY_TYPE.not_sure;
        return cardShell("Step 4 of 6", "Which detail fits best?", [
          pickList(details, function (id) {
            state.answers.detail = id;
            setScreen("q_timing");
          }),
        ], [chromeActions([
          chipButton("Back", function () {
            setScreen("q_stage");
          }),
          chipButton("Not sure", function () {
            state.answers.detail = "not_sure";
            setScreen("q_timing");
          }),
        ])]);
      }
      if (state.screen === "q_timing") {
        return cardShell("Step 5 of 6", "Timing?", [
          pickList(TIMINGS, function (id) {
            state.answers.timing = id;
            state.recommendation = recommendPrimary(state.answers);
            state.brief = buildBrief(state);
            setScreen("recommend");
          }),
        ], [chromeActions([
          chipButton("Back", function () {
            setScreen("q_detail");
          }),
        ])]);
      }
      if (state.screen === "recommend") {
        var rec = state.recommendation || recommendPrimary(state.answers);
        state.recommendation = rec;
        var body = [
          el("p", { className: "adv-lead", text: "Starting point (not a quote): " + rec.display }),
          el("p", {
            className: "adv-muted",
            text: "Published package floors only — see packages.html. Custom software is quoted after discovery.",
          }),
        ];
        secondarySuggestions(state.answers, rec).forEach(function (s) {
          body.push(el("p", { className: "adv-secondary", text: s }));
        });
        var chips = el("div", { className: "adv-chip-list" });
        chips.appendChild(
          chipButton("Edit project brief", function () {
            state.brief = buildBrief(state);
            setScreen("brief");
          }, { primary: true })
        );
        chips.appendChild(
          chipButton("Explain pricing for this recommendation", function () {
            setScreen("pricing");
          })
        );
        body.push(chips);
        return cardShell("Step 6 of 6", "Recommended path", body, [
          chromeActions([
            chipButton("Back", function () {
              setScreen("q_timing");
            }),
            chipButton("Edit answers", function () {
              setScreen("q_project");
            }),
          ]),
        ]);
      }
      if (state.screen === "pricing") {
        var r = state.recommendation || recommendPrimary(state.answers);
        return cardShell(null, "Published pricing reference", [
          el("p", { text: r.display }),
          el("p", {
            className: "adv-muted",
            text: "Website packages: $950 / $1,500 / $2,750 / from $5,000. Basic automation from $1,500; AI workflow from $5,000. IT $110/hr; QA $90/hr; Care $79/$149/$349 mo; Local SEO $475/mo; Cyber custom quote. No invented prices.",
          }),
          el("p", null, [
            el("a", { href: "packages.html", text: "Open full pricing page" }),
          ]),
          chipButton("Back to recommendation", function () {
            setScreen("recommend");
          }),
        ], [chromeActions([])]);
      }
      return renderBrief();
    }

    function renderTech() {
      if (state.screen === "tech_pick") {
        if (creditsRemaining(state) <= 0 && !state.tech.activeIssueId) {
          setScreen("tech_softcap");
          return renderTech();
        }
        var topics = (KB.troubleshooting && KB.troubleshooting.topics) || [];
        var list = el("div", { className: "adv-chip-list" });
        topics.forEach(function (t) {
          list.appendChild(
            chipButton(t.label, function () {
              var res = Engine.startIssue(state, t.id);
              if (!res.ok) {
                if (res.reason === "soft_cap") setScreen("tech_softcap");
                else announce("Could not start that topic.");
                render();
                return;
              }
              announce("Started topic. " + creditsRemaining(state) + " free topics remaining.");
              render();
            })
          );
        });
        list.appendChild(
          chipButton("Find a business solution instead", function () {
            state.mode = "commercial";
            setScreen("q_project");
          })
        );
        return cardShell(
          "Technical support",
          "What should we work through?",
          [
            el("p", {
              className: "adv-lead",
              text: "Up to three free troubleshooting topics this session. Follow-ups on the same topic do not use another credit. We never ask for passwords or MFA codes.",
            }),
            el("p", {
              className: "adv-credit",
              text: "Free troubleshooting topics remaining: " + creditsRemaining(state) + " of " + FREE_ISSUE_LIMIT,
            }),
            list,
          ],
          [chromeActions([])]
        );
      }

      if (state.screen === "tech_context") {
        var topic = findTopic(state.tech.activeIssueId);
        var needOs = topic && topic.context && topic.context.indexOf("os") !== -1;
        var needDevice = topic && topic.context && topic.context.indexOf("device") !== -1;
        var nodes = [
          el("p", { className: "adv-lead", text: topic ? topic.label : "Topic" }),
        ];
        if (needOs && !state.tech.context.os) {
          nodes.push(el("p", { text: "Which operating system?" }));
          nodes.push(
            pickList(OS_CHIPS, function (id) {
              state.tech.context.os = id;
              render();
            })
          );
          return cardShell("Context", "A little context first", nodes, [chromeActions([])]);
        }
        if (needDevice && !state.tech.context.device) {
          nodes.push(el("p", { text: "What kind of device?" }));
          nodes.push(
            pickList(DEVICE_CHIPS, function (id) {
              state.tech.context.device = id;
              state.screen = "tech_step";
              render();
            })
          );
          return cardShell("Context", "A little context first", nodes, [chromeActions([])]);
        }
        state.screen = "tech_step";
        return renderTech();
      }

      if (state.screen === "tech_step") {
        var t = findTopic(state.tech.activeIssueId);
        if (!t) {
          setScreen("tech_pick");
          return renderTech();
        }
        var step = t.steps[state.tech.stepIndex] || t.steps[t.steps.length - 1];
        var body = [
          el("p", { className: "adv-step-meta", text: "Step " + (state.tech.stepIndex + 1) + " of " + t.steps.length }),
          el("h3", { className: "adv-step-title", text: step.title }),
          el("pre", { className: "adv-step-body", text: step.body }),
        ];
        if (state.tech.context.os) {
          body.push(el("p", { className: "adv-muted", text: "Noted OS: " + state.tech.context.os }));
        }
        var actions = el("div", { className: "adv-chip-list" });
        actions.appendChild(
          chipButton("That worked — next", function () {
            if (state.tech.stepIndex >= t.steps.length - 1) {
              Engine.completeIssue(state, "resolved");
              announce("Topic marked resolved.");
            } else {
              state.tech.stepIndex += 1;
            }
            render();
          }, { primary: true })
        );
        actions.appendChild(
          chipButton("I don’t see that option", function () {
            state.screen = "tech_alternate";
            render();
          })
        );
        actions.appendChild(
          chipButton("Still stuck — escalate", function () {
            Engine.completeIssue(state, "escalated");
            state.recommendation = {
              service: t.serviceHint || "it-consulting",
              display: SERVICE_LABELS[t.serviceHint || "it-consulting"],
              rationale: "tech_escalate",
            };
            state.brief = buildTechSummary(state);
            setScreen("brief");
          })
        );
        actions.appendChild(
          chipButton("This is a different problem", function () {
            Engine.completeIssue(state, "switched");
            render();
          })
        );
        body.push(actions);
        body.push(
          el("p", {
            className: "adv-muted",
            text: "Follow-ups on this same topic do not consume another free credit. " + (t.escalateWhen || ""),
          })
        );
        return cardShell("Guided troubleshooting", t.label, body, [chromeActions([])]);
      }

      if (state.screen === "tech_alternate") {
        var altTopic = findTopic(state.tech.activeIssueId);
        return cardShell("Alternate path", "Try this instead", [
          el("p", { className: "adv-lead", text: altTopic ? altTopic.alternate : "Try the Settings search for the feature name." }),
          el("p", {
            className: "adv-warn",
            text: "Before any factory reset, disk wipe, or security-software disable: confirm you have backups and understand the risk. This advisor never executes actions on your device.",
          }),
          chipButton("Back to steps", function () {
            state.screen = "tech_step";
            render();
          }, { primary: true }),
        ], [chromeActions([])]);
      }

      if (state.screen === "tech_softcap") {
        var soft = el("div", { className: "adv-chip-list" });
        soft.appendChild(
          chipButton("Build optional summary", function () {
            state.recommendation = {
              service: "it-consulting",
              display: SERVICE_LABELS["it-consulting"],
              rationale: "soft_cap",
            };
            state.brief = buildTechSummary(state);
            setScreen("brief");
          }, { primary: true })
        );
        soft.appendChild(
          chipButton("Request IT help", function () {
            state.recommendation = {
              service: "it-consulting",
              display: SERVICE_LABELS["it-consulting"],
              rationale: "soft_cap_pro",
            };
            state.brief = buildTechSummary(state);
            setScreen("brief");
          })
        );
        soft.appendChild(
          chipButton("Find a business solution", function () {
            state.mode = "commercial";
            setScreen("q_project");
          })
        );
        return cardShell("Free topics used", "Three free troubleshooting topics are used", [
          el("p", {
            className: "adv-lead",
            text: "You can save a summary and request professional IT help. We do not hard-stop an active walkthrough mid-issue; new topics need a specialist path.",
          }),
          soft,
        ], [chromeActions([])]);
      }

      return renderBrief();
    }

    function renderBrief() {
      if (!state.brief) {
        state.brief = state.mode === "tech" ? buildTechSummary(state) : buildBrief(state);
      }
      if (!state.recommendation) {
        state.recommendation =
          state.mode === "tech"
            ? { service: "it-consulting", display: SERVICE_LABELS["it-consulting"], rationale: "tech_default" }
            : recommendPrimary(state.answers);
      }

      var ta = el("textarea", {
        className: "adv-brief",
        id: "adv-brief-field",
        rows: "14",
        "aria-label": "Editable project brief",
      });
      ta.value = state.brief;
      ta.addEventListener("input", function () {
        state.brief = ta.value;
      });

      var name = el("input", {
        type: "text",
        id: "adv-name",
        className: "adv-input",
        autocomplete: "name",
        "aria-label": "Name",
      });
      name.value = state.contact.name;
      name.addEventListener("input", function () {
        state.contact.name = name.value;
      });

      var email = el("input", {
        type: "email",
        id: "adv-email",
        className: "adv-input",
        autocomplete: "email",
        "aria-label": "Email",
      });
      email.value = state.contact.email;
      email.addEventListener("input", function () {
        state.contact.email = email.value;
      });

      var company = el("input", {
        type: "text",
        id: "adv-company",
        className: "adv-input",
        autocomplete: "organization",
        "aria-label": "Company (optional)",
      });
      company.value = state.contact.company;
      company.addEventListener("input", function () {
        state.contact.company = company.value;
      });

      var consent = el("input", {
        type: "checkbox",
        id: "adv-consent",
        className: "adv-consent-input",
      });
      consent.checked = !!state.consent;
      consent.addEventListener("change", function () {
        state.consent = consent.checked;
        syncSend();
      });

      var consentLabel = el("label", { className: "adv-consent-label", for: "adv-consent" });
      consentLabel.appendChild(consent);
      consentLabel.appendChild(
        document.createTextNode(
          " I agree to send this project brief and my contact details to Signal Crest Systems LLC so they can follow up. See the "
        )
      );
      consentLabel.appendChild(el("a", { href: "privacy.html", text: "Privacy Policy" }));
      consentLabel.appendChild(
        document.createTextNode(". I can email tom@signalcrestsystems.com instead.")
      );

      var send = el("button", {
        type: "button",
        className: "adv-send btn btn-primary",
        id: "adv-send",
        disabled: "disabled",
        text: "Continue to project request",
      });

      function syncSend() {
        if (state.consent) {
          send.removeAttribute("disabled");
          send.classList.remove("is-disabled");
        } else {
          send.setAttribute("disabled", "disabled");
          send.classList.add("is-disabled");
        }
      }
      syncSend();

      send.addEventListener("click", function () {
        if (!state.consent) {
          announce("Consent is required before transmitting.");
          return;
        }
        if (classifySecret(state.brief) || classifySecret(name.value) || classifySecret(email.value)) {
          announce("Remove passwords or authentication codes before continuing. Rotate any secret you may have pasted.");
          return;
        }
        var service = state.recommendation.service;
        if (ALLOWED_SERVICES.indexOf(service) === -1) service = "other";
        Engine.writeHandoff({
          service: service,
          brief: state.brief,
          name: state.contact.name.trim(),
          email: state.contact.email.trim(),
          company: state.contact.company.trim(),
        });
        var url =
          "project-request.html?service=" +
          encodeURIComponent(service) +
          "&source=advisor";
        window.location.href = url;
      });

      return cardShell("Review and send", "Editable project brief", [
        el("p", {
          className: "adv-lead",
          text: "Edit freely. Nothing is transmitted until you consent and continue to the project request form.",
        }),
        el("p", { className: "adv-muted", text: "Recommended service: " + state.recommendation.display }),
        ta,
        el("div", { className: "adv-fields" }, [
          el("label", { className: "adv-field-label", for: "adv-name", text: "Name" }),
          name,
          el("label", { className: "adv-field-label", for: "adv-email", text: "Email" }),
          email,
          el("label", { className: "adv-field-label", for: "adv-company", text: "Company (optional)" }),
          company,
        ]),
        consentLabel,
        send,
        el("p", {
          className: "adv-muted",
          text: "Send stays disabled until consent is checked. Handoff uses the existing project-request form.",
        }),
      ], [
        chromeActions([
          chipButton("Start over", function () {
            state = createState();
            setScreen("welcome");
          }),
        ]),
      ]);
    }

    function render() {
      renderSidebar();
      var main = $("#adv-main", root);
      if (!main) return;
      main.innerHTML = "";
      var view;
      if (state.screen === "welcome") view = renderWelcome();
      else if (state.mode === "tech") view = renderTech();
      else if (state.mode === "commercial") view = renderCommercial();
      else view = renderWelcome();
      main.appendChild(view);
      var focusTarget = main.querySelector("h2, h3, .adv-question");
      if (focusTarget) {
        try {
          focusTarget.setAttribute("tabindex", "-1");
          focusTarget.focus({ preventScroll: true });
        } catch (e) {
          /* ignore */
        }
      }
    }

    // Deep-link: ?mode=tech|commercial
    try {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("mode");
      if (mode === "tech") {
        state.mode = "tech";
        state.screen = "tech_pick";
      } else if (mode === "commercial" || mode === "business") {
        state.mode = "commercial";
        state.screen = "q_project";
      }
    } catch (e) {
      /* ignore */
    }

    render();
    return {
      getState: function () {
        return state;
      },
      render: render,
    };
  }

  function boot() {
    var root = document.getElementById("advisor-app");
    if (!root) return;

    function start(json) {
      hydrateKb(json);
      Engine.FREE_ISSUE_LIMIT = FREE_ISSUE_LIMIT;
      mountAdvisor(root);
    }

    // Embedded fallback KB (matches advisor-kb.json troubleshooting topics minimally if fetch fails)
    var embedded = null;
    try {
      var tag = document.getElementById("advisor-kb-data");
      if (tag && tag.textContent) embedded = JSON.parse(tag.textContent);
    } catch (e) {
      embedded = null;
    }

    fetch("advisor-kb.json", { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("kb");
        return r.json();
      })
      .then(start)
      .catch(function () {
        start(
          embedded || {
            troubleshooting: {
              freeIssueLimit: 3,
              topics: [
                {
                  id: "wifi",
                  label: "Wi‑Fi keeps dropping",
                  serviceHint: "it-consulting",
                  context: ["os", "device"],
                  steps: [
                    { title: "Confirm the basics", body: "Check other devices, move closer to the router, toggle Wi‑Fi." },
                    { title: "Restart the path", body: "Restart device and router; wait two minutes." },
                    { title: "Forget and rejoin", body: "Forget the network in OS settings, then reconnect. Do not share passwords here." },
                  ],
                  alternate: "Search Settings for Wi‑Fi. Avoid factory reset unless you understand the risk.",
                  escalateWhen: "Office-wide issues need IT Consulting.",
                },
              ],
            },
          }
        );
      });
  }

  global.SCSAdvisor = {
    Engine: Engine,
    boot: boot,
    recommendPrimary: recommendPrimary,
    buildBrief: buildBrief,
    SERVICE_LABELS: SERVICE_LABELS,
    ALLOWED_SERVICES: ALLOWED_SERVICES,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
