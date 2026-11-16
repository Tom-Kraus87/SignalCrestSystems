"""Generate branded Signal Crest Systems LLC resource PDFs."""

from __future__ import annotations

import os
import tempfile
import time
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUTPUT = ROOT / "resources" / "pdfs"


def write_pdf(pdf: FPDF, dest: Path) -> None:
  """Write PDF via temp file + replace to survive OneDrive locks."""
  dest.parent.mkdir(parents=True, exist_ok=True)
  data = pdf.output()
  fd, tmp_name = tempfile.mkstemp(prefix=dest.stem + "-", suffix=".pdf", dir=str(dest.parent))
  os.close(fd)
  tmp_path = Path(tmp_name)
  last_err: OSError | None = None
  try:
    tmp_path.write_bytes(data)
    for attempt in range(8):
      try:
        os.replace(tmp_path, dest)
        return
      except OSError as err:
        last_err = err
        time.sleep(0.35 * (attempt + 1))
    raise OSError(f"Could not replace {dest}: {last_err}") from last_err
  finally:
    if tmp_path.exists():
      try:
        tmp_path.unlink()
      except OSError:
        pass

# Brand palette
BG = (12, 15, 20)
GOLD = (201, 162, 39)
GOLD_DARK = (138, 111, 26)
MUTED = (139, 151, 168)


def require_banner(path: Path) -> None:
    """Require the approved horizontal banner — never synthesize a gold-S fallback."""
    if path.exists():
        return
    raise FileNotFoundError(
        f"Missing approved banner at {path}. "
        "Place assets/logo-banner.png (from the approved horizontal brand banner) before generating PDFs."
    )


class BrandedPDF(FPDF):
  def __init__(self, title: str, subtitle: str):
    super().__init__()
    self.doc_title = title
    self.doc_subtitle = subtitle
    self.logo_path = ASSETS / "logo-banner.png"
    self.set_auto_page_break(auto=True, margin=22)
    self.set_margins(18, 18, 18)

  def header(self):
    if self.logo_path.exists():
      # Approved banner is ~3:1; keep modest width so the header stays compact.
      self.image(str(self.logo_path), x=18, y=8, w=78)
      self.set_y(36)
      rule_y = 34
    else:
      self.set_y(18)
      rule_y = 16
    self.set_draw_color(*GOLD)
    self.set_line_width(0.6)
    self.line(18, rule_y, self.w - 18, rule_y)
    self.ln(4)

  def footer(self):
    self.set_y(-16)
    self.set_font("Helvetica", "I", 8)
    self.set_text_color(*MUTED)
    self.cell(0, 8, f"Signal Crest Systems LLC  |  signalcrestsystems.com  |  Page {self.page_no()}", align="C")

  def add_cover_block(self):
    self.set_font("Helvetica", "B", 20)
    self.set_text_color(*BG)
    self.multi_cell(0, 10, self.doc_title)
    self.ln(2)
    self.set_font("Helvetica", "", 11)
    self.set_text_color(80, 90, 105)
    self.multi_cell(0, 6, self.doc_subtitle)
    self.ln(4)

  def section(self, heading: str):
    if self.get_y() > self.h - 40:
      self.add_page()
    self.ln(3)
    self.set_x(self.l_margin)
    self.set_font("Helvetica", "B", 13)
    self.set_text_color(*GOLD_DARK)
    self.multi_cell(0, 7, heading)
    self.ln(1)

  def body_text(self, text: str):
    self.set_font("Helvetica", "", 10)
    self.set_text_color(40, 48, 58)
    self.multi_cell(0, 5.5, text)
    self.ln(1)

  def bullet(self, text: str, bold_prefix: str = ""):
    if self.get_y() > self.h - 30:
      self.add_page()
    self.set_x(self.l_margin)
    self.set_font("Helvetica", "", 10)
    self.set_text_color(40, 48, 58)
    if bold_prefix:
      line = f"- {text}"
      self.multi_cell(0, 5.5, line)
    else:
      self.multi_cell(0, 5.5, f"- {text}")
    self.ln(0.5)

  def checkbox_item(self, text: str):
    if self.get_y() > self.h - 30:
      self.add_page()
    self.set_x(self.l_margin)
    self.set_font("Helvetica", "", 10)
    self.set_text_color(40, 48, 58)
    self.multi_cell(0, 5.5, f"[ ] {text}")


def build_leads_checklist() -> None:
  pdf = BrandedPDF(
    "Is Your Website Costing You Leads?",
    "10 warning signs your site may be outdated - and what each one costs you in lost business.",
  )
  pdf.add_page()
  pdf.add_cover_block()

  pdf.body_text(
    "Use this checklist to evaluate whether your current website is helping or hurting lead generation. "
    "If you check three or more items, it is likely time to modernize."
  )

  items = [
    ("1. Mobile layout breaks on phones", "Over half of visitors browse on mobile. Broken layouts increase bounce rates and reduce form submissions."),
    ("2. Page load takes more than 3 seconds", "Slow sites lose impatient buyers. Every extra second can reduce conversions."),
    ("3. No HTTPS / browser security warning", "Visitors distrust unsecured sites, especially for law, finance, and professional services."),
    ("4. Contact info is hard to find", "If phone, email, or booking takes more than two taps, you are losing ready-to-buy leads."),
    ("5. No clear call-to-action above the fold", "Visitors should immediately know what to do next: call, book, or request a quote."),
    ("6. Copyright date is years old", "An outdated footer signals neglect and makes your business look inactive."),
    ("7. Poor or missing Google visibility", "If you are not showing up for local searches, competitors are capturing your demand."),
    ("8. Forms do not work reliably", "Broken forms silently kill leads. Test submissions monthly."),
    ("9. Brand looks generic or template-heavy", "Trust drops when your site looks like every other DIY template."),
    ("10. Content does not match how you sell today", "Old services, staff, or offers create confusion and missed opportunities."),
  ]

  pdf.section("10 Warning Signs")
  for title, detail in items:
    pdf.bullet(f"{title}: {detail}", bold_prefix=f"{title}:")

  pdf.section("Next Step")
  pdf.body_text(
    "Signal Crest Systems LLC helps small and growing businesses rebuild sites for speed, trust, and conversions. "
    "Visit signalcrestsystems.com/packages or email tom@signalcrestsystems.com to discuss next steps."
  )
  write_pdf(pdf, OUTPUT / "website-leads-checklist.pdf")


def build_modernization_roadmap() -> None:
  pdf = BrandedPDF(
    "Website Modernization Roadmap",
    "A step-by-step plan to upgrade your site without downtime, budget surprises, or scope creep.",
  )
  pdf.add_page()
  pdf.add_cover_block()

  phases = [
    ("Phase 1: Audit (Week 1)", [
      "Inventory all pages, forms, integrations, and domains.",
      "Run speed, mobile, SSL, and SEO baseline checks.",
      "Identify must-keep content vs. content to retire.",
      "Document goals: leads, bookings, credibility, or all three.",
    ]),
    ("Phase 2: Plan (Week 1-2)", [
      "Define sitemap and page priorities.",
      "Choose build approach: refresh, rebuild, or migrate platform.",
      "Set budget range and timeline with clear milestones.",
      "Assign content owners for copy, photos, and approvals.",
    ]),
    ("Phase 3: Design & Build (Weeks 2-5)", [
      "Approve wireframes or layout direction early.",
      "Build mobile-first pages with clear CTAs.",
      "Integrate analytics, forms, and Google Business profile.",
      "Keep staging environment for review before launch.",
    ]),
    ("Phase 4: QA & Launch (Week 5-6)", [
      "Run full pre-launch QA checklist (forms, links, speed, security).",
      "Test on real phones and multiple browsers.",
      "Launch during low-traffic window with rollback plan.",
      "Submit sitemap and verify indexing after go-live.",
    ]),
    ("Phase 5: Post-Launch (Ongoing)", [
      "Monitor form delivery and analytics weekly for 30 days.",
      "Apply security and plugin updates (or use a care plan).",
      "Review conversion data and refine CTAs monthly.",
      "Schedule quarterly content and performance tune-ups.",
    ]),
  ]

  for heading, bullets in phases:
    pdf.section(heading)
    for item in bullets:
      pdf.bullet(item)

  pdf.section("Avoid Common Pitfalls")
  pdf.bullet("Do not launch without form testing on real devices.")
  pdf.bullet("Do not copy old broken structure into a new design.")
  pdf.bullet("Do not skip SSL, backups, and access documentation.")

  write_pdf(pdf, OUTPUT / "website-modernization-roadmap.pdf")


def build_five_things() -> None:
  pdf = BrandedPDF(
    "5 Things Every Small Business Site Needs",
    "Practical essentials for a site that builds trust and converts visitors into leads.",
  )
  pdf.add_page()
  pdf.add_cover_block()

  things = [
    ("1. Mobile-First Responsive Design", "Layout, buttons, and forms must work flawlessly on phones. Most local customers will find you on mobile first."),
    ("2. Clear Calls-to-Action", "Every key page should guide visitors to one primary action: call, book, or request a quote. Avoid competing CTAs."),
    ("3. Fast Load Times", "Aim for under 3 seconds on mobile. Compress images, minimize scripts, and use modern hosting."),
    ("4. HTTPS Everywhere", "SSL is non-negotiable for trust and SEO. Fix mixed-content warnings and renew certificates before expiry."),
    ("5. Working Contact Forms", "Test forms weekly. Confirm email delivery, spam filtering, and autoresponders so no lead is lost."),
  ]

  pdf.section("The Essentials")
  for title, detail in things:
    pdf.bullet(f"{detail}", bold_prefix="")

  pdf.section("Bonus: Trust Signals")
  pdf.bullet("Show real photos, client outcomes, certifications, and service area.")
  pdf.bullet("Keep content current: hours, team, services, and copyright year.")
  pdf.bullet("Add reviews or testimonials with permission.")

  write_pdf(pdf, OUTPUT / "5-things-small-business-site.pdf")


def build_qa_checklist() -> None:
  pdf = BrandedPDF(
    "Pre-Launch QA Checklist",
    "A 25-point website launch checklist you can use.",
  )
  pdf.add_page()
  pdf.add_cover_block()

  categories = {
    "Functionality (7 checks)": [
      "All internal links resolve correctly",
      "Contact forms submit and deliver",
      "Navigation works on every page",
      "Images load with proper alt text",
      "Buttons and CTAs link to correct destinations",
      "404 page displays for broken URLs",
      "Cross-browser testing (Chrome, Firefox, Safari, Edge)",
    ],
    "Performance (6 checks)": [
      "Page load time checked on mobile",
      "Images optimized and properly sized",
      "CSS and JS minified",
      "No render-blocking resources",
      "Lazy loading for below-fold images",
      "Core Web Vitals within Google thresholds",
    ],
    "Security (5 checks)": [
      "HTTPS enforced on all pages",
      "Security headers configured",
      "No mixed content warnings",
      "Form inputs sanitized against injection",
      "Dependencies checked for known vulnerabilities",
    ],
    "SEO (4 checks)": [
      "Unique title tags and meta descriptions",
      "Proper heading hierarchy (H1 to H6)",
      "Open Graph and social sharing tags",
      "XML sitemap and robots.txt configured",
    ],
    "Mobile & UX (3 checks)": [
      "Responsive layout at all breakpoints",
      "Touch targets meet minimum size (44px)",
      "Readable typography without zooming",
    ],
  }

  for category, items in categories.items():
    pdf.section(category)
    for item in items:
      pdf.checkbox_item(item)

  pdf.section("Sign-Off")
  pdf.body_text("Reviewed by: ______________________   Date: __________")
  pdf.body_text("Ready for launch:  [ ] Yes   [ ] No - fixes required")

  write_pdf(pdf, OUTPUT / "pre-launch-qa-checklist.pdf")


def main() -> None:
  OUTPUT.mkdir(parents=True, exist_ok=True)
  ASSETS.mkdir(parents=True, exist_ok=True)
  logo_path = ASSETS / "logo-banner.png"
  require_banner(logo_path)
  build_leads_checklist()
  build_modernization_roadmap()
  build_five_things()
  build_qa_checklist()
  print(f"Generated 4 PDFs in {OUTPUT} (branded with approved banner: {logo_path.name})")


if __name__ == "__main__":
  main()
