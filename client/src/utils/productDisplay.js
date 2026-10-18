export function getProductVariants(product) {
  return product?.variants?.length > 0
    ? product.variants
    : product?.sizes || [];
}
export function getVariantLabel(item) {
  const label =
    item?.variantLabel ||
    item?.selectedSize ||
    item?.size ||
    "";

  const dimensions =
    item?.variantDimensions ||
    item?.dimensions ||
    "";

  const cleanLabel =
    String(label || "").trim();

  const cleanDimensions =
    String(dimensions || "").trim();

  if (
    cleanLabel &&
    cleanDimensions &&
    cleanLabel.toLowerCase() !==
      cleanDimensions.toLowerCase()
  ) {
    return `Size: ${cleanLabel} × ${cleanDimensions}`;
  }

  const value =
    cleanLabel || cleanDimensions;

  return value ? `Size: ${value}` : "";
}
