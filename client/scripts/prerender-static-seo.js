import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_ORIGIN,
  STATIC_SEO_PAGES
} from "../src/utils/seoConfig.js";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..");
const DIST_DIRECTORY = path.join(CLIENT_DIRECTORY, "dist");
const TEMPLATE_PATH = path.join(DIST_DIRECTORY, "index.html");
const SOCIAL_IMAGE = `${SITE_ORIGIN}/logo.png`;

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function upsertMeta(html, attribute, key, content) {
  const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagPattern = new RegExp(
    `<meta\\s+${attribute}=["']${safeKey}["'][^>]*\\/?\\s*>`,
    "i"
  );
  const tag = `<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(content)}" />`;

  if (tagPattern.test(html)) {
    return html.replace(tagPattern, tag);
  }

  return html.replace("</head>", `  ${tag}\n  </head>`);
}

function applyMetadata(template, pathname, metadata) {
  const canonicalUrl = pathname === "/"
    ? `${SITE_ORIGIN}/`
    : `${SITE_ORIGIN}${pathname}`;
  const title = escapeAttribute(metadata.title);
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

  html = upsertMeta(html, "name", "description", metadata.description);
  html = upsertMeta(html, "property", "og:title", metadata.title);
  html = upsertMeta(html, "property", "og:description", metadata.description);
  html = upsertMeta(html, "property", "og:type", "website");
  html = upsertMeta(html, "property", "og:site_name", "Haroon Stores");
  html = upsertMeta(html, "property", "og:url", canonicalUrl);
  html = upsertMeta(html, "property", "og:image", SOCIAL_IMAGE);

  html = html.replace(
    /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi,
    ""
  );
  html = html.replace(
    "</head>",
    `  <link rel="canonical" href="${canonicalUrl}" />\n  </head>`
  );

  return html;
}

function createProductSpaShell(template) {
  let html = template.replace(
    /<title>[^<]*<\/title>/i,
    "<title>Kashmiri Handicrafts | Haroon Stores</title>"
  );
  html = upsertMeta(html, "name", "description", DEFAULT_SITE_DESCRIPTION);
  html = upsertMeta(html, "property", "og:title", "Kashmiri Handicrafts | Haroon Stores");
  html = upsertMeta(html, "property", "og:description", DEFAULT_SITE_DESCRIPTION);
  html = html.replace(
    /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi,
    ""
  );
  html = html.replace(/<meta\s+property=["']og:url["'][^>]*\/?\s*>\s*/gi, "");
  return html;
}

function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Vite output not found: ${TEMPLATE_PATH}`);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const productShell = createProductSpaShell(template);
  fs.writeFileSync(path.join(DIST_DIRECTORY, "spa-shell.html"), productShell, "utf8");

  for (const [pathname, metadata] of Object.entries(STATIC_SEO_PAGES)) {
    const html = applyMetadata(template, pathname, metadata);
    const outputPath = pathname === "/"
      ? TEMPLATE_PATH
      : path.join(DIST_DIRECTORY, pathname.slice(1), "index.html");

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, "utf8");
  }

  console.log(`Prerendered SEO metadata for ${Object.keys(STATIC_SEO_PAGES).length} static routes.`);
  console.log("Product routes use a neutral SPA shell and do not require the product API at build time.");
}

main();
