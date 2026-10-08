// Site-wide settings shared by the app and the static page builder (scripts/build-pages.ts).
// Kept free of app imports so Node can run it directly.

/** The public website; used for canonical links, the sitemap and share links. */
export const SITE_URL = "https://getfiala.com";

/** Tip jar (e.g. a Ko-fi page). Leave empty to hide every "Support Fiala" link. */
export const SUPPORT_URL = "https://buymeacoffee.com/htwilkinson";

/** Public, search-friendly page for a peptide. */
export const peptidePageUrl = (id: string) => `${SITE_URL}/peptides/${id}/`;

/** Public, search-friendly page for a stack or blend. */
export const stackPageUrl = (id: string) => `${SITE_URL}/stacks/${id}/`;

/**
 * Fiala Plus (Lemon Squeezy). Leave CHECKOUT_URL empty to show Plus as "coming soon".
 * STORE_ID and PRODUCT_ID make sure a licence key belongs to Fiala Plus and not another product.
 */
export const PLUS = {
  checkoutUrl: "",
  storeId: 0,
  productId: 0,
  price: "£12.99",
};
