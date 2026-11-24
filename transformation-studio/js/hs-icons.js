/* Line icons for services and UI. Presentation attributes only (CSP-safe). */
const svg = (body, vb = 48, sw = 2.2) => '<svg viewBox="0 0 ' + vb + " " + vb + '" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg>";

export const ICONS = {
  deck: svg('<path d="M6 22h36"/><path d="M6 28h36"/><path d="M10 22v18M24 22v18M38 22v18"/><path d="M8 14l16-6 16 6"/>'),
  paint: svg('<rect x="8" y="6" width="26" height="12" rx="3"/><path d="M34 12h4v10H22v6"/><rect x="19" y="28" width="6" height="14" rx="2"/>'),
  floor: svg('<rect x="6" y="6" width="36" height="36" rx="3"/><path d="M6 18h36M6 30h36M18 6v12M30 18v12M18 30v12"/>'),
  fence: svg('<path d="M10 42V12l4-5 4 5v30M22 42V12l4-5 4 5v30M34 42V12l4-5 4 5v30"/><path d="M6 20h38M6 34h38"/>'),
  gutter: svg('<path d="M4 20l20-14 20 14"/><path d="M6 24h36v5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/><path d="M38 33v9"/><path d="M14 38c0 2 2 3 2 3M22 38c0 2 2 3 2 3"/>'),
  drywall: svg('<rect x="6" y="6" width="36" height="36" rx="2"/><path d="M18 18l4 6-5 4 6 6"/><path d="M28 14l3 4"/>'),
  bath: svg('<path d="M6 24h36v6a10 10 0 0 1-10 10H16A10 10 0 0 1 6 30z"/><path d="M12 24V12a4 4 0 0 1 8 0"/><path d="M14 40l-2 4M34 40l2 4"/>'),
  house: svg('<path d="M6 22L24 8l18 14"/><path d="M10 19v23h28V19"/><rect x="20" y="28" width="8" height="14"/>'),
  oak: svg('<path d="M24 44V28"/><path d="M24 28c-9 0-15-5-15-12 0-5 4-9 8-9 2-3 5-4 7-4s5 1 7 4c4 0 8 4 8 9 0 7-6 12-15 12z"/><path d="M24 28l-6-6M24 24l6-6"/>', 48, 2.4),
  check: svg('<path d="M10 25l9 9 19-20"/>', 48, 4),
  close: svg('<path d="M12 12l24 24M36 12L12 36"/>', 48, 3.5),
  chat: svg('<path d="M8 10h32v22H18l-10 8z"/><path d="M16 20h16M16 26h10"/>', 48, 3),
  calendar: svg('<rect x="6" y="10" width="36" height="32" rx="4"/><path d="M6 20h36M16 6v8M32 6v8"/>', 48, 3),
  ruler: svg('<path d="M6 32L32 6l10 10-26 26z"/><path d="M14 24l4 4M20 18l3 3M26 12l4 4"/>', 48, 3),
  phone: svg('<path d="M14 6l6 10-4 4a24 24 0 0 0 12 12l4-4 10 6-4 8C22 42 6 26 6 10z"/>', 48, 3),
  shield: svg('<path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z"/><path d="M17 24l5 5 9-10"/>', 48, 3),
  star: svg('<path d="M24 6l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>', 48, 2.6),
  arrow: svg('<path d="M10 24h28M28 14l10 10-10 10"/>', 48, 3.5)
};
export const serviceIcon = id => ICONS[{ deck: "deck", painting: "paint", flooring: "floor", fence: "fence", gutters: "gutter", drywall: "drywall", bath: "bath", maintenance: "house" }[id] || "house"];
