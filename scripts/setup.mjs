/* npm run setup — point this repo at a shop, in one step.
 *
 * The agent calls `selldone_current_connection` and passes what it returns.
 * It must NOT ask the user which shop: they already chose one when they
 * connected the MCP connector, and asking again is a step that need not exist.
 *
 *   node scripts/setup.mjs --shop-id 15552 --handle fashioni --name Fashioni
 *
 * What it does, in order:
 *   1. reads the shop's live categories and products from XAPI
 *   2. derives a slug per category from its live title — never a stored map
 *      of another shop's integers
 *   3. picks a hero product per category, and three hero slides
 *   4. writes shop.config.json, preserving any blurb or hero copy a human
 *      (or an agent) has already written for a category that still exists
 *   5. propagates shop identity into the meta tags in all three index.html
 *   6. prints a run report saying what it did and what still needs writing
 *
 * It deliberately does NOT write blurbs or hero copy. Those have to be
 * written from what the products actually are, and a script that invents them
 * would be inventing data. It reports them as outstanding instead; the agent
 * fills them into shop.config.json and runs this again to propagate.
 *
 * Re-running is safe and is the intended workflow.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "shop.config.json");
const XAPI = "https://xapi.selldone.com";

const MIN_CATS = 3;
const MAX_CATS = 15;

/* ---------- arguments ---------- */
function args() {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) continue;
    const key = a[i].slice(2);
    const val = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : "true";
    out[key] = val;
  }
  return out;
}

const A = args();
const say = (s = "") => console.log(s);
const warn = (s) => console.log("  !! " + s);

/* ---------- slugs ---------- */
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

/* ---------- fetch ---------- */
async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/* The Fashioni repository is also the maintained design starter. Repointing it
   at another shop must remove the old visible identity from source as well as
   changing API ids. Exact title-case replacement deliberately leaves internal
   CSS classes and storage keys alone; those are implementation names, not
   merchant-facing copy. */
const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

function wordmark(name) {
  const letters = escapeHtml(String(name || "Shop").toUpperCase());
  return letters.length > 2
    ? `${letters.slice(0, -2)}<span>${letters.slice(-2)}</span>`
    : letters;
}

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "assets") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sourceFiles(path));
    else if ([".html", ".js", ".md"].includes(extname(entry.name))) out.push(path);
  }
  return out;
}

async function rebrandSource(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return 0;
  const files = [
    ...await sourceFiles(join(ROOT, "storefront")),
    ...await sourceFiles(join(ROOT, "store-pages")),
    join(ROOT, "scripts", "build-pages.mjs"),
    join(ROOT, "scripts", "build-blog-pages.mjs"),
  ];
  const oldWordmark = wordmark(oldName);
  const newWordmark = wordmark(newName);
  let changed = 0;
  for (const path of files) {
    let text = await readFile(path, "utf8");
    const next = text.replaceAll(oldWordmark, newWordmark).replaceAll(oldName, newName);
    if (next === text) continue;
    await writeFile(path, next, "utf8");
    changed++;
  }
  return changed;
}

/* A product image that will read at hero size. Selldone product photography is
   shot on white and served as PNG when it has been cut out; a JPEG is almost
   always a photograph with its background still attached, which looks wrong
   full-bleed. This is a heuristic and is reported as one. */
const looksCutOut = (p) => /\.png(\?|$)/i.test(String(p.icon || ""));

async function main() {
  const shopId = Number(A["shop-id"] || 0);
  const handle = A.handle || "";
  const name = A.name || handle;
  const domain = A.domain || "";

  if (!shopId || !handle) {
    say("");
    say("  npm run setup needs the connected shop, which the agent reads from");
    say("  selldone_current_connection. It does not ask, and it does not guess.");
    say("");
    say("    node scripts/setup.mjs --shop-id <id> --handle <handle> --name <name>");
    say("");
    process.exitCode = 1;
    return;
  }

  say("");
  say(`SETUP — ${name}  (shop ${shopId}, @${handle})`);
  say("=".repeat(58));

  /* ---- 1. live catalogue ---- */
  let list, all;
  try {
    [list, all] = await Promise.all([
      getJson(`${XAPI}/shops/@${handle}/products/list?limit=250`),
      getJson(`${XAPI}/shops/@${handle}/products/all?dir=*&limit=250&products_only=true&with_category=true&with_total=true`),
    ]);
  } catch (err) {
    say("");
    warn(`could not read the catalogue: ${err.message}`);
    warn("check the handle is right and the shop is public, then run again.");
    process.exitCode = 1;
    return;
  }

  const products = list.products || [];
  say(`\n  products              ${products.length}`);
  if (!products.length) {
    warn("this shop has no products. The storefront will render empty states.");
  }

  /* ---- 2. categories, slugs derived from live titles ---- */
  const meta = new Map();
  (all.products || []).forEach((p) => {
    const c = p.category;
    if (c && c.id && !meta.has(c.id)) meta.set(c.id, { title: c.title, icon: c.icon });
  });

  const prior = await readFile(CONFIG, "utf8").then(JSON.parse).catch(() => ({}));
  const priorCats = new Map((prior.categories || []).map((c) => [Number(c.id), c]));
  // Only carry a blurb forward when the shop is unchanged. A blurb written for
  // one shop's collection is not a blurb for another's.
  const sameShop = Number(prior.shop?.id) === shopId;
  const rebranded = await rebrandSource(prior.shop?.name, name);
  if (rebranded) say(`  visible identity       rewritten in ${rebranded} source file(s)`);

  const counted = [...meta.entries()].map(([id, m]) => ({
    id: Number(id),
    title: m.title,
    icon: m.icon,
    count: products.filter((p) => Number(p.category_id) === Number(id)).length,
  })).filter((c) => c.count > 0);

  counted.sort((a, b) => b.count - a.count);

  let kept = counted;
  let dropped = [];
  if (counted.length > MAX_CATS) {
    kept = counted.slice(0, MAX_CATS);
    dropped = counted.slice(MAX_CATS);
  }

  /* A running order chosen by hand survives too. Categories the config already
     lists keep their position; anything new falls in behind, largest first.
     Sorting by product count is only the default for a shop seen for the
     first time. */
  if (sameShop) {
    const priorOrder = (prior.categories || []).map((c) => Number(c.id));
    kept.sort((a, b) => {
      const ia = priorOrder.indexOf(a.id), ib = priorOrder.indexOf(b.id);
      if (ia === -1 && ib === -1) return b.count - a.count;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  const used = new Set();
  const categories = kept.map((c) => {
    const carried = sameShop ? priorCats.get(c.id) : null;
    /* An existing slug is KEPT. Re-running setup must not rewrite every
       collection URL on a shop that has not changed — links, bookmarks and
       anything pointing at ?cat= would all break silently. A slug is only
       derived when there is not already one for this category. */
    let slug = carried?.slug || slugify(c.title, `category-${c.id}`);
    if (used.has(slug)) slug = `${slug}-${c.id}`;
    used.add(slug);
    return { id: c.id, slug, blurb: carried?.blurb || "" };
  });

  say(`  categories            ${categories.length}` +
      (dropped.length ? `  (${dropped.length} not shown — see below)` : ""));

  if (categories.length < MIN_CATS) {
    warn(`only ${categories.length} categories with products. The collections`);
    warn(`section will be hidden entirely rather than showing a lonely tile.`);
  }

  /* ---- 3. category heroes and hero slides ---- */
  /* A hero chosen by hand beats one chosen by heuristic, so an existing pick
     is kept as long as the product is still in that collection. The heuristic
     only fills the gaps. */
  const priorHeroes = sameShop ? prior.categoryHeroes || {} : {};
  const categoryHeroes = {};
  for (const c of kept) {
    const slug = categories.find((x) => x.id === c.id).slug;
    const inCat = products.filter((p) => Number(p.category_id) === c.id);
    const carriedId = Number(priorHeroes[slug]);
    const carried = inCat.find((p) => p.id === carriedId);
    const pick = carried || inCat.find(looksCutOut) || inCat[0];
    if (pick) categoryHeroes[slug] = pick.id;
  }

  const priceOf = (p) => Number(p.price) || 0;
  const usable = products.filter(looksCutOut);
  const heroPool = (usable.length ? usable : []).sort((a, b) => priceOf(b) - priceOf(a));

  const slides = [];
  const seenCat = new Set();
  for (const p of heroPool) {
    if (slides.length >= 3) break;
    if (seenCat.has(p.category_id)) continue;   // not three from one collection
    seenCat.add(p.category_id);
    // Copy is deliberately left empty. It has to be written from what the
    // product actually is, and a generated headline is invented data.
    slides.push({ productId: p.id, kicker: "", title: "", lede: "" });
  }

  let heroMode = "slides";
  if (!slides.length) {
    heroMode = "plate";
    warn("no product has a cut-out image that reads at hero size.");
    warn("falling back to a plain product plate with no slider.");
  }

  // A photo hero cannot be generated: its hotspots are percentages measured by
  // eye against one specific file. Carried forward only for the same shop.
  const keepPhoto = sameShop && prior.hero?.mode === "photo" && prior.hero?.image;
  const hero = keepPhoto
    ? prior.hero
    : {
        mode: heroMode,
        image: "",
        natural: { w: 1, h: 1 },
        linkProductId: slides[0]?.productId || heroPool[0]?.id || products[0]?.id || null,
        hotspots: [],
        slides,
      };

  say(`  hero                  ${hero.mode}` +
      (hero.mode === "slides" ? `, ${slides.length} slide(s)` : ""));

  /* ---- 4. write the config ---- */
  const cfg = {
    $comment: prior.$comment ||
      "Every shop-specific value in one file. Written by `npm run setup`.",
    shop: { id: shopId, handle, name, domain: domain || (sameShop ? prior.shop?.domain : "") || "" },
    isTemplate: false,
    oauth: sameShop
      ? {
          clientId: A["oauth-client-id"] || prior.oauth?.clientId || "",
          appName: A["oauth-app-name"] || prior.oauth?.appName || `${name} Storefront`,
        }
      : {
          clientId: A["oauth-client-id"] || "",
          appName: A["oauth-app-name"] || `${name} Storefront`,
        },
    brand: sameShop
      ? prior.brand
      : { foundedYear: null, cities: null, tagline: null, announcement: null },
    categories,
    audiences: sameShop ? (prior.audiences || []) : [],
    categoryHeroes,
    hero,
    spotlight: prior.spotlight || { mode: "highest-price" },
    contact: sameShop ? prior.contact : { email: null, phone: null, address: null },
  };
  await writeFile(CONFIG, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  say(`  shop.config.json      written, isTemplate: false`);

  /* ---- 5. propagate into the meta tags ---- */
  const META = {
    "shop-name": name,
    "pajulina-app-name": cfg.oauth.appName || `${name} Storefront`,
    "pajulina-client-id": cfg.oauth.clientId || "",
    "pajulina-shop-id": String(shopId),
    "pajulina-shop-name": name,
    "pajulina-shop-domain": cfg.shop.domain || "",
    "pajulina-storefront-shop-handle": handle,
  };

  const files = ["storefront/index.html", "dashboard/index.html", "callback/index.html"];
  let rewritten = 0;
  for (const rel of files) {
    const path = join(ROOT, rel);
    let html;
    try { html = await readFile(path, "utf8"); } catch { warn(`missing ${rel}`); continue; }
    let changed = 0;
    for (const [key, val] of Object.entries(META)) {
      // Assert the replace matched. A silent no-op here is how homepage
      // JavaScript once shipped onto four content pages.
      const re = new RegExp(`(<meta\\s+name="${key}"\\s+content=")[^"]*(")`);
      if (!re.test(html)) { warn(`${rel}: no meta named ${key}`); continue; }
      html = html.replace(re, `$1${val.replace(/\$/g, "$$$$")}$2`);
      changed++;
    }
    // Every storefront page carries the identity metas, not just index.html.
    await writeFile(path, html, "utf8");
    rewritten += changed;
  }

  // The other storefront pages carry the same tags.
  const pages = (await readdir(join(ROOT, "storefront")))
    .filter((f) => f.endsWith(".html") && f !== "index.html" && !f.startsWith("_"));
  for (const f of pages) {
    const path = join(ROOT, "storefront", f);
    let html = await readFile(path, "utf8");
    for (const [key, val] of Object.entries(META)) {
      const re = new RegExp(`(<meta\\s+name="${key}"\\s+content=")[^"]*(")`);
      if (re.test(html)) { html = html.replace(re, `$1${val.replace(/\$/g, "$$$$")}$2`); rewritten++; }
    }
    await writeFile(path, html, "utf8");
  }
  say(`  meta tags             ${rewritten} rewritten across ${files.length + pages.length} files`);

  /* ---- 6. run report ---- */
  say("");
  say("STILL TO DO");
  say("-".repeat(58));

  const needBlurb = categories.filter((c) => !c.blurb);
  if (needBlurb.length) {
    say(`  ${needBlurb.length} category blurb(s) to write — one short line each, from what`);
    say(`  the collection actually contains. Leave one empty rather than writing`);
    say(`  something vague; the tile then shows its name and count alone.`);
    needBlurb.forEach((c) => {
      const t = kept.find((k) => k.id === c.id);
      say(`      ${c.slug.padEnd(24)} ${t.count} products — ${t.title}`);
    });
  } else {
    say("  category blurbs       all present");
  }

  if (hero.mode === "slides") {
    const needCopy = slides.filter((s) => !s.title);
    if (needCopy.length) {
      say(`  ${needCopy.length} hero slide(s) need a kicker, title and lede. Base them only on`);
      say(`  what the product data and photograph support — no invented specs.`);
      needCopy.forEach((s) => {
        const p = products.find((x) => x.id === s.productId);
        say(`      ${String(s.productId).padEnd(24)} ${p ? p.title : "?"}`);
      });
    }
  }

  if (!cfg.brand.tagline) {
    say("  brand copy            foundedYear, cities and tagline are null.");
    say("                        Where the shop has no equivalent, leave them null —");
    say("                        the sentence is omitted rather than showing a placeholder.");
  }
  if (!cfg.oauth.clientId) {
    say("  OAuth client id       not set. Customer sign-in will not work until it is.");
  }
  if (!cfg.audiences.length) {
    say("  audience navigation   empty for this shop. Build Women, Men, Girls, Boys,");
    say("                        and Baby mappings only where the live catalog supports them.");
  }
  say("  contact details       left as visible {{TOKEN}} placeholders on the policy");
  say("                        pages, which is the honest state until they are real.");
  say("  blog                  ask your agent to add your real blog whenever you have one.");

  if (dropped.length) {
    say("");
    say(`  ${dropped.length} categories are NOT shown — the grid holds at most ${MAX_CATS}:`);
    dropped.forEach((c) => say(`      ${c.title} (${c.count} products)`));
  }

  say("");
  say("  Next:  npm run build:static  &&  npm run check");
  say("");
}

main().catch((err) => {
  console.error("\n  setup failed:", err.message, "\n");
  process.exitCode = 1;
});
