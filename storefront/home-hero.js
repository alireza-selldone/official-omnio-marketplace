/* The homepage hero row.
 *
 * The reference layout for a catalogue this size is one tall editorial panel
 * beside a set of smaller tiles. What is worth noticing is how few of those
 * tiles are actually artwork: most are grids of real product photography, and
 * they only look like banners. Building them from the live catalogue instead
 * of exporting them as images means they cannot go stale, they follow real
 * prices, and a shop with a different catalogue gets its own hero row for
 * free.
 *
 * That leaves exactly two slots that need a designer or a generator, and both
 * are declared in shop.config.json.
 */

import { money } from "./shop-data.js";
import { esc } from "./app.js";

/* A slot with no artwork yet says so, at the size the artwork needs to be.
   A broken image or an empty coloured box would both be worse: one looks like
   a fault, the other looks finished. */
function slotHTML(slot, className) {
  const tone = slot.tone || "#1f5fd0";
  const art = slot.image
    ? `<img src="${esc(slot.image)}" alt="${esc(slot.alt || "")}" loading="eager" width="1200" height="1600">`
    : `<span class="omni-slot__todo">Artwork slot<br><b>${esc(slot.pixels || "")}</b><br>${esc(slot.shape || "")}</span>`;
  return `<section class="${className}" style="--slot-tone:${esc(tone)}">
    <div class="omni-slot__copy">
      ${slot.eyebrow ? `<p>${esc(slot.eyebrow)}</p>` : ""}
      <h2>${esc(slot.headline || "")}</h2>
      ${slot.cta ? `<a class="obtn obtn--act" href="${esc(slot.cta.href)}">${esc(slot.cta.label)}</a>` : ""}
    </div>
    <div class="omni-slot__art${slot.image ? "" : " is-empty"}">${art}</div>
  </section>`;
}

/* Four products from one department, the shape most of the reference row uses. */
function quadHTML(title, products, href, { deals = false } = {}) {
  const four = products.slice(0, 4);
  if (four.length < 4) return "";
  return `<section class="omni-quad">
    <h3>${esc(title)}</h3>
    <div class="omni-quad__grid">
      ${four.map((product) => {
        const saving = product.was && product.was > product.price
          ? Math.round((1 - product.price / product.was) * 100) : 0;
        return `<a href="product.html?id=${product.id}">
          <span class="omni-quad__art">
            <img src="${esc(product.image)}" alt="" loading="lazy" width="180" height="180">
          </span>
          ${deals && saving >= 5 ? `<em class="omni-quad__off">${saving}% off</em>` : ""}
        </a>`;
      }).join("")}
    </div>
    <a class="omni-tile__link" href="${href}">See more</a>
  </section>`;
}

/* The six-pack: one department, six products, used three across. */
function sixHTML(title, products, href) {
  const six = products.slice(0, 6);
  if (six.length < 6) return "";
  return `<section class="omni-six">
    <div class="omni-six__hd"><h3>${esc(title)}</h3>
      <a href="${href}" aria-label="See more ${esc(title)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></a></div>
    <div class="omni-six__grid">
      ${six.map((product) => {
        const saving = product.was && product.was > product.price
          ? Math.round((1 - product.price / product.was) * 100) : 0;
        return `<a href="product.html?id=${product.id}">
          <span class="omni-six__art"><img src="${esc(product.image)}" alt="" loading="lazy" width="140" height="140"></span>
          ${saving >= 5
            ? `<em class="omni-six__off">${saving}% off</em>`
            : `<em class="omni-six__price">${money(product.price)}</em>`}
        </a>`;
      }).join("")}
    </div>
  </section>`;
}

export function heroRowHTML(catalog, safe) {
  const slots = Array.isArray(catalog.cfg?.heroSlots) ? catalog.cfg.heroSlots : [];
  const primary = slots.find((slot) => slot.id === "primary");
  const feature = slots.find((slot) => slot.id === "feature");

  const departments = [...(catalog.cats || [])]
    .filter((item) => Number(item.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count));
  const inCategory = (slug) => safe.filter((product) => product.cat === slug);

  const discounted = safe
    .filter((product) => product.was && product.was > product.price)
    .sort((a, b) => (1 - b.price / b.was) - (1 - a.price / a.was));

  /* Exactly five tiles, one row, equal height.
     This used to place five tiles into a four-column grid, which put one card
     alone on a second row with two empty columns beside it. A promotional row
     with a hole in it reads as a rendering fault, so the count is fixed and
     narrower breakpoints drop tiles from the end rather than wrapping them. */
  const tiles = [
    primary ? slotHTML(primary, "omni-slot omni-slot--primary") : "",
    departments[0] ? quadHTML(`Popular in ${departments[0].name}`, inCategory(departments[0].slug),
      `shop.html?cat=${encodeURIComponent(departments[0].slug)}`) : "",
    feature ? slotHTML(feature, "omni-slot omni-slot--feature") : "",
    quadHTML("Deals ending soon", discounted, "shop.html?sort=discount", { deals: true }),
    departments[1] ? quadHTML(`More in ${departments[1].name}`, inCategory(departments[1].slug),
      `shop.html?cat=${encodeURIComponent(departments[1].slug)}`) : "",
  ].filter(Boolean).slice(0, 5);

  return `<div class="omni-hero" data-tiles="${tiles.length}">${tiles
    .map((tile, index) => tile.replace(/^<section /, `<section data-tile="${index + 1}" `))
    .join("")}</div>`;
}

export function sixPackRowHTML(catalog, safe) {
  const departments = [...(catalog.cats || [])]
    .filter((item) => Number(item.count) >= 6)
    .sort((a, b) => Number(b.count) - Number(a.count));
  const inCategory = (slug) => safe.filter((product) => product.cat === slug);

  const discounted = safe
    .filter((product) => product.was && product.was > product.price)
    .sort((a, b) => (1 - b.price / b.was) - (1 - a.price / a.was));
  const newest = [...safe].sort((a, b) => Number(b.id) - Number(a.id));

  const lead = departments[0];
  if (!lead) return "";

  return `<section class="omni-packs">
    <h2>Keep shopping ${esc(lead.name.toLowerCase())}</h2>
    <div class="omni-packs__row">
      ${sixHTML("For you", inCategory(lead.slug), `shop.html?cat=${encodeURIComponent(lead.slug)}`)}
      ${sixHTML("Deals", discounted, "shop.html?sort=discount")}
      ${sixHTML("New in", newest, "shop.html?sort=new")}
    </div>
  </section>`;
}

/* A full-width strip of three wide artworks. Unlike the hero slots these carry
   no product data, so they are pure navigation: a headline, a destination, and
   an image that says what is behind the link. */
export function stripRowHTML(catalog) {
  const strips = Array.isArray(catalog.cfg?.heroStrips) ? catalog.cfg.heroStrips : [];
  if (!strips.length) return "";
  return `<div class="omni-strips">
    ${strips.map((strip) => `<a class="omni-strip" href="${esc(strip.cta?.href || "shop.html")}"
      style="--strip-tone:${esc(strip.tone || "#1f5fd0")}">
      <img src="${esc(strip.image)}" alt="${esc(strip.alt || "")}" loading="lazy" width="2172" height="724">
      <span class="omni-strip__copy">
        <b>${esc(strip.headline || "")}</b>
        ${strip.cta ? `<em>${esc(strip.cta.label)}</em>` : ""}
      </span>
    </a>`).join("")}
  </div>`;
}
