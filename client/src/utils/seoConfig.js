export const SITE_ORIGIN = "https://www.haroonstores.in";

export const DEFAULT_SITE_DESCRIPTION =
  "Explore Kashmiri handicrafts, walnut wood décor, and handmade wooden products at Haroon Stores. Discover traditional crafts and shop our collection online.";

export const STATIC_SEO_PAGES = {
  "/": {
    title: "Kashmiri Handicrafts & Walnut Wood Décor | Haroon Stores",
    description:
      "Explore Kashmiri handicrafts, walnut wood décor, and handmade wooden products at Haroon Stores. Discover traditional crafts and shop our collection online."
  },
  "/shop": {
    title: "Kashmiri Wooden Handicrafts & Décor Online | Haroon Stores",
    description:
      "Shop authentic Kashmiri wooden handicrafts online at Haroon Stores. Explore handmade walnut wood furniture, carved wall panels, bowls, and traditional décor."
  },
  "/categories": {
    title: "Handicraft Categories & Collections | Haroon Stores",
    description:
      "Explore authentic Kashmiri handicraft categories at Haroon Stores. Discover walnut wood furniture, carved wall panels, handmade bowls, vases, and wooden decor."
  },
  "/about": {
    title: "About Haroon Stores | Kashmiri Craftsmanship",
    description:
      "Learn about Haroon Stores and our mission to preserve Kashmiri craftsmanship through handmade wooden decor and traditional handicrafts."
  },
  "/contact": {
    title: "Contact Haroon Stores",
    description:
      "Contact Haroon Stores for orders, custom woodwork, collaborations, and questions about our Kashmiri handicrafts."
  },
  "/privacy-policy": {
    title: "Privacy Policy | Haroon Stores",
    description:
      "Read the Haroon Stores Privacy Policy to understand how customer personal information, orders, and payments are protected."
  },
  "/terms-and-conditions": {
    title: "Terms & Conditions | Haroon Stores",
    description:
      "Read the Haroon Stores Terms and Conditions for orders, pricing, authentic Kashmiri handicraft purchases, and policies."
  }
};

export const CATEGORY_SEO = {
  FURNITURE: {
    name: "Furniture",
    heading: "Walnut Wood Furniture Collection",
    title: "Walnut Wood Furniture & Kashmiri Crafts | Haroon Stores",
    description:
      "Discover handcrafted walnut wood furniture from Haroon Stores. Shop authentic Kashmiri carved tables, beds, dewaans, and dining sets made with fine walnut wood.",
    intro:
      "Explore our handcrafted Kashmiri walnut wood furniture collection. Each piece is carved from seasoned walnut wood by skilled artisans, bringing timeless Kashmiri craftsmanship into your home."
  },
  "WALL DECORATION PANEL": {
    name: "Wall Decoration Panel",
    heading: "Kashmiri Walnut Wood Wall Panels & Décor",
    title: "Wooden Wall Decor & Walnut Panels | Haroon Stores",
    description:
      "Explore hand-carved wooden wall decor and walnut wood wall panels at Haroon Stores. Authentic Kashmiri craftsmanship with intricate carvings and calligraphy.",
    intro:
      "Transform your interiors with traditional Kashmiri wall decoration panels. Featuring intricate floral carvings, Chinar motifs, and Islamic calligraphy hand-carved into premium walnut wood."
  },
  BOWLS: {
    name: "Bowls",
    heading: "Handcrafted Walnut Wood Bowls",
    title: "Handmade Walnut Wood Bowls & Serving Ware | Haroon Stores",
    description:
      "Shop authentic handmade walnut wood bowls at Haroon Stores. Explore hand-carved Kashmiri decorative and serving bowls crafted from single-piece walnut wood.",
    intro:
      "Hand-carved out of solid Kashmiri walnut wood, our wooden bowls showcase natural wood grains and detailed leaf engravings, perfect for dry fruit serving and elegant home decor."
  },
  VASES: {
    name: "Vases",
    heading: "Carved Walnut Wood Vases",
    title: "Carved Walnut Wood Vases & Décor | Haroon Stores",
    description:
      "Discover carved walnut wood vases handcrafted by master Kashmiri artisans. Elegant traditional wooden vases and home décor items at Haroon Stores.",
    intro:
      "Discover exquisite Kashmiri walnut wood vases featuring traditional floral relief work. Each carved wooden vase is a testament to Kashmir's rich artisan heritage."
  },
  "TISSUE BOXES": {
    name: "Tissue Boxes",
    heading: "Handcrafted Walnut Wood Tissue Boxes",
    title: "Hand Carved Walnut Wood Tissue Boxes | Haroon Stores",
    description:
      "Shop hand-carved walnut wood tissue boxes from Haroon Stores. Authentic Kashmiri wooden tissue cover boxes with fine hand-engraved motifs.",
    intro:
      "Add elegance to your living space with hand-carved walnut wood tissue boxes. Crafted with precision sliding bases and delicate Kashmiri engraving."
  },
  "COMBO SET": {
    name: "Combo Set",
    heading: "Handcrafted Wooden Combo Sets & Gifts",
    title: "Handcrafted Wooden Gift Sets & Combos | Haroon Stores",
    description:
      "Explore handcrafted wooden combo sets and authentic Kashmiri walnut wood gift sets at Haroon Stores. Perfect handcrafted gifts with jewelry boxes and tissue covers.",
    intro:
      "Our curated handcrafted wooden combo sets pair popular Kashmiri walnut wood creations—such as Quran boxes, jewelry organizers, and tissue boxes—making meaningful heirloom gifts."
  },
  MOMENTO: {
    name: "Momento",
    heading: "Kashmiri Wooden Mementos & Keepsakes",
    title: "Kashmiri Wooden Mementos & Keepsakes | Haroon Stores",
    description:
      "Discover authentic Kashmiri wooden mementos, souvenirs, and hand-carved Chinar leaf keepsakes crafted from genuine walnut wood at Haroon Stores.",
    intro:
      "Commemorate special occasions with authentic Kashmiri wooden mementos, including iconic hand-carved Chinar leaf keepsakes made from genuine walnut wood."
  }
};

export function getCategorySeo(categoryName) {
  if (!categoryName || typeof categoryName !== "string") {
    return null;
  }
  const key = categoryName.trim().toUpperCase();
  return CATEGORY_SEO[key] || null;
}
