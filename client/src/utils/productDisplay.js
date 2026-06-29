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

export function isOutOfStock(product) {
  const stock =
    Number(product?.stock);

  return (
    product?.stockStatus === "out_of_stock" ||
    product?.stock_status === "out_of_stock" ||
    (
      Number.isFinite(stock) &&
      stock <= 0
    )
  );
}

export function getStockLabel(product) {
  if (isOutOfStock(product)) {
    return "Out of Stock";
  }

  const stock =
    Number(product?.stock);

  if (
    Number.isFinite(stock) &&
    stock > 0 &&
    stock <= 10
  ) {
    return `Only ${stock} left`;
  }

  return "";
}
