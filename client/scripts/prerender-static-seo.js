/* global process */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_ORIGIN,
  STATIC_SEO_PAGES
} from "../src/utils/seoConfig.js";
import {
  buildProductSeoTitle,
  formatProductDescription,
  formatProductTitle
} from "../src/utils/seoMetadata.js";

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
  if (content === null || content === undefined || content === "") {
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tagPattern = new RegExp(
      `<meta\\s+${attribute}=["']${safeKey}["'][^>]*\\/?\\s*>\\s*`,
      "gi"
    );
    return html.replace(tagPattern, "");
  }

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

function publicImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    const url = new URL(value.trim(), `${SITE_ORIGIN}/`);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function getProductImages(product) {
  const candidates = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.product_images) ? product.product_images : [])
  ];
  return [...new Set(candidates.map(publicImageUrl).filter(Boolean))];
}

function getProductPrice(product) {
  for (const value of [
    product.finalPrice,
    product.discountedPrice,
    product.discount_price,
    product.price
  ]) {
    if (value === null || value === undefined || value === "") continue;
    const price = Number(value);
    if (Number.isFinite(price) && price >= 0) return price;
  }
  return null;
}

function getSchemaAvailability(product) {
  const stockStatus = String(product.stockStatus || product.stock_status || "")
    .toLowerCase()
    .trim();
  if (stockStatus === "in_stock") return "https://schema.org/InStock";
  if (stockStatus === "out_of_stock") return "https://schema.org/OutOfStock";
  return null;
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

function applyProductMetadataToHtml(template, product) {
  const productId = Number(product?.id);
  const canonicalUrl = `${SITE_ORIGIN}/product/${productId}`;
  const rawName = String(product?.name || "").trim();
  const cleanName = formatProductTitle(rawName);
  const pageTitle = buildProductSeoTitle({ ...product, name: cleanName });
  const title = escapeAttribute(pageTitle);
  const rawDescription = formatProductDescription(product.description, { ...product, name: cleanName });

  const images = getProductImages(product);
  const primaryImage = images[0] || `${SITE_ORIGIN}/logo.png`;
  const price = getProductPrice(product);
  const schemaAvailability = getSchemaAvailability(product);
  const ogAvailability = schemaAvailability === "https://schema.org/InStock"
    ? "instock"
    : schemaAvailability === "https://schema.org/OutOfStock"
      ? "oos"
      : null;

  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  html = upsertMeta(html, "name", "description", rawDescription);
  html = upsertMeta(html, "property", "og:title", pageTitle);
  html = upsertMeta(html, "property", "og:description", rawDescription);
  html = upsertMeta(html, "property", "og:type", "product");
  html = upsertMeta(html, "property", "og:site_name", "Haroon Stores");
  html = upsertMeta(html, "property", "og:url", canonicalUrl);
  html = upsertMeta(html, "property", "og:image", primaryImage);

  if (price !== null) {
    html = upsertMeta(html, "property", "product:price:amount", String(price));
    html = upsertMeta(html, "property", "product:price:currency", "INR");
  } else {
    html = upsertMeta(html, "property", "product:price:amount", null);
    html = upsertMeta(html, "property", "product:price:currency", null);
  }

  if (ogAvailability) {
    html = upsertMeta(html, "property", "product:availability", ogAvailability);
  } else {
    html = upsertMeta(html, "property", "product:availability", null);
  }

  html = html.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi, "");
  html = html.replace("</head>", `  <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);

  // Build schema.org Product and BreadcrumbList structured data
  const productSchema = {
    "@type": "Product",
    name: cleanName,
    url: canonicalUrl
  };
  if (rawDescription) {
    productSchema.description = rawDescription;
  }
  if (images.length > 0) {
    productSchema.image = images;
  }
  if (price !== null) {
    productSchema.offers = {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "INR",
      price
    };
    if (schemaAvailability) {
      productSchema.offers.availability = schemaAvailability;
    }
  }

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_ORIGIN}/`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${SITE_ORIGIN}/shop`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cleanName,
        item: canonicalUrl
      }
    ]
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [productSchema, breadcrumbList]
  };

  const safeJsonLd = JSON.stringify(structuredData, null, 2).replace(/</g, "\\u003c");
  const jsonLdTag = `  <script type="application/ld+json" data-seo-product="true">\n${safeJsonLd}\n  </script>`;

  if (/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i.test(html)) {
    html = html.replace(
      /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i,
      jsonLdTag
    );
  } else {
    html = html.replace("</head>", `${jsonLdTag}\n  </head>`);
  }

  return html;
}

async function fetchPrerenderProducts() {
  const apiUrl = process.env.VITE_API_BASE_URL
    ? `${process.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api/products`
    : "https://api.haroonstores.in/api/products";

  try {
    const url = new URL(apiUrl);
    url.searchParams.set("page", "1");
    url.searchParams.set("limit", "50");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      console.warn(`Product API returned HTTP ${response.status}; skipping product prerender.`);
      return [];
    }

    const data = await response.json();
    if (!data || data.success !== true || !Array.isArray(data.products)) {
      console.warn("Product API returned invalid format; skipping product prerender.");
      return [];
    }

    return data.products.filter(p => {
      const id = Number(p?.id);
      return Number.isSafeInteger(id) && id > 0 && typeof p?.name === "string" && p.name.trim();
    });
  } catch (error) {
    console.warn(`Product API unavailable during prerender (${error.message}); product routes will fall back to the SPA shell.`);
    return [];
  }
}

async function main() {
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

  const products = await fetchPrerenderProducts();
  if (products.length > 0) {
    for (const product of products) {
      const html = applyProductMetadataToHtml(template, product);
      const productDir = path.join(DIST_DIRECTORY, "product", String(product.id));
      fs.mkdirSync(productDir, { recursive: true });
      fs.writeFileSync(path.join(productDir, "index.html"), html, "utf8");
      fs.writeFileSync(path.join(DIST_DIRECTORY, "product", `${product.id}.html`), html, "utf8");
    }
    console.log(`Prerendered SEO metadata for ${products.length} product routes.`);
  } else {
    console.log("Product routes use a neutral SPA shell and do not require the product API at build time.");
  }
}

main().catch(error => {
  console.error("Prerendering failed:", error);
  process.exit(1);
});
