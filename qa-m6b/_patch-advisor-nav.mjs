import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGES = [
  "index.html",
  "about.html",
  "ai-automation.html",
  "case-studies.html",
  "contact.html",
  "packages.html",
  "qa-process.html",
  "resources.html",
  "services.html",
  "work.html",
  "showroom.html",
  "project-request.html",
  "privacy.html",
  "404.html",
];

function patch(file) {
  const abs = path.join(ROOT, file);
  let html = fs.readFileSync(abs, "utf8");
  const before = html;
  const is404 = file === "404.html";
  const contactHref = is404 ? "/contact.html" : "contact.html";
  const advisorHref = is404 ? "/advisor.html" : "advisor.html";
  const projectHref = is404 ? "/project-request.html" : "project-request.html";
  const privacyHref = is404 ? "/privacy.html" : "privacy.html";

  const contactLi = `<li><a href="${contactHref}">Contact</a></li>`;
  const advisorLi = `<li><a href="${advisorHref}">Guided Advisor</a></li>`;

  if (!html.includes(`href="${advisorHref}">Guided Advisor</a></li>`)) {
    if (html.includes(contactLi)) {
      html = html.replace(contactLi, `${contactLi}\n          ${advisorLi}`);
    }
  }

  const explorerNeedle = `<a href="${projectHref}">Start a Project</a>
                  <span aria-hidden="true">·</span>
                  <a href="${contactHref}">Contact</a>`;
  const explorerReplacement = `<a href="${projectHref}">Start a Project</a>
                  <span aria-hidden="true">·</span>
                  <a href="${advisorHref}">Guided Advisor</a>
                  <span aria-hidden="true">·</span>
                  <a href="${contactHref}">Contact</a>`;
  if (html.includes(explorerNeedle)) {
    html = html.replace(explorerNeedle, explorerReplacement);
  }

  // Footer: insert before Privacy if missing in footer-nav block
  const footerStart = html.indexOf('class="footer-nav"');
  if (footerStart !== -1) {
    const footerEnd = html.indexOf("</nav>", footerStart);
    if (footerEnd !== -1) {
      const footerBlock = html.slice(footerStart, footerEnd);
      if (!footerBlock.includes(`href="${advisorHref}"`)) {
        const privacyLink = `<a href="${privacyHref}">Privacy</a>`;
        if (footerBlock.includes(privacyLink)) {
          const patchedFooter = footerBlock.replace(
            privacyLink,
            `<a href="${advisorHref}">Guided Advisor</a>\n        ${privacyLink}`
          );
          html = html.slice(0, footerStart) + patchedFooter + html.slice(footerEnd);
        }
      }
    }
  }

  if (html !== before) {
    fs.writeFileSync(abs, html);
    return true;
  }
  return false;
}

let n = 0;
for (const f of PAGES) {
  if (!fs.existsSync(path.join(ROOT, f))) continue;
  if (patch(f)) {
    n += 1;
    console.log("patched", f);
  } else {
    console.log("unchanged", f);
  }
}
console.log("done", n);
