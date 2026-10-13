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
 * Fiala Plus (Stripe). Leave checkoutUrl empty to show Plus as "coming soon".
 * The unlock service's /buy starts a Stripe Checkout for the Fiala Plus product
 * and sends the buyer back to #/plus?session_id=… once they've paid.
 */
export const PLUS = {
  checkoutUrl: "https://plus.getfiala.com/buy",
  price: "£12.99",
};
