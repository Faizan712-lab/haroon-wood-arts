import { SITE_ORIGIN, STATIC_SEO_PAGES } from "./seoConfig.js";

export function getCanonicalHref(pathname) {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";

  if (Object.hasOwn(STATIC_SEO_PAGES, path)) {
    return path === "/"
      ? `${SITE_ORIGIN}/`
      : `${SITE_ORIGIN}${path}`;
  }

  // Product IDs are numeric in the current /product/:id route.
  if (/^\/product\/\d+$/.test(path)) {
    return `${SITE_ORIGIN}${path}`;
  }

  return null;
}
