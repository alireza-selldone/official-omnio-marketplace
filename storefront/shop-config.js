/* Loader for shop.config.json — the single file holding every shop-specific
   value. This module must contain NO shop-specific value of its own: that is
   the whole point of it. If you find yourself adding a product id, a category
   id or a line of brand copy here, it belongs in the config.

   Fetched rather than imported so the same built bundle serves any shop: the
   build copies shop.config.json into dist/ beside the pages, and swapping the
   file swaps the shop without rebuilding.

   A missing or unreadable config is NOT fatal. It returns a config with no
   shop id, which trips the template banner — an operator who deleted the file
   sees a loud warning rather than a blank page. */

let _cfg = null;
let _pending = null;

const EMPTY = {
  shop: {},
  isTemplate: true,
  brand: {},
  categories: [],
  categoryHeroes: {},
  hero: { mode: "plate", slides: [], hotspots: [] },
  spotlight: { mode: "highest-price" },
  contact: {},
};

export function shopConfigSync() {
  return _cfg || EMPTY;
}

export async function shopConfig() {
  if (_cfg) return _cfg;
  if (_pending) return _pending;
  _pending = (async () => {
    try {
      const res = await fetch(new URL("shop.config.json", document.baseURI), {
        headers: { Accept: "application/json" },
      });
      _cfg = res.ok ? { ...EMPTY, ...(await res.json()) } : { ...EMPTY };
      if (!res.ok) console.error("[storefront] shop.config.json", res.status);
    } catch (err) {
      console.error("[storefront] shop.config.json unreadable", err);
      _cfg = { ...EMPTY };
    }
    return _cfg;
  })();
  return _pending;
}

/* The template banner fires on "still the template OR no shop id at all".
   Checking for a specific shop id would miss the more dangerous case: the
   storefront falls back to the template's shop when the id is absent, so an
   empty config serves someone else's catalogue just as surely as one that
   names it — and an operator who deleted the value believes they unset it. */
export function isUnconfigured(cfg = shopConfigSync()) {
  return cfg.isTemplate === true || !cfg.shop || !cfg.shop.id;
}

/* A category slug, derived from its live title. Never from a stored map of
   another shop's integers. Two categories that slugify identically get the
   id appended, so the pair stays addressable instead of collapsing. */
export function slugify(title, fallback = "") {
  const s = String(title || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Apostrophes vanish rather than becoming separators: "Men's Classic"
    // is mens-classic, not men-s-classic.
    .replace(/['’ʼ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}
