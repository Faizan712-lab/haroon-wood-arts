import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_ORIGIN,
  STATIC_SEO_PAGES
} from "./seoConfig.js";
import { getCanonicalHref } from "./canonicalUrl.js";

const PRODUCT_JSON_LD_SELECTOR = 'script[data-seo-product="true"]';

function upsertMeta(attribute, key, content) {
  const matches = Array.from(
    document.head.querySelectorAll(`meta[${attribute}]`)
  ).filter(meta => meta.getAttribute(attribute) === key);

  if (content === null || content === undefined || content === "") {
    matches.forEach(meta => meta.remove());
    return;
  }

  const [meta, ...duplicates] = matches;
  duplicates.forEach(duplicate => duplicate.remove());

  const tag = meta || document.createElement("meta");
  tag.setAttribute(attribute, key);
  tag.setAttribute("content", String(content));

  if (!meta) {
    document.head.appendChild(tag);
  }
}

function upsertCanonical(href) {
  const links = Array.from(
    document.head.querySelectorAll('link[rel="canonical"]')
  );

  if (!href) {
    links.forEach(link => link.remove());
    return;
  }

  const [link, ...duplicates] = links;
  duplicates.forEach(duplicate => duplicate.remove());

  const canonical = link || document.createElement("link");
  canonical.setAttribute("rel", "canonical");
  canonical.setAttribute("href", href);

  if (!link) {
    document.head.appendChild(canonical);
  }
}

function clearProductStructuredData() {
  document.head.querySelectorAll(PRODUCT_JSON_LD_SELECTOR).forEach(script => script.remove());
}

function clearRouteOpenGraph() {
  [
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:type",
    "og:site_name",
    "product:price:amount",
    "product:price:currency",
    "product:availability"
  ].forEach(property => upsertMeta("property", property, null));
}

function positiveProductId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const price = Number(value);
    if (Number.isFinite(price) && price >= 0) {
      return price;
    }
  }

  return null;
}

function getSchemaAvailability(product) {
  const stockStatus = String(product.stockStatus || product.stock_status || "")
    .toLowerCase()
    .trim();

  if (stockStatus === "in_stock") {
    return "https://schema.org/InStock";
  }
  if (stockStatus === "out_of_stock") {
    return "https://schema.org/OutOfStock";
  }

  return null;
}

export function classifyProductResponse(status, data, requestedId) {
  if (status === 404) {
    return { type: "missing" };
  }

  if (status < 200 || status >= 300) {
    return { type: "error" };
  }

  const requestedProductId = positiveProductId(requestedId);
  const responseProductId = positiveProductId(data?.product?.id);

  if (
    data?.success === true &&
    data.product &&
    requestedProductId !== null &&
    responseProductId === requestedProductId
  ) {
    return { type: "found", product: data.product };
  }

  return { type: "error" };
}

export function buildProductSeoMetadata(product, requestedId) {
  const productId = positiveProductId(product?.id);
  const requestedProductId = positiveProductId(requestedId);
  const name = typeof product?.name === "string" ? product.name.trim() : "";

  if (!productId || productId !== requestedProductId || !name) {
    return null;
  }

  const canonicalUrl = getCanonicalHref(`/product/${productId}`);
  const description = typeof product.description === "string"
    ? product.description.trim().slice(0, 300)
    : "";
  const images = getProductImages(product);
  const price = getProductPrice(product);
  const availability = getSchemaAvailability(product);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url: canonicalUrl
  };

  if (description) {
    structuredData.description = description;
  }
  if (images.length > 0) {
    structuredData.image = images;
  }
  if (price !== null) {
    structuredData.offers = {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "INR",
      price
    };

    if (availability) {
      structuredData.offers.availability = availability;
    }
  }

  return {
    title: `${name} | Haroon Stores`,
    description,
    canonicalUrl,
    image: images[0] || null,
    price,
    availability: availability === "https://schema.org/InStock"
      ? "instock"
      : availability === "https://schema.org/OutOfStock"
        ? "oos"
        : null,
    structuredData
  };
}

export function applyRouteMetadata(pathname) {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const staticPage = STATIC_SEO_PAGES[path];
  const canonicalUrl = getCanonicalHref(pathname);

  clearProductStructuredData();
  upsertMeta("name", "robots", null);

  if (staticPage) {
    document.title = staticPage.title;
    upsertMeta("name", "description", staticPage.description);
    upsertMeta("property", "og:title", staticPage.title);
    upsertMeta("property", "og:description", staticPage.description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", `${SITE_ORIGIN}/logo.png`);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "Haroon Stores");
    upsertMeta("property", "product:price:amount", null);
    upsertMeta("property", "product:price:currency", null);
    upsertMeta("property", "product:availability", null);
    upsertCanonical(canonicalUrl);
    return;
  }

  if (canonicalUrl && /^\/product\/\d+$/.test(path)) {
    document.title = "Kashmiri Handicrafts | Haroon Stores";
    upsertMeta("name", "description", DEFAULT_SITE_DESCRIPTION);
    upsertMeta("property", "og:title", document.title);
    upsertMeta("property", "og:description", DEFAULT_SITE_DESCRIPTION);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", null);
    upsertMeta("property", "og:type", null);
    upsertMeta("property", "og:site_name", "Haroon Stores");
    upsertMeta("property", "product:price:amount", null);
    upsertMeta("property", "product:price:currency", null);
    upsertMeta("property", "product:availability", null);
    upsertCanonical(canonicalUrl);
    return;
  }

  document.title = "Haroon Stores";
  upsertMeta("name", "description", null);
  clearRouteOpenGraph();
  upsertCanonical(null);
}

export function applyProductMetadata(product, requestedId) {
  const metadata = buildProductSeoMetadata(product, requestedId);
  if (!metadata) {
    return false;
  }

  upsertMeta("name", "robots", null);
  document.title = metadata.title;
  upsertMeta("name", "description", metadata.description);
  upsertMeta("property", "og:title", metadata.title);
  upsertMeta("property", "og:description", metadata.description);
  upsertMeta("property", "og:url", metadata.canonicalUrl);
  upsertMeta("property", "og:image", metadata.image);
  upsertMeta("property", "og:type", "product");
  upsertMeta("property", "og:site_name", "Haroon Stores");
  upsertMeta("property", "product:price:amount", metadata.price);
  upsertMeta("property", "product:price:currency", metadata.price === null ? null : "INR");
  upsertMeta("property", "product:availability", metadata.availability);
  upsertCanonical(metadata.canonicalUrl);

  clearProductStructuredData();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.seoProduct = "true";
  script.textContent = JSON.stringify(metadata.structuredData);
  document.head.appendChild(script);

  return true;
}

export function applyMissingProductMetadata() {
  document.title = "Product Not Found | Haroon Stores";
  upsertMeta("name", "description", null);
  clearRouteOpenGraph();
  clearProductStructuredData();
  upsertCanonical(null);
  upsertMeta("name", "robots", "noindex");
}
