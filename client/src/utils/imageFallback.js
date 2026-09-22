export const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%23f3ede7'/%3E%3Cpath d='M120 342h400l-92-132-72 82-56-66-84 116z' fill='%23d7c7b7'/%3E%3Ccircle cx='226' cy='164' r='42' fill='%23e7d8c8'/%3E%3Ctext x='320' y='410' text-anchor='middle' font-family='Arial' font-size='30' fill='%23705a4b'%3EProduct Image%3C/text%3E%3C/svg%3E";

export function handleImageFallback(event) {
  if (event.currentTarget.src !== PRODUCT_PLACEHOLDER) {
    event.currentTarget.src = PRODUCT_PLACEHOLDER;
  }
}

export function getImageList(item) {
  const source =
    item?.images ||
    item?.product_images ||
    item?.category_images ||
    [];

  const images = Array.isArray(source)
    ? source
    : (() => {
        try {
          const parsed = JSON.parse(source || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  return [...new Set(
    [
      ...images,
      item?.image
    ]
      .map(image => String(image || "").trim())
      .filter(Boolean)
  )].slice(0, 8);
}

export function getPrimaryImage(item) {
  return getImageList(item)[0] || PRODUCT_PLACEHOLDER;
}

export function getSecondaryImage(item) {
  return getImageList(item)[1] || "";
}
