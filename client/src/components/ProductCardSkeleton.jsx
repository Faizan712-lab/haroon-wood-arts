function ProductCardSkeleton({ count = 12 }) {
  return Array.from({ length: count }, (_, index) => (
    <article className="product-card product-card-skeleton" key={index} aria-hidden="true">
      <div className="product-skeleton-image" />
      <div className="product-skeleton-line product-skeleton-category" />
      <div className="product-skeleton-line product-skeleton-title" />
      <div className="product-skeleton-line product-skeleton-price" />
      <div className="product-skeleton-line product-skeleton-rating" />
      <div className="product-skeleton-actions">
        <span />
        <span />
      </div>
    </article>
  ));
}

export default ProductCardSkeleton;
