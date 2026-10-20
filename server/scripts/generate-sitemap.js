"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const API_URL = "https://api.haroonstores.in/api/products";
const SITE_URL = "https://www.haroonstores.in";
const OUTPUT_PATH = path.resolve(__dirname, "../../client/public/sitemap.xml");
const PAGE_SIZE = 50;
const MAX_URLS_PER_SITEMAP = 50000;
const MAX_SITEMAP_BYTES = 50 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/shop", changefreq: "daily", priority: "0.8" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms-and-conditions", changefreq: "monthly", priority: "0.4" }
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function productPageUrl(apiUrl, page) {
  const url = new URL(apiUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(PAGE_SIZE));
  return url.toString();
}

function validateProductsPage(data, requestedPage, expectedTotal) {
  if (!data || data.success !== true || !Array.isArray(data.products)) {
    throw new Error(`Invalid products API response for page ${requestedPage}.`);
  }

  const pagination = data.pagination;
  if (!pagination || typeof pagination !== "object") {
    throw new Error(`Products API omitted pagination metadata for page ${requestedPage}.`);
  }

  const { page, limit, total, totalPages } = pagination;
  const expectedTotalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    !Number.isSafeInteger(total) ||
    !Number.isSafeInteger(totalPages) ||
    total < 0 ||
    page !== requestedPage ||
    limit !== PAGE_SIZE ||
    totalPages !== expectedTotalPages
  ) {
    throw new Error(`Inconsistent pagination metadata for page ${requestedPage}.`);
  }

  if (expectedTotal !== undefined && total !== expectedTotal) {
    throw new Error("Product catalog changed while the sitemap was being generated; retry after it stabilizes.");
  }

  const expectedPageCount = Math.min(
    PAGE_SIZE,
    Math.max(0, total - ((requestedPage - 1) * PAGE_SIZE))
  );
  if (data.products.length !== expectedPageCount) {
    throw new Error(`Incomplete products API page ${requestedPage}: expected ${expectedPageCount}, received ${data.products.length}.`);
  }

  return { products: data.products, total, totalPages };
}

async function fetchProductPage(apiUrl, page, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(productPageUrl(apiUrl, page), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error(`Could not fetch product page ${page}: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Products API returned HTTP ${response.status} for page ${page}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Products API returned invalid JSON for page ${page}.`);
  }
}

async function fetchAllProducts({ apiUrl = API_URL, fetchImpl = fetch } = {}) {
  const firstData = await fetchProductPage(apiUrl, 1, fetchImpl);
  const firstPage = validateProductsPage(firstData, 1);
  const products = [...firstPage.products];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const data = await fetchProductPage(apiUrl, page, fetchImpl);
    const result = validateProductsPage(data, page, firstPage.total);
    products.push(...result.products);
  }

  if (products.length !== firstPage.total) {
    throw new Error(`Catalog pagination was incomplete: expected ${firstPage.total} products, received ${products.length}.`);
  }

  const seenIds = new Set();
  for (const product of products) {
    const id = Number(product?.id);
    if (Number.isSafeInteger(id) && id > 0) {
      if (seenIds.has(id)) {
        throw new Error(`Product ${id} appeared more than once; catalog pagination may have shifted.`);
      }
      seenIds.add(id);
    }
  }

  return products;
}

function createUrlSet(entries, siteUrl) {
  const urls = entries.map(entry => {
    const loc = new URL(entry.path, `${siteUrl}/`).toString();
    const metadata = [];

    if (entry.changefreq) {
      metadata.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
    }
    if (entry.priority) {
      metadata.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
    }

    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      ...metadata,
      "  </url>"
    ].join("\n");
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function createSitemapIndex(locations) {
  const entries = locations.map(location => `  <sitemap>\n    <loc>${escapeXml(location)}</loc>\n  </sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>\n`;
}

function ensureSitemapSize(xml, description) {
  const size = Buffer.byteLength(xml, "utf8");
  if (size > MAX_SITEMAP_BYTES) {
    throw new Error(`${description} exceeds the 50 MB uncompressed sitemap limit.`);
  }
}

function writeAtomically(outputPath, content) {
  const tempPath = `${outputPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tempPath, content, { encoding: "utf8", flag: "wx" });
    fs.renameSync(tempPath, outputPath);
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors; preserve the original write failure.
    }
    throw error;
  }
}

function productUrlEntries(products) {
  const ids = new Set();

  for (const product of products) {
    const id = Number(product?.id);
    if (
      !product ||
      typeof product !== "object" ||
      Array.isArray(product) ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof product.name !== "string" ||
      !product.name.trim()
    ) {
      throw new Error("Products API returned an invalid public product record; the existing sitemap was not changed.");
    }
    ids.add(id);
  }

  return {
    entries: [...ids].map(id => ({ path: `/product/${id}` }))
  };
}

function sitemapChunks(entries) {
  const chunks = [];
  for (let offset = 0; offset < entries.length; offset += MAX_URLS_PER_SITEMAP) {
    chunks.push(entries.slice(offset, offset + MAX_URLS_PER_SITEMAP));
  }
  return chunks;
}

async function generateSitemap({
  apiUrl = API_URL,
  siteUrl = SITE_URL,
  outputPath = OUTPUT_PATH,
  fetchImpl = fetch,
  logger = console
} = {}) {
  const canonicalUrl = new URL(siteUrl);
  if (
    canonicalUrl.protocol !== "https:" ||
    canonicalUrl.origin !== SITE_URL ||
    canonicalUrl.pathname !== "/" ||
    canonicalUrl.search ||
    canonicalUrl.hash
  ) {
    throw new Error(`The sitemap site URL must be exactly ${SITE_URL}.`);
  }
  const canonicalOrigin = canonicalUrl.origin;

  logger.log("Fetching the complete public product catalog...");
  const products = await fetchAllProducts({ apiUrl, fetchImpl });
  const productResult = productUrlEntries(products);
  const uniqueEntries = new Map();

  for (const entry of [...STATIC_PAGES, ...productResult.entries]) {
    if (!uniqueEntries.has(entry.path)) {
      uniqueEntries.set(entry.path, entry);
    }
  }

  const entries = [...uniqueEntries.values()];
  const chunks = sitemapChunks(entries);

  if (chunks.length <= 1) {
    const xml = createUrlSet(entries, canonicalOrigin);
    ensureSitemapSize(xml, "Sitemap");
    writeAtomically(outputPath, xml);
  } else {
    if (chunks.length > MAX_URLS_PER_SITEMAP) {
      throw new Error("The sitemap index would exceed the 50,000 child-sitemap limit.");
    }

    const childLocations = [];
    const outputDirectory = path.dirname(outputPath);
    for (const [index, chunk] of chunks.entries()) {
      const xml = createUrlSet(chunk, canonicalOrigin);
      ensureSitemapSize(xml, `Sitemap part ${index + 1}`);
      const digest = crypto.createHash("sha256").update(xml).digest("hex").slice(0, 12);
      const filename = `sitemap-products-${digest}-${index + 1}.xml`;
      writeAtomically(path.join(outputDirectory, filename), xml);
      childLocations.push(new URL(`/${filename}`, `${canonicalOrigin}/`).toString());
    }

    const indexXml = createSitemapIndex(childLocations);
    ensureSitemapSize(indexXml, "Sitemap index");
    writeAtomically(outputPath, indexXml);
  }

  const report = {
    productsFetched: products.length,
    productUrls: productResult.entries.length,
    totalUrls: entries.length,
    outputPath,
    usedSitemapIndex: chunks.length > 1
  };

  logger.log(`Products fetched: ${report.productsFetched}`);
  logger.log(`Product URLs generated: ${report.productUrls}`);
  logger.log(`Total URLs generated (including static pages): ${report.totalUrls}`);
  logger.log(`Sitemap index used: ${report.usedSitemapIndex ? "yes" : "no"}`);
  logger.log(`Output: ${report.outputPath}`);
  return report;
}

if (require.main === module) {
  generateSitemap().catch(error => {
    console.error(`Sitemap generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  createSitemapIndex,
  createUrlSet,
  escapeXml,
  fetchAllProducts,
  generateSitemap,
  productUrlEntries,
  validateProductsPage
};
