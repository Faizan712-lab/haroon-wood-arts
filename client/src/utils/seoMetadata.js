import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_ORIGIN,
  STATIC_SEO_PAGES,
  getCategorySeo
} from "./seoConfig.js";
import { getCanonicalHref } from "./canonicalUrl.js";

const PRODUCT_JSON_LD_SELECTOR = 'script[data-seo-product="true"]';

export function formatProductTitle(name) {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  const upperCount = (trimmed.match(/[A-Z]/g) || []).length;
  const isAllCaps = letters.length > 0 && upperCount / letters.length > 0.75;

  if (isAllCaps) {
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map(word => {
        if (!word) return "";
        if (/^\d+x\d+$/i.test(word)) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  return trimmed;
}

export function formatProductDescription(description, productOrName = null) {
  let rawDesc = typeof description === "string" ? description.trim() : "";
  let productName = "";

  if (productOrName) {
    if (typeof productOrName === "object") {
      productName = typeof productOrName.name === "string" ? productOrName.name : "";
    } else if (typeof productOrName === "string") {
      productName = productOrName;
    }
  }

  const cleanName = formatProductTitle(productName);

  if (!rawDesc) {
    if (cleanName) {
      return `Explore ${cleanName} at Haroon Stores. Authentic handcrafted Kashmiri wooden creations online.`;
    }
    return DEFAULT_SITE_DESCRIPTION;
  }

  let text = rawDesc;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const isAllCaps = letters.length > 0 && upperCount / letters.length > 0.75;

  if (isAllCaps) {
    text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    text = text.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`);
    text = text.replace(/\b(kashmir|kashmiri|haroon stores|haroon)\b/gi, match => {
      const lower = match.toLowerCase();
      if (lower === "kashmiri") return "Kashmiri";
      if (lower === "kashmir") return "Kashmir";
      if (lower === "haroon stores") return "Haroon Stores";
      if (lower === "haroon") return "Haroon";
      return match;
    });
  }

  const trimmed = text.trim();
  const punctuated = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;

  if (!cleanName) {
    return punctuated.slice(0, 300);
  }

  const lowerText = punctuated.toLowerCase();
  const lowerName = cleanName.toLowerCase();
  const alreadyMentionsName = lowerText.includes(lowerName);
  const alreadyMentionsBrand = lowerText.includes("haroon stores");

  if (alreadyMentionsName && alreadyMentionsBrand) {
    return punctuated.slice(0, 300);
  }

  if (alreadyMentionsName) {
    if (!alreadyMentionsBrand && punctuated.length < 140) {
      return `${punctuated} Available at Haroon Stores.`.slice(0, 300);
    }
    return punctuated.slice(0, 300);
  }

  if (alreadyMentionsBrand) {
    return `${cleanName} \u2014 ${punctuated}`.slice(0, 300);
  }

  return `${cleanName} at Haroon Stores. ${punctuated}`.slice(0, 300);
}

export function buildProductSeoTitle(product) {
  const cleanName = formatProductTitle(product?.name || "");
  if (!cleanName) {
    return "Kashmiri Handicrafts | Haroon Stores";
  }

  const lower = cleanName.toLowerCase();
  const category = String(product?.category || "").trim().toUpperCase();

  if (lower.includes("haroon stores")) {
    return cleanName;
  }

  // If the product title is already long (> 42 chars), keep it clean with brand suffix
  if (cleanName.length > 42) {
    return `${cleanName} | Haroon Stores`;
  }

  // For short titles, enrich with natural material/craftsmanship context
  if (!lower.includes("kashmiri")) {
    if (category === "FURNITURE") {
      return `${cleanName} - Kashmiri Handcrafted Furniture | Haroon Stores`;
    }
    if (!lower.includes("walnut") && !lower.includes("wood")) {
      return `${cleanName} - Handcrafted Kashmiri Walnut Wood | Haroon Stores`;
    }
    return `${cleanName} - Handcrafted Kashmiri Walnut Wood | Haroon Stores`;
  }

  return `${cleanName} | Haroon Stores`;
}

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
  const rawName = typeof product?.name === "string" ? product.name.trim() : "";

  if (!productId || productId !== requestedProductId || !rawName) {
    return null;
  }

  const cleanName = formatProductTitle(rawName);
  const title = buildProductSeoTitle({ ...product, name: cleanName });
  const canonicalUrl = getCanonicalHref(`/product/${productId}`);
  const description = formatProductDescription(product.description, { ...product, name: cleanName });
  const images = getProductImages(product);
  const price = getProductPrice(product);
  const availability = getSchemaAvailability(product);

  const productSchema = {
    "@type": "Product",
    name: cleanName,
    url: canonicalUrl
  };

  if (description) {
    productSchema.description = description;
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

    if (availability) {
      productSchema.offers.availability = availability;
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

  return {
    title,
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

export function applyRouteMetadata(pathname, search = "") {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const canonicalUrl = getCanonicalHref(pathname);

  clearProductStructuredData();
  upsertMeta("name", "robots", null);

  let pageTitle = null;
  let pageDescription = null;

  if (path === "/shop" && search) {
    try {
      const params = new URLSearchParams(search);
      const categoryParam = params.get("category");
      if (categoryParam) {
        const catSeo = getCategorySeo(categoryParam);
        if (catSeo) {
          pageTitle = catSeo.title;
          pageDescription = catSeo.description;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  const staticPage = STATIC_SEO_PAGES[path];
  if (staticPage) {
    const title = pageTitle || staticPage.title;
    const description = pageDescription || staticPage.description;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
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
