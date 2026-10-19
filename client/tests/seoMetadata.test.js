import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import { getCanonicalHref } from "../src/utils/canonicalUrl.js";
import { STATIC_SEO_PAGES } from "../src/utils/seoConfig.js";
import {
  buildProductSeoMetadata,
  classifyProductResponse
} from "../src/utils/seoMetadata.js";

const require = createRequire(import.meta.url);
const { generateSitemap } = require("../../server/scripts/generate-sitemap.js");

test("static SEO routes map to their intended canonical URLs", () => {
  for (const pathname of Object.keys(STATIC_SEO_PAGES)) {
    assert.equal(getCanonicalHref(pathname), `https://haroonstores.in${pathname}`);
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
  assert.equal(metadata.canonicalUrl, "https://haroonstores.in/product/22");
  assert.equal(metadata.description, product.description);
  assert.equal(metadata.image, product.image);
  assert.equal(metadata.price, 1250);
  assert.equal(metadata.availability, "instock");
  assert.equal(buildProductSeoMetadata(product, "23"), null);
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

test("built static routes have one correct canonical and the SPA shell has none", () => {
  const routes = {
    "/": "../dist/index.html",
    "/shop": "../dist/shop/index.html",
    "/categories": "../dist/categories/index.html",
    "/about": "../dist/about/index.html",
    "/contact": "../dist/contact/index.html"
  };

  for (const [route, relativePath] of Object.entries(routes)) {
    const html = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
    const canonicalCount = (html.match(/<link rel="canonical"/g) || []).length;
    const canonicalPath = route === "/" ? "/" : route;
    assert.equal(canonicalCount, 1, `${route} should have one canonical`);
    assert.ok(html.includes(`href="https://haroonstores.in${canonicalPath}"`));
  }

  const shell = fs.readFileSync(new URL("../dist/spa-shell.html", import.meta.url), "utf8");
  assert.equal((shell.match(/<link rel="canonical"/g) || []).length, 0);
  assert.equal(shell.includes('property="og:url"'), false);
});

test("sitemap generator rejects a noncanonical origin before requesting the API", async () => {
  await assert.rejects(
    generateSitemap({
      siteUrl: "https://www.haroonstores.in",
      fetchImpl: () => {
        throw new Error("fetch should not be called");
      },
      logger: { log() {} }
    }),
    /must be exactly https:\/\/haroonstores\.in/
  );
});
