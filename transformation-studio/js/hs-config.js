/*
  Home Services Transformation Studio: industry configuration.
  Everything here is fictional demonstration data, including every rate and range.
  Swap this file to build another edition; other modules read only from this config.
*/

export const BUSINESS = {
  name: "Stone Harbor Tradeworks",
  short: "Stone Harbor",
  type: "Coastal Trade Contracting",
  tagline: "Coastal remodeling and skilled trades",
  phone: "(555) 010-0288",
  email: "office@stoneharbor-tradeworks.example",
  area: "Cape May County (demo concept)",
  domain: "stoneharbor-tradeworks.example",
  disclosure: "Concept preview only. Stone Harbor Tradeworks is a demonstration brand for Signal Crest’s Website Transformation Studio pilot. Services, rates, people, dates and records are sample data — not a live client site."
};

/*
  Sample estimating rules (fictional). Money is in cents.
  unit: "area" (length x width, sq ft), "linear" (feet) or "count".
  rate: [low, high] per unit. options: one choice multiplies the rate.
  conditions: optional extras. kind "fixed" adds a range, "perUnit" adds a range per unit, "percent" scales the subtotal.
*/
export const SERVICES = [
  {
    id: "deck", name: "Deck building", group: "Outdoor", icon: "deck",
    summary: "New decks and full deck replacements.",
    includes: ["Design walkthrough", "Permits coordinated", "Framing, decking and railings"],
    unit: "area", unitLabel: "sq ft", dims: { length: 16, width: 12 }, rate: [3500, 6000],
    optionLabel: "Decking material",
    options: [
      { id: "pt", label: "Pressure-treated wood", mult: 1, note: "Wood treated to resist rot and insects. Lowest upfront cost; needs sealing every few years." },
      { id: "cedar", label: "Cedar", mult: 1.3, note: "Natural wood that resists decay and looks warm. Needs periodic staining." },
      { id: "composite", label: "Composite", mult: 1.6, note: "Made from wood fibers and plastic. Costs more upfront, needs very little maintenance." }
    ],
    conditions: [
      { id: "stairs", label: "Stairs to the yard", kind: "fixed", add: [60000, 120000] },
      { id: "removal", label: "Remove an existing deck", kind: "perUnit", add: [400, 800] }
    ]
  },
  {
    id: "painting", name: "Interior painting", group: "Indoor", icon: "paint",
    summary: "Walls, ceilings and trim, room by room.",
    includes: ["Furniture moved and covered", "Patch small holes", "Two coats"],
    unit: "area", unitLabel: "sq ft of floor", dims: { length: 14, width: 12 }, rate: [300, 600],
    optionLabel: "Paint quality",
    options: [
      { id: "standard", label: "Standard paint", mult: 1, note: "Good coverage for most rooms." },
      { id: "premium", label: "Premium scrubbable paint", mult: 1.25, note: "Holds up to cleaning; good for kitchens, kids' rooms and hallways." }
    ],
    conditions: [
      { id: "ceilings", label: "Ceilings over 9 ft", kind: "percent", add: [15, 15] },
      { id: "repairs", label: "Wall repairs before painting", kind: "fixed", add: [20000, 60000] }
    ]
  },
  {
    id: "flooring", name: "Flooring installation", group: "Indoor", icon: "floor",
    summary: "Vinyl plank, hardwood and tile floors.",
    includes: ["Subfloor check", "Trim reinstalled", "Debris removal"],
    unit: "area", unitLabel: "sq ft", dims: { length: 15, width: 12 }, rate: [600, 1200],
    optionLabel: "Flooring type",
    options: [
      { id: "lvp", label: "Luxury vinyl plank (LVP)", mult: 1, note: "Waterproof planks that look like wood. Durable and budget-friendly." },
      { id: "tile", label: "Porcelain tile", mult: 1.4, note: "Very durable and water-resistant; best for kitchens and baths." },
      { id: "hardwood", label: "Hardwood", mult: 1.6, note: "Solid wood that can be refinished many times. Not ideal for wet areas." }
    ],
    conditions: [
      { id: "tearout", label: "Remove existing flooring", kind: "perUnit", add: [150, 300] },
      { id: "stairs", label: "Include a staircase", kind: "fixed", add: [80000, 160000] }
    ]
  },
  {
    id: "fence", name: "Fence installation", group: "Outdoor", icon: "fence",
    summary: "Privacy, picket and decorative fencing.",
    includes: ["Property line review", "Post holes set in concrete", "Cleanup"],
    unit: "linear", unitLabel: "linear ft", dims: { feet: 120 }, rate: [2500, 4500],
    optionLabel: "Fence material",
    options: [
      { id: "wood", label: "Wood privacy", mult: 1, note: "Classic look, lower cost; needs staining." },
      { id: "vinyl", label: "Vinyl", mult: 1.3, note: "No painting needed; cleans with a hose." },
      { id: "aluminum", label: "Aluminum", mult: 1.6, note: "Decorative and rust-free; open style, not for privacy." }
    ],
    conditions: [
      { id: "gate", label: "Add a walk gate", kind: "fixed", add: [30000, 70000] },
      { id: "slope", label: "Sloped or rocky ground", kind: "percent", add: [10, 10] }
    ]
  },
  {
    id: "gutters", name: "Gutter cleaning & guards", group: "Maintenance", icon: "gutter",
    summary: "Clear gutters and keep them clear.",
    includes: ["Downspouts flushed", "Photo report", "Debris bagged"],
    unit: "linear", unitLabel: "linear ft of gutter", dims: { feet: 150 }, rate: [100, 200],
    optionLabel: "Service level",
    options: [
      { id: "clean", label: "Cleaning only", mult: 1, note: "A one-time clean of gutters and downspouts." },
      { id: "guards", label: "Cleaning plus mesh guards", mult: 4, note: "Mesh covers keep leaves out so gutters need less cleaning." }
    ],
    conditions: [
      { id: "twostory", label: "Two-story home", kind: "percent", add: [30, 30] }
    ]
  },
  {
    id: "drywall", name: "Drywall repair", group: "Indoor", icon: "drywall",
    summary: "Holes, cracks and water-damaged patches.",
    includes: ["Patch and sand", "Texture blended", "Primer coat"],
    unit: "count", unitLabel: "patches", dims: { count: 3 }, rate: [15000, 30000],
    optionLabel: "Patch size",
    options: [
      { id: "small", label: "Small (fist-sized or smaller)", mult: 1, note: "Quick patch with mesh and joint compound." },
      { id: "large", label: "Large (needs a new drywall piece)", mult: 1.8, note: "A new piece is cut in and finished to blend with the wall." }
    ],
    conditions: [
      { id: "texture", label: "Match wall texture", kind: "fixed", add: [10000, 25000] }
    ]
  },
  {
    id: "bath", name: "Bathroom refresh", group: "Indoor", icon: "bath",
    summary: "New vanity, fixtures, paint and lighting.",
    includes: ["Fixture selection help", "Plumbing fixtures swapped", "Paint and caulk"],
    unit: "count", unitLabel: "bathrooms", dims: { count: 1 }, rate: [600000, 1200000],
    optionLabel: "Finish level",
    options: [
      { id: "basic", label: "Basic refresh", mult: 1, note: "Keeps the layout; updates surfaces and fixtures." },
      { id: "mid", label: "Mid-range update", mult: 1.5, note: "Adds a new vanity, tile accents and upgraded fixtures." }
    ],
    conditions: [
      { id: "fan", label: "Add or replace an exhaust fan", kind: "fixed", add: [30000, 60000] }
    ]
  },
  {
    id: "maintenance", name: "Seasonal maintenance", group: "Maintenance", icon: "house",
    summary: "Preventive checkups before each season.",
    includes: ["Filter change", "Caulk and weatherstrip check", "Written checklist"],
    unit: "count", unitLabel: "visits", dims: { count: 2 }, rate: [18000, 32000],
    optionLabel: "Home size",
    options: [
      { id: "std", label: "Under 2,000 sq ft", mult: 1, note: "Typical single-family home." },
      { id: "large", label: "2,000 sq ft or more", mult: 1.4, note: "More systems and rooms to check." }
    ],
    conditions: [
      { id: "gutters", label: "Include gutter check", kind: "fixed", add: [5000, 10000] }
    ]
  }
];

export const UPGRADES = [
  {
    id: "website", letter: "A", title: "Modern Website",
    summary: "Premium responsive site with service pages, clear calls to action and mobile-first layout.",
    customerFacing: ["Responsive website with service pages", "Clear calls to request estimates and visits"],
    operational: [],
    benefits: ["Homeowners understand services before they call", "Looks credible on phones, where most visitors arrive", "Every page leads to a next step"],
    simulated: "Services, photos and copy are sample content for a fictional company."
  },
  {
    id: "estimates", letter: "B", title: "Instant Sample Estimates",
    summary: "Homeowners choose a service, enter dimensions and materials, and see a preliminary sample range.",
    customerFacing: ["Guided estimate builder with dimensions, materials and conditions", "Preliminary sample ranges clearly labeled as not a quote", "Estimate requests submitted online"],
    operational: ["Structured estimate requests with project details"],
    benefits: ["Sets realistic expectations before a site visit", "Requests arrive with measurements and choices", "Fewer phone calls to collect basic details"],
    simulated: "All rates are fictional sample data. A real build would use your own pricing rules. Nothing is sent."
  },
  {
    id: "scheduling", letter: "C", title: "Online Scheduling",
    summary: "Visitors pick an available site-visit window; staff confirm it.",
    customerFacing: ["Online appointment requests with available time windows"],
    operational: ["Appointments synchronized with the operations schedule", "Staff confirmation before visits are final"],
    benefits: ["Book visits outside office hours", "No double booking of the same window", "The schedule updates as soon as a request arrives"],
    simulated: "Availability is generated sample data. No calendar is connected and nothing is booked."
  },
  {
    id: "assistant", letter: "D", title: "AI Project Assistant",
    summary: "Beginner-friendly guided discovery that asks clarifying questions and explains options in plain language.",
    customerFacing: ["Guided project discovery with clarifying questions", "Plain-language explanations of materials and options"],
    operational: ["Discovery answers prefill the estimate request"],
    benefits: ["Homeowners who don't know the terms still get started", "Requests arrive better described", "Answers common questions at any hour"],
    simulated: "Guided, pre-written responses based on this demo's service list. Not connected to a live language model."
  },
  {
    id: "automation", letter: "E", title: "Workflow Automation",
    summary: "Requests move from lead to follow-up with human approval at the estimate and scheduling steps.",
    customerFacing: [],
    operational: ["Automatic lead qualification", "Human approval checkpoints for estimates and scheduling", "Activity history for every project", "Simulated follow-up and review requests"],
    benefits: ["Every lead gets the same next steps", "Nothing reaches a customer without staff approval", "A clear record of who did what and when"],
    simulated: "Workflow steps, notifications and follow-ups are simulated. No email, SMS or external system is used."
  },
  {
    id: "operations", letter: "F", title: "Contractor Operations",
    summary: "Leads, estimate pipeline, job schedule, project status, tasks and customer records in one place.",
    customerFacing: [],
    operational: ["Lead management and estimate pipeline", "Job and visit schedule", "Project status and task management", "Customer records"],
    benefits: ["See every lead and job in one place", "Know what's scheduled this week", "Status changes stay in sync with the workflow"],
    simulated: "Records are fictional or created by you in this demo, and are cleared on reset or reload."
  }
];

export const STAGES = [
  { id: "lead", label: "Lead received", detail: "The request arrives from the website with the service, measurements and preferences." },
  { id: "qualify", label: "Qualification", detail: "Rules check the service area, project size and details, then set a priority." },
  { id: "review", label: "Estimate review", detail: "A person checks the sample range and project details before anything is sent.", human: true },
  { id: "schedule", label: "Scheduling", detail: "A person confirms the site visit or job date before it is final.", human: true },
  { id: "job", label: "Job in progress", detail: "The crew completes the work; tasks are checked off." },
  { id: "follow", label: "Complete & follow-up", detail: "A thank-you and review request is prepared. In this demo it is simulated and never sent." }
];

// `done` = completed stages. The current stage index is `done` (capped).
export const STATUSES = {
  "new": { label: "New lead", done: 1 },
  "qualified": { label: "Qualified", done: 2 },
  "review": { label: "Estimate review", done: 2 },
  "changes": { label: "Changes requested", done: 2 },
  "approved": { label: "Estimate approved", done: 3 },
  "scheduled": { label: "Scheduled", done: 4 },
  "in-progress": { label: "In progress", done: 4 },
  "completed": { label: "Completed", done: 5 },
  "follow-up": { label: "Follow-up sent (simulated)", done: 6 }
};
export const STATUS_ORDER = ["new", "qualified", "review", "changes", "approved", "scheduled", "in-progress", "completed", "follow-up"];

export const PIPELINE_COLUMNS = [
  { id: "leads", label: "New leads", statuses: ["new", "qualified"] },
  { id: "review", label: "Estimate review", statuses: ["review", "changes"] },
  { id: "approved", label: "Approved", statuses: ["approved"] },
  { id: "scheduled", label: "Scheduled", statuses: ["scheduled"] },
  { id: "active", label: "In progress", statuses: ["in-progress"] },
  { id: "done", label: "Completed", statuses: ["completed", "follow-up"] }
];

export const RECORD_TYPES = { estimate: "Estimate request", visit: "Site visit request" };

// Sample availability: business days from today, four windows a day.
export const SLOTS = ["8–10 am", "10 am–12 pm", "1–3 pm", "3–5 pm"];
export const SCHEDULE_DAYS = 8;

export const SAMPLE_CUSTOMER = { name: "Dana Whitfield", email: "dana.whitfield@example.com", phone: "(555) 010-0177" };

// Verified against contact.html (Nov 2026): approved values only. Connected contractor platforms are custom builds.
export const CONTACT_ROUTE = { path: "../project-request.html", service: "custom-software" };

export const INTEGRATIONS_TO_DISCOVER = [
  "Current calendar or field-service scheduling tool",
  "Accounting software for estimates and invoices",
  "Payment processor for deposits",
  "Email or SMS provider for customer updates",
  "Existing customer list or CRM",
  "Photo storage for job-site documentation"
];

/* Seeded fictional records. dayOffset counts business days from today. */
export const SEED_RECORDS = [
  { id: "HP-2041", type: "estimate", status: "completed", hoursAgo: 240, service: "fence", inputs: { feet: 140, option: "vinyl", conditions: ["gate"] },
    customer: { name: "Marcus Bell", email: "marcus.bell@example.com", phone: "(555) 010-0121" }, appointment: { dayOffset: -3, slot: 0, kind: "job", confirmed: true } },
  { id: "HP-2042", type: "estimate", status: "in-progress", hoursAgo: 120, service: "flooring", inputs: { length: 18, width: 14, option: "lvp", conditions: ["tearout"] },
    customer: { name: "Priya Shah", email: "priya.shah@example.com", phone: "(555) 010-0132" }, appointment: { dayOffset: 0, slot: 0, kind: "job", confirmed: true } },
  { id: "HP-2043", type: "visit", status: "scheduled", hoursAgo: 50, service: "bath", inputs: { count: 1, option: "mid", conditions: ["fan"] },
    customer: { name: "Elena Garza", email: "elena.garza@example.com", phone: "(555) 010-0143" }, appointment: { dayOffset: 1, slot: 2, kind: "site visit", confirmed: true } },
  { id: "HP-2044", type: "estimate", status: "approved", hoursAgo: 30, service: "painting", inputs: { length: 16, width: 14, option: "premium", conditions: ["repairs"] },
    customer: { name: "Tom Okafor", email: "tom.okafor@example.com", phone: "(555) 010-0154" } },
  { id: "HP-2045", type: "estimate", status: "review", hoursAgo: 9, service: "gutters", inputs: { feet: 180, option: "guards", conditions: ["twostory"] },
    customer: { name: "Grace Lindholm", email: "grace.lindholm@example.com", phone: "(555) 010-0165" } },
  { id: "HP-2046", type: "visit", status: "new", hoursAgo: 2, service: "drywall", inputs: { count: 2, option: "large", conditions: [] },
    customer: { name: "Sam Rivera", email: "sam.rivera@example.com", phone: "(555) 010-0176" }, appointment: { dayOffset: 2, slot: 1, kind: "site visit", confirmed: false } }
];
export const FIRST_VISITOR_ID = 2047;

/* Guided discovery for the project assistant (Upgrade D). */
export const DISCOVERY = {
  start: {
    text: "Hi! I can help you figure out what your project needs, even if you're not sure what it's called. What would you like to work on?",
    chips: [
      { label: "Outdoor deck", topic: "deck" }, { label: "Floors", topic: "flooring" }, { label: "Walls or paint", topic: "walls" },
      { label: "Bathroom", topic: "bath" }, { label: "Fence or yard", topic: "fence" }, { label: "Gutters or upkeep", topic: "upkeep" }
    ]
  },
  topics: {
    deck: { service: "deck", questions: [
      { id: "state", text: "Do you have a deck there now?", chips: [{ label: "No, it's a new deck", set: {} }, { label: "Yes, replace it", set: { addCondition: "removal" } }] },
      { id: "size", text: "Roughly how big? Pacing it off is fine.", chips: [{ label: "Small, about 10 × 12 ft", set: { length: 12, width: 10 } }, { label: "Medium, about 16 × 12 ft", set: { length: 16, width: 12 } }, { label: "Large, about 20 × 16 ft", set: { length: 20, width: 16 } }] },
      { id: "care", text: "How much upkeep are you OK with?", chips: [{ label: "Lowest cost, some upkeep", set: { option: "pt" } }, { label: "Natural wood look", set: { option: "cedar" } }, { label: "Almost no upkeep", set: { option: "composite" } }] },
      { id: "stairs", text: "Will the deck need stairs down to the yard?", chips: [{ label: "Yes, add stairs", set: { addCondition: "stairs" } }, { label: "No stairs", set: {} }] }
    ] },
    flooring: { service: "flooring", questions: [
      { id: "room", text: "Which room is it for?", chips: [{ label: "Kitchen or bathroom", set: { option: "tile", wet: true } }, { label: "Living room or bedroom", set: { option: "lvp" } }, { label: "Want real wood", set: { option: "hardwood" } }] },
      { id: "size", text: "About how big is the room?", chips: [{ label: "About 10 × 12 ft", set: { length: 12, width: 10 } }, { label: "About 15 × 12 ft", set: { length: 15, width: 12 } }, { label: "About 20 × 15 ft", set: { length: 20, width: 15 } }] },
      { id: "old", text: "Is there old flooring to pull up first?", chips: [{ label: "Yes, remove it", set: { addCondition: "tearout" } }, { label: "No, it's bare", set: {} }] }
    ] },
    walls: { service: "painting", alt: "drywall", questions: [
      { id: "issue", text: "Is the wall damaged, or does it just need fresh paint?", chips: [{ label: "Holes or cracks", set: { switchTo: "drywall" } }, { label: "Just needs paint", set: {} }] },
      { id: "size", text: "About how big is the room's floor?", chips: [{ label: "About 12 × 10 ft", set: { length: 12, width: 10 } }, { label: "About 14 × 12 ft", set: { length: 14, width: 12 } }, { label: "About 20 × 16 ft", set: { length: 20, width: 16 } }] },
      { id: "use", text: "Does the room get a lot of wear, like a hallway or kids' room?", chips: [{ label: "Yes, lots of wear", set: { option: "premium" } }, { label: "Normal use", set: { option: "standard" } }] }
    ] },
    drywall: { service: "drywall", questions: [
      { id: "count", text: "How many damaged spots are there?", chips: [{ label: "One or two", set: { count: 2 } }, { label: "Three to five", set: { count: 4 } }] },
      { id: "size", text: "How big is the biggest one?", chips: [{ label: "Fist-sized or smaller", set: { option: "small" } }, { label: "Bigger than a fist", set: { option: "large" } }] },
      { id: "texture", text: "Is the wall smooth, or does it have a bumpy texture?", chips: [{ label: "Bumpy texture", set: { addCondition: "texture" } }, { label: "Smooth", set: {} }] }
    ] },
    bath: { service: "bath", questions: [
      { id: "scope", text: "Do you want to keep the current layout?", chips: [{ label: "Keep layout, refresh surfaces", set: { option: "basic" } }, { label: "Keep layout, new vanity and tile accents", set: { option: "mid" } }] },
      { id: "fan", text: "Does the bathroom stay steamy or smell musty after showers?", chips: [{ label: "Yes, it does", set: { addCondition: "fan" } }, { label: "No", set: {} }] }
    ] },
    fence: { service: "fence", questions: [
      { id: "goal", text: "What's the fence mainly for?", chips: [{ label: "Privacy", set: { option: "wood" } }, { label: "Privacy, no painting ever", set: { option: "vinyl" } }, { label: "Looks and keeping pets in", set: { option: "aluminum" } }] },
      { id: "length", text: "About how long will it be? A typical backyard is 100 to 150 ft.", chips: [{ label: "About 80 ft", set: { feet: 80 } }, { label: "About 120 ft", set: { feet: 120 } }, { label: "About 180 ft", set: { feet: 180 } }] },
      { id: "gate", text: "Do you need a walk-through gate?", chips: [{ label: "Yes, add a gate", set: { addCondition: "gate" } }, { label: "No gate", set: {} }] }
    ] },
    upkeep: { service: "gutters", alt: "maintenance", questions: [
      { id: "kind", text: "Is this about gutters, or general seasonal upkeep?", chips: [{ label: "Gutters overflow or clog", set: {} }, { label: "General seasonal checkup", set: { switchTo: "maintenance" } }] },
      { id: "story", text: "Is the home one story or two?", chips: [{ label: "One story", set: {} }, { label: "Two stories", set: { addCondition: "twostory" } }] },
      { id: "guards", text: "Would you like guards so gutters clog less often?", chips: [{ label: "Yes, add guards", set: { option: "guards" } }, { label: "Just a cleaning", set: { option: "clean" } }] }
    ] },
    maintenance: { service: "maintenance", questions: [
      { id: "visits", text: "How many visits a year? Most homes do spring and fall.", chips: [{ label: "Two visits", set: { count: 2 } }, { label: "Four visits", set: { count: 4 } }] },
      { id: "size", text: "How big is the home?", chips: [{ label: "Under 2,000 sq ft", set: { option: "std" } }, { label: "2,000 sq ft or more", set: { option: "large" } }] }
    ] }
  },
  glossary: [
    { re: /\blvp\b|vinyl plank/, text: "LVP stands for luxury vinyl plank: waterproof planks printed to look like wood. It's durable, comfortable underfoot and usually costs less than hardwood." },
    { re: /pressure.?treated/, text: "Pressure-treated wood has preservatives forced into it so it resists rot and insects. It's the most affordable deck lumber but should be sealed every couple of years." },
    { re: /composite/, text: "Composite decking is made from wood fibers and recycled plastic. It costs more upfront but doesn't need staining or sealing." },
    { re: /drywall|sheetrock/, text: "Drywall is the panel material most interior walls are made of. Small holes are patched with mesh and compound; bigger damage needs a new piece cut in." },
    { re: /gutter guard|guards?\b/, text: "Gutter guards are mesh or covers over your gutters that let water in but keep most leaves out, so gutters need cleaning less often." },
    { re: /estimate|quote|price|cost/, text: "The estimate tool shows a preliminary sample range based on your measurements and choices. In this demo the rates are fictional. A real price always comes after a site visit." },
    { re: /permit/, text: "Some projects, like many decks and fences, need a local permit. The contractor usually handles the paperwork; rules vary by town." }
  ]
};
