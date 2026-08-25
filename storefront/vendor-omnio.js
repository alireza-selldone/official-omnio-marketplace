/* Omnio seller store.
 *
 * A seller inside a marketplace gets a storefront of their own: a masthead
 * carrying their name and logo, their departments as tiles, and rails of their
 * products. It is the one place in the site where a seller's identity is
 * allowed to lead, which is why the masthead is the only coloured band on the
 * page and everything below it returns to the ordinary catalogue grammar.
 *
 * The roster comes from the live vendors endpoint, so a seller added in the
 * backoffice gets this page without a code change, and a seller with nothing
 * listed yet says so rather than showing an empty grid.
 */

import { loadCatalog, loadVendors, promotionSafeProducts, vendorImg, money } from "./shop-data.js";
import { vendorRoster } from "./marketplace-config.js";
import { esc } from "./app.js";

const $ = (s, r = document) => r.querySelector(s);
const slug = new URLSearchParams(location.search).get("vendor")?.toLowerCase() || "";

const card = (product) => `<a class="ocard" href="product.html?id=${product.id}">
  <span class="ocard__art"><img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" width="200" height="200"></span>
  <span class="ocard__name">${esc(product.name)}</span>
  <span class="ocard__price"><b>${money(product.price)}</b></span>
</a>`;

function notFound(root) {
  document.title = "Seller not found — Omnio";
  root.innerHTML = `<div class="oempty">
    <h1>We could not find that seller</h1>
    <p>${slug ? `No seller is listed at <b>${esc(slug)}</b>.` : "No seller was named in this link."}</p>
    <a class="obtn obtn--act" href="vendors.html">See all sellers</a></div>`;
}

async function init() {
  const root = $("#vendorroot");
  if (!root) return;

  const [catalog, live] = await Promise.all([loadCatalog(), loadVendors().catch(() => [])]);
  const vendor = vendorRoster(live).find((row) => row.slug === slug);
  if (!vendor) { notFound(root); return; }

  document.title = `${vendor.name} — Omnio`;
  const mine = promotionSafeProducts(catalog.products).filter((p) => p.vendorSlug === vendor.slug);
  const departments = catalog.cats
    .map((category) => ({ category, products: mine.filter((p) => p.cat === category.slug) }))
    .filter((row) => row.products.length)
    .sort((a, b) => b.products.length - a.products.length);

  const logo = vendorImg(vendor.icon, 256);
  const discounted = mine.filter((p) => p.was > p.price)
    .sort((a, b) => (1 - b.price / b.was) - (1 - a.price / a.was));
  const newest = [...mine].sort((a, b) => Number(b.id) - Number(a.id));

  const rail = (title, rows, href) => rows.length < 4 ? "" : `<section class="ostore__rail">
    <div class="ostore__railhd"><h2>${esc(title)}</h2>
      ${href ? `<a href="${href}">See more</a>` : ""}</div>
    <div class="omni-rail">${rows.slice(0, 12).map(card).join("")}</div>
  </section>`;

  root.innerHTML = `
    <nav class="ocrumb" aria-label="Breadcrumb">
      <a href="index.html">Omnio</a><span>&rsaquo;</span>
      <a href="vendors.html">Sellers</a><span>&rsaquo;</span>
      <span aria-current="page">${esc(vendor.name)}</span>
    </nav>

    <header class="ostore__hero" style="--store-tone:${esc(vendor.accent === "coral" ? "#8a3418"
      : vendor.accent === "emerald" ? "#12594a" : vendor.accent === "violet" ? "#3c2d6b"
      : vendor.accent === "amber" ? "#7a5410" : "#123a6b")}">
      <div class="ostore__mark">${logo
        ? `<img src="${esc(logo)}" alt="" width="72" height="72">`
        : `<span>${esc(vendor.name.slice(0, 1))}</span>`}</div>
      <div>
        <p>${esc(vendor.eyebrow)}</p>
        <h1>${esc(vendor.name)}</h1>
        ${vendor.description ? `<p class="ostore__desc">${esc(vendor.description)}</p>` : ""}
      </div>
      <a class="obtn obtn--act" href="shop.html?vendor=${encodeURIComponent(vendor.slug)}">Shop all</a>
    </header>

    ${!mine.length ? `<p class="ostore__empty">This seller has no products listed yet.</p>` : `
      ${departments.length > 1 ? `<section class="ostore__depts">
        <h2>Shop ${esc(vendor.name)} by department</h2>
        <div class="ostore__grid">
          ${departments.slice(0, 8).map(({ category, products }) => `
            <a class="ostore__dept" href="shop.html?vendor=${encodeURIComponent(vendor.slug)}&cat=${encodeURIComponent(category.slug)}">
              <span class="ostore__deptart"><img src="${esc(products[0].image)}" alt="" loading="lazy" width="220" height="220"></span>
              <b>${esc(category.name)}</b>
            </a>`).join("")}
        </div>
      </section>` : ""}
      ${rail(`Popular at ${vendor.name}`, mine, `shop.html?vendor=${encodeURIComponent(vendor.slug)}`)}
      ${rail("Reduced right now", discounted, `shop.html?vendor=${encodeURIComponent(vendor.slug)}&deal=1`)}
      ${rail("Latest from this seller", newest, `shop.html?vendor=${encodeURIComponent(vendor.slug)}&sort=new`)}
    `}`;
}

document.addEventListener("DOMContentLoaded", init);
