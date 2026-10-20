import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import { getCanonicalHref } from "../src/utils/canonicalUrl.js";
import { SITE_ORIGIN, STATIC_SEO_PAGES } from "../src/utils/seoConfig.js";
import {
  buildProductSeoMetadata,
  classifyProductResponse
} from "../src/utils/seoMetadata.js";

const require = createRequire(import.meta.url);
const {
  createUrlSet,
  generateSitemap,
  productUrlEntries
} = require("../../server/scripts/generate-sitemap.js");

test("canonical hostname is normalized to production https://www.haroonstores.in", () => {
  assert.equal(SITE_ORIGIN, "https://www.haroonstores.in");
});

test("static SEO routes map to their intended canonical URLs on www", () => {
  for (const pathname of Object.keys(STATIC_SEO_PAGES)) {
    const expected = pathname === "/"
      ? "https://www.haroonstores.in/"
      : `https://www.haroonstores.in${pathname}`;
    assert.equal(getCanonicalHref(pathname), expected);
  }
});

test("product metadata requires a loaded product matching the requested ID", () => {
  const product = {
    id: 22,
    name: "Hand-carved wooden vase",
    description: "A real catalog description.",
    image: "https://images.example.test/vase.jpg",
    finalPrice: 1250,
    stock_status: "in_stock"
  };

  const metadata = buildProductSeoMetadata(product, "22");
  assert.equal(metadata.title, "Hand-carved wooden vase | Haroon Stores");
  assert.equal(metadata.canonicalUrl, "https://www.haroonstores.in/product/22");
  assert.equal(metadata.description, product.description);
  assert.equal(metadata.image, product.image);
  assert.equal(metadata.price, 1250);
  assert.equal(metadata.availability, "instock");

  // Rejects mismatched IDs
  assert.equal(buildProductSeoMetadata(product, "23"), null);
});

test("invalid product IDs or missing product data return null metadata", () => {
  const validProduct = { id: 10, name: "Walnut Box", price: 500 };

  assert.equal(buildProductSeoMetadata(null, "10"), null);
  assert.equal(buildProductSeoMetadata(validProduct, "abc"), null);
  assert.equal(buildProductSeoMetadata(validProduct, "-5"), null);
  assert.equal(buildProductSeoMetadata(validProduct, "0"), null);
  assert.equal(buildProductSeoMetadata({ id: 10, name: "" }, "10"), null);
  assert.equal(buildProductSeoMetadata({ id: 10, name: "   " }, "10"), null);
  assert.equal(buildProductSeoMetadata({ id: -10, name: "Box" }, "-10"), null);
});

test("product JSON-LD generates correct schema, INR price, and breadcrumbs without fabrication", () => {
  const product = {
    id: 15,
    name: "Carved Walnut Bowl",
    description: "Handcrafted bowl made of seasoned walnut wood.",
    image: "https://images.example.test/bowl.jpg",
    price: 890,
    stock_status: "in_stock"
  };

  const metadata = buildProductSeoMetadata(product, "15");
  assert.ok(metadata.structuredData);
  assert.equal(metadata.structuredData["@context"], "https://schema.org");
  assert.ok(Array.isArray(metadata.structuredData["@graph"]));

  const productObj = metadata.structuredData["@graph"].find(i => i["@type"] === "Product");
  assert.ok(productObj);
  assert.equal(productObj.name, "Carved Walnut Bowl");
  assert.equal(productObj.url, "https://www.haroonstores.in/product/15");
  assert.equal(productObj.offers.priceCurrency, "INR");
  assert.equal(productObj.offers.price, 890);
  assert.equal(productObj.offers.availability, "https://schema.org/InStock");

  // Verify NO fabricated properties
  assert.equal(productObj.offers.shippingDetails, undefined);
  assert.equal(productObj.aggregateRating, undefined);
  assert.equal(productObj.review, undefined);

  const breadcrumbs = metadata.structuredData["@graph"].find(i => i["@type"] === "BreadcrumbList");
  assert.ok(breadcrumbs);
  assert.equal(breadcrumbs.itemListElement.length, 3);
  assert.equal(breadcrumbs.itemListElement[0].item, "https://www.haroonstores.in/");
  assert.equal(breadcrumbs.itemListElement[1].item, "https://www.haroonstores.in/shop");
  assert.equal(breadcrumbs.itemListElement[2].item, "https://www.haroonstores.in/product/15");
});

test("safe HTML/JSON escaping for product descriptions and names", () => {
  const product = {
    id: 5,
    name: 'Decorative "Tray" & Stand <script>alert("xss")</script>',
    description: 'Special & rare "walnut" wood <tags>',
    price: 1500
  };

  const metadata = buildProductSeoMetadata(product, "5");
  assert.ok(metadata.title.includes('Decorative "Tray" & Stand'));
  const jsonString = JSON.stringify(metadata.structuredData);
  // Escaping for embedding inside <script>
  const scriptSafe = jsonString.replace(/</g, "\\u003c");
  assert.equal(scriptSafe.includes("<script>"), false);
});

test("product API classification distinguishes missing, failure, and valid records", () => {
  assert.deepEqual(classifyProductResponse(404, {}, "22"), { type: "missing" });
  assert.deepEqual(classifyProductResponse(503, {}, "22"), { type: "error" });
  assert.deepEqual(
    classifyProductResponse(200, { success: true, product: { id: 23 } }, "22"),
    { type: "error" }
  );
  assert.equal(
    classifyProductResponse(200, { success: true, product: { id: 22 } }, "22").type,
    "found"
  );
});

test("sitemap duplicate removal and URL entry validation", () => {
  const products = [
    { id: 1, name: "Product 1" },
    { id: 2, name: "Product 2" },
    { id: 1, name: "Product 1 Duplicate" }
  ];

  const result = productUrlEntries(products);
  assert.equal(result.entries.length, 2);
  assert.deepEqual(result.entries.map(e => e.path), ["/product/1", "/product/2"]);
});

test("sitemap createUrlSet outputs canonical HTTPS URLs on www", () => {
  const entries = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/product/22" }
  ];
  const xml = createUrlSet(entries, "https://www.haroonstores.in");
  assert.ok(xml.includes("<loc>https://www.haroonstores.in/</loc>"));
  assert.ok(xml.includes("<loc>https://www.haroonstores.in/product/22</loc>"));
});

test("sitemap generator rejects a noncanonical origin before requesting the API", async () => {
  await assert.rejects(
    generateSitemap({
      siteUrl: "https://haroonstores.in", // non-canonical apex
      fetchImpl: () => {
        throw new Error("fetch should not be called");
      },
      logger: { log() {} }
    }),
    /must be exactly https:\/\/www\.haroonstores\.in/
  );
});

test("built static routes have one correct canonical on www and the SPA shell has none", () => {
  const routes = {
    "/": "../dist/index.html",
    "/shop": "../dist/shop/index.html",
    "/categories": "../dist/categories/index.html",
    "/about": "../dist/about/index.html",
    "/contact": "../dist/contact/index.html",
    "/privacy-policy": "../dist/privacy-policy/index.html",
    "/terms-and-conditions": "../dist/terms-and-conditions/index.html"
  };

  for (const [route, relativePath] of Object.entries(routes)) {
    if (fs.existsSync(new URL(relativePath, import.meta.url))) {
      const html = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
      const canonicalCount = (html.match(/<link rel="canonical"/g) || []).length;
      const canonicalPath = route === "/" ? "/" : route;
      assert.equal(canonicalCount, 1, `${route} should have one canonical`);
      assert.ok(html.includes(`href="https://www.haroonstores.in${canonicalPath}"`));
    }
  }

  const shellUrl = new URL("../dist/spa-shell.html", import.meta.url);
  if (fs.existsSync(shellUrl)) {
    const shell = fs.readFileSync(shellUrl, "utf8");
    assert.equal((shell.match(/<link rel="canonical"/g) || []).length, 0);
    assert.equal(shell.includes('property="og:url"'), false);
  }
});
