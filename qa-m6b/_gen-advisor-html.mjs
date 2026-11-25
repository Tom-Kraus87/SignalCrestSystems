import fs from "node:fs";

const base = fs.readFileSync("project-request.html", "utf8");
const headerMatch = base.match(/<header class="site-header"[\s\S]*?<\/header>/);
const footerMatch = base.match(/<footer class="site-footer"[\s\S]*?<\/footer>/);
if (!headerMatch || !footerMatch) {
  console.error("parse fail");
  process.exit(1);
}

let header = headerMatch[0];
if (!header.includes("advisor.html")) {
  header = header.replace(
    '<li><a href="contact.html">Contact</a></li>',
    '<li><a href="contact.html">Contact</a></li>\n          <li><a href="advisor.html" class="is-active" aria-current="page">Guided Advisor</a></li>'
  );
  header = header.replace(
    `<a href="project-request.html">Start a Project</a>
                  <span aria-hidden="true">·</span>
                  <a href="contact.html">Contact</a>`,
    `<a href="project-request.html">Start a Project</a>
                  <span aria-hidden="true">·</span>
                  <a href="advisor.html">Guided Advisor</a>
                  <span aria-hidden="true">·</span>
                  <a href="contact.html">Contact</a>`
  );
  // Remove is-active from Start a Project CTA if present
  header = header.replace(
    '<a href="project-request.html" class="nav-cta is-active">Start a Project</a>',
    '<a href="project-request.html" class="nav-cta">Start a Project</a>'
  );
}

let footer = footerMatch[0];
if (!footer.includes("advisor.html")) {
  footer = footer.replace(
    '<a href="privacy.html">Privacy</a>',
    '<a href="advisor.html">Guided Advisor</a>\n        <a href="privacy.html">Privacy</a>'
  );
}

// Reuse font/theme head fragment from project-request
const fontLink = base.match(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+" rel="stylesheet">/)[0];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <script src="theme-boot.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Guided Solutions Advisor for Signal Crest Systems LLC — deterministic technical troubleshooting and business qualification. Not live conversational AI.">
  <title>AI Solutions Advisor | Signal Crest Systems LLC</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Signal Crest Systems LLC">
  <meta property="og:title" content="AI Solutions Advisor | Signal Crest Systems LLC">
  <meta property="og:description" content="Guided Solutions Advisor — rules-based help for troubleshooting and project qualification. Not live conversational AI.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="AI Solutions Advisor | Signal Crest Systems LLC">
  <meta name="twitter:description" content="Guided Solutions Advisor — rules-based help for troubleshooting and project qualification. Not live conversational AI.">
  <link rel="icon" href="assets/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon.png">
  <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fontLink}
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="themes.css">
  <link rel="stylesheet" href="advisor.css">
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
${header}
  <main id="main">
    <section class="adv-page" aria-labelledby="adv-heading">
      <div class="container">
        <p class="adv-banner" role="note">Deterministic guided advisor (Phase A). Not live conversational AI. Pricing cited only from published packages. No credentials requested.</p>
        <div id="advisor-app" class="adv-shell">
          <aside id="adv-sidebar" class="adv-sidebar" aria-label="Advisor progress"></aside>
          <div id="adv-main" class="adv-main"></div>
          <div id="adv-live" class="visually-hidden" aria-live="polite"></div>
        </div>
      </div>
    </section>
  </main>
${footer}
  <script src="theme.js"></script>
  <script src="script.js"></script>
  <script src="advisor.js"></script>
</body>
</html>
`;

fs.writeFileSync("advisor.html", html);
console.log("wrote advisor.html", fs.statSync("advisor.html").size);
