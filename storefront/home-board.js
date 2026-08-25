/* Omnio homepage — a board of doors, not a story.
 *
 * A shop with one point of view can open with a hero and a promise. A shop
 * that sells four hundred categories cannot: the useful first screen is a
 * dense board of entry points, because the visitor already knows what they
 * came for and every pixel spent persuading them is a pixel spent in their
 * way.
 *
 * Everything below is derived from the live catalogue. No department, product,
 * price or count is written here.
 */

import { loadCatalog, money, promotionSafeProducts } from "./shop-data.js";
import { esc } from "./app.js";
import { heroRowHTML, sixPackRowHTML, stripRowHTML } from "./home-hero.js";

/* Cents are set small and raised, the way a shelf price is read. */
function priceHTML(product) {
  const value = Number(product.price || 0);
  const whole = Math.floor(value);
  const cents = Math.round((value - whole) * 100);
  const was = Number(product.was || 0);
  return `<span class="ocard__price"><b>$${whole.toLocaleString("en-US")}</b>`
    + `<sup>${String(cents).padStart(2, "0")}</sup>`
    + `${was > value ? `<s>$${was.toLocaleString("en-US", { maximumFractionDigits: 0 })}</s>` : ""}</span>`;
}

function stars(product) {
  const count = Number(product.rateCount || 0);
  if (!count) return "";
  const score = Math.round(Number(product.rate) || 0);
  return `<span class="ocard__rate"><span class="ocard__stars" aria-label="${score} out of 5">`
    + `${"★".repeat(score)}${"☆".repeat(5 - score)}</span><small>${count}</small></span>`;
}

export function ocardHTML(product) {
  const saving = product.was && product.was > product.price
    ? Math.round((1 - product.price / product.was) * 100) : 0;
  return `<a class="ocard" href="product.html?id=${product.id}">
    <span class="ocard__art">
      ${saving >= 5 ? `<span class="ocard__deal">${saving}% off</span>` : ""}
      <img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" width="220" height="220">
    </span>
    <span class="ocard__name">${esc(product.name)}</span>
    ${stars(product)}
    ${priceHTML(product)}
    ${product.qty > 0 ? "" : `<span class="ocard__ship">Currently unavailable</span>`}
  </a>`;
}

/* A tile is one department shown through four of its own products. */
function tileHTML(category, products) {
  const four = products.slice(0, 4);
  if (four.length < 4) return "";
  return `<section class="omni-tile">
    <h3>${esc(category.name)}</h3>
    <div class="omni-tile__quad">
      ${four.map((product) => `<a href="product.html?id=${product.id}">
        <span><img src="${esc(product.image)}" alt="" loading="lazy" width="150" height="150"></span>
        <b>${esc(product.name)}</b>
      </a>`).join("")}
    </div>
    <a class="omni-tile__link" href="shop.html?cat=${encodeURIComponent(category.slug)}">Shop ${esc(category.name)}</a>
  </section>`;
}

/* A single-image tile, for a department with a strong lead product. */
function featureTileHTML(category, product) {
  return `<section class="omni-tile">
    <h3>${esc(category.name)}</h3>
    <a class="omni-tile__one" href="shop.html?cat=${encodeURIComponent(category.slug)}">
      <span><img src="${esc(product.image)}" alt="" loading="lazy" width="420" height="315"></span>
    </a>
    <a class="omni-tile__link" href="shop.html?cat=${encodeURIComponent(category.slug)}">See more</a>
  </section>`;
}

function railHTML(title, products, href) {
  if (products.length < 4) return "";
  return `<section class="omni-rail-sec">
    <h2>${esc(title)}</h2>
    <div class="omni-rail">${products.map(ocardHTML).join("")}</div>
    ${href ? `<a class="omni-tile__link" href="${href}">See more</a>` : ""}
  </section>`;
}

export async function renderBoard(root) {
  const catalog = await loadCatalog();
  const safe = promotionSafeProducts(catalog.products);
  const inCategory = (slug) => safe.filter((product) => product.cat === slug);

  const departments = [...(catalog.cats || [])]
    .filter((item) => Number(item.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count));

  /* Alternate four-up and single-image tiles so the board has rhythm without
     any of them being more important than the others. */
  const board = departments.slice(0, 12).map((category, index) => {
    const products = inCategory(category.slug);
    if (!products.length) return "";
    return index % 5 === 4
      ? featureTileHTML(category, products[0])
      : tileHTML(category, products);
  }).filter(Boolean).join("");

  const discounted = safe
    .filter((product) => product.was && product.was > product.price)
    .sort((a, b) => (1 - a.price / a.was) < (1 - b.price / b.was) ? 1 : -1)
    .slice(0, 18);

  const newest = [...safe].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 18);

  root.innerHTML = `
    <div class="wrap">
      ${heroRowHTML(catalog, safe)}
      ${stripRowHTML(catalog)}
      ${sixPackRowHTML(catalog, safe)}
      <div class="omni-board">${board}</div>
      ${railHTML("Today's biggest savings", discounted, "shop.html?sort=discount")}
      ${railHTML("New at Omnio", newest, "shop.html?sort=new")}
    </div>`;
}
