/* Omnio product page.
 *
 * Three columns, and the middle one is the long one. A catalogue retailer's
 * product page is not a brand story: the shopper arrived knowing roughly what
 * they want and is now deciding between near-identical things, so the page has
 * to answer price, variant, availability, delivery and returns before it says
 * anything else.
 *
 * Gallery on the left with a vertical thumbnail rail, facts in the middle, and
 * a boxed buy panel on the right that stays put. The buy panel is a bordered
 * box rather than a floating card because it is a form, not an advertisement.
 *
 * Everything is live: price, stock, variants, specifications and companions
 * all come from the connected shop.
 */

import {
  loadCatalog, loadProduct, byId, catOf, money, addToBag,
  variantsOf, variantColors, swatchStyle, swatchLabel, promotionSafeProducts,
} from "./shop-data.js";
import { variantSizeOptions, variantSizeValue } from "./variant-options.js";
import { esc } from "./app.js";

const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);

/* Shelf pricing: the cents are small and raised, because the whole number is
   what a shopper compares and the cents are a detail they confirm. */
function bigPrice(value) {
  const whole = Math.floor(Number(value) || 0);
  const cents = Math.round(((Number(value) || 0) - whole) * 100);
  return `<span class="opdp__price"><sup>$</sup><b>${whole.toLocaleString("en-US")}</b>`
    + `<sup>${String(cents).padStart(2, "0")}</sup></span>`;
}

const stars = (score, count) => !count ? "" : `<span class="opdp__rate">
  <span class="opdp__stars" aria-label="${Math.round(score)} out of 5">${"★".repeat(Math.round(score))}${"☆".repeat(5 - Math.round(score))}</span>
  <a href="#reviews">${count} rating${count === 1 ? "" : "s"}</a></span>`;

/* A delivery date the shop has not configured is not a date to invent. The
   dispatch lead time is real, so the page states that instead of a promise. */
function deliveryLine(product) {
  const hours = Number(product.raw?.lead) || 0;
  if (!hours) return `<p class="opdp__ship">Delivery options are confirmed at checkout.</p>`;
  const days = Math.max(1, Math.round(hours / 24));
  return `<p class="opdp__ship">Dispatched within <b>${days} day${days === 1 ? "" : "s"}</b>.
    Delivery date and cost are confirmed at checkout.</p>`;
}

function galleryHTML(gallery) {
  return `<div class="opdp__media">
    <div class="opdp__thumbs" role="group" aria-label="Product images"${gallery.length < 2 ? " hidden" : ""}>
      ${gallery.map((shot, index) => `
        <button type="button" class="opdp__thumb${index ? "" : " is-on"}" data-i="${index}"
          aria-label="View image ${index + 1} of ${gallery.length}">
          <img src="${esc(shot.src)}" alt="" width="60" height="60" loading="lazy">
        </button>`).join("")}
    </div>
    <div class="opdp__main">
      <img id="opdpmain" src="${esc(gallery[0].src)}" alt="${esc(gallery[0].alt || "")}"
        width="${gallery[0].w || 900}" height="${gallery[0].h || 900}" fetchpriority="high">
    </div>
  </div>`;
}

function bulletsHTML(product) {
  const pros = product.raw?.pros;
  const rows = pros && typeof pros === "object"
    ? Object.entries(pros).filter(([key, value]) => key && value) : [];
  if (!rows.length) return "";
  return `<div class="opdp__about">
    <h2>About this item</h2>
    <ul>${rows.slice(0, 8).map(([title, body]) =>
      `<li><b>${esc(title)}:</b> ${esc(String(body))}</li>`).join("")}</ul>
  </div>`;
}

function variantHTML(product, selected) {
  const variants = variantsOf(product.raw);
  if (!variants.length) return "";
  const colours = variantColors(product.raw);
  const { field, values } = variantSizeOptions(variants);
  const selectedColour = selected?.color || colours[0];
  const selectedSize = selected && field ? variantSizeValue(selected, field) : values[0];

  const colourRow = colours.length > 1 ? `<div class="opdp__opt">
    <p><span>Colour:</span> <b>${esc(swatchLabel(selectedColour))}</b></p>
    <div class="opdp__swatches" role="radiogroup" aria-label="Choose colour">
      ${colours.map((colour) => `<button type="button" role="radio"
        aria-checked="${colour === selectedColour}" aria-label="${esc(swatchLabel(colour))}"
        class="opdp__swatch${colour === selectedColour ? " is-on" : ""}"
        data-colour="${esc(colour)}" style="${swatchStyle(colour)}"></button>`).join("")}
    </div></div>` : "";

  const sizeRow = values.length > 1 ? `<div class="opdp__opt">
    <p><span>Size:</span> <b>${esc(String(selectedSize || "").toUpperCase())}</b></p>
    <div class="opdp__sizes" role="radiogroup" aria-label="Choose size">
      ${values.map((size) => `<button type="button" role="radio"
        aria-checked="${size === selectedSize}"
        class="opdp__size${size === selectedSize ? " is-on" : ""}"
        data-size="${esc(size)}">${esc(String(size).toUpperCase())}</button>`).join("")}
    </div></div>` : "";

  return colourRow + sizeRow;
}

function buyBoxHTML(product, price) {
  const inStock = Number(product.qty) > 0;
  const max = Math.min(10, Number(product.qty) || 1);
  return `<aside class="obuy">
    ${bigPrice(price)}
    <p class="obuy__tax">Duties and taxes calculated at checkout.</p>
    ${deliveryLine(product)}
    <p class="obuy__stock${inStock ? "" : " is-out"}">${inStock
      ? `In stock${Number(product.qty) <= 10 ? ` &mdash; only ${product.qty} left` : ""}`
      : "Currently unavailable"}</p>
    ${inStock ? `<label class="obuy__qty" for="obuyqty"><span>Quantity</span>
      <select id="obuyqty">${Array.from({ length: max }, (unused, index) =>
        `<option value="${index + 1}">${index + 1}</option>`).join("")}</select></label>` : ""}
    <div class="obuy__acts">
      <button class="obtn obtn--act obtn--full" type="button" data-add="${product.id}"${inStock ? "" : " disabled"}>Add to bag</button>
      <button class="obtn obtn--buy obtn--full" type="button" data-buy="${product.id}"${inStock ? "" : " disabled"}>Buy now</button>
    </div>
    <dl class="obuy__facts">
      <div><dt>Sold by</dt><dd>${product.vendorName
        ? `<a href="vendor.html?vendor=${esc(product.vendorSlug)}">${esc(product.vendorName)}</a>` : "Omnio"}</dd></div>
      <div><dt>Payment</dt><dd>Secure transaction</dd></div>
      ${product.raw?.return_warranty ? `<div><dt>Returns</dt><dd>Accepted</dd></div>` : ""}
      ${product.raw?.warranty ? `<div><dt>Warranty</dt><dd>${esc(product.raw.warranty)}</dd></div>` : ""}
    </dl>
  </aside>`;
}

function specTableHTML(spec) {
  if (!spec || typeof spec !== "object") return "";
  const rows = [];
  const text = (value) => Array.isArray(value) ? value.join(", ")
    : value && typeof value === "object" ? "" : String(value ?? "");
  Object.entries(spec).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([k, v]) => { if (text(v)) rows.push([k, text(v)]); });
    } else if (text(value) && value !== "group") rows.push([key, text(value)]);
  });
  if (!rows.length) return "";
  return `<section class="opdp-sec"><h2>Product details</h2>
    <table class="ospec"><tbody>${rows.map(([key, value]) =>
      `<tr><th scope="row">${esc(key)}</th><td>${esc(value)}</td></tr>`).join("")}</tbody></table>
  </section>`;
}

function relatedHTML(title, products) {
  if (products.length < 4) return "";
  return `<section class="opdp-sec"><h2>${esc(title)}</h2>
    <div class="orel">${products.slice(0, 10).map((row) => `
      <a class="orel__item" href="product.html?id=${row.id}">
        <span class="orel__art"><img src="${esc(row.image)}" alt="" loading="lazy" width="150" height="150"></span>
        <b>${esc(row.name)}</b>
        <em>${money(row.price)}</em>
      </a>`).join("")}</div>
  </section>`;
}

async function init() {
  const root = $("#pdp");
  if (!root) return;
  const id = Number(params.get("id"));
  const catalog = await loadCatalog();
  let product = byId(catalog, id);

  if (!product) {
    root.innerHTML = `<div class="onotfound"><h1>We could not find that product</h1>
      <p>It may have sold out or been removed.</p>
      <a class="obtn obtn--act" href="shop.html">Browse the catalogue</a></div>`;
    return;
  }

  const detail = await loadProduct(product.id).catch(() => ({ raw: null, gallery: [] }));
  if (detail.raw) product = { ...product, raw: { ...product.raw, ...detail.raw } };
  const gallery = detail.gallery?.length
    ? detail.gallery
    : [{ src: product.image, alt: product.name, w: 900, h: 900 }];

  const category = catOf(catalog, product.cat) || { name: product.catName, slug: product.cat };
  const variants = variantsOf(product.raw);
  const selected = variants.find((v) => Number(v.id) === Number(params.get("variant"))) || variants[0] || null;
  const price = selected?.price > 0 ? selected.price - (selected.discount || 0) : product.price;

  document.title = `${product.name} — Omnio`;

  root.innerHTML = `
    <nav class="ocrumb" aria-label="Breadcrumb">
      <a href="index.html">Omnio</a><span>&rsaquo;</span>
      <a href="shop.html?cat=${esc(category.slug)}">${esc(category.name)}</a><span>&rsaquo;</span>
      <span aria-current="page">${esc(product.name)}</span>
    </nav>
    <div class="opdp">
      ${galleryHTML(gallery)}
      <div class="opdp__info">
        <h1>${esc(product.name)}</h1>
        ${product.brand ? `<p class="opdp__brand">Brand: <a href="shop.html?brand=${encodeURIComponent(product.brand)}">${esc(product.brand)}</a></p>` : ""}
        ${stars(product.rate, product.rateCount)}
        <hr>
        ${variantHTML(product, selected)}
        ${bulletsHTML(product)}
      </div>
      ${buyBoxHTML(product, price)}
    </div>
    ${specTableHTML(product.spec)}
    ${relatedHTML(`More in ${category.name}`,
      promotionSafeProducts(catalog.products).filter((row) => row.cat === product.cat && row.id !== product.id))}
    ${relatedHTML("Customers also viewed",
      promotionSafeProducts(catalog.products).filter((row) => row.id !== product.id && row.cat !== product.cat))}
  `;

  /* Gallery */
  const main = $("#opdpmain");
  root.querySelectorAll(".opdp__thumb").forEach((button) => {
    const swap = () => {
      const shot = gallery[Number(button.dataset.i)];
      if (!shot || !main) return;
      main.src = shot.src;
      main.alt = shot.alt || "";
      root.querySelectorAll(".opdp__thumb").forEach((other) => other.classList.toggle("is-on", other === button));
    };
    button.addEventListener("click", swap);
    button.addEventListener("mouseenter", swap);
  });

  /* Variant selection reloads with the chosen combination, so the URL always
     describes exactly what is on screen and can be shared or reloaded. */
  const go = (colour, size) => {
    const { field } = variantSizeOptions(variants);
    const match = variants.find((v) =>
      (!colour || v.color === colour) && (!size || !field || variantSizeValue(v, field) === size));
    if (match) location.assign(`product.html?id=${product.id}&variant=${match.id}`);
  };
  const currentSize = selected && variantSizeOptions(variants).field
    ? variantSizeValue(selected, variantSizeOptions(variants).field) : null;
  root.querySelectorAll("[data-colour]").forEach((button) =>
    button.addEventListener("click", () => go(button.dataset.colour, currentSize)));
  root.querySelectorAll("[data-size]").forEach((button) =>
    button.addEventListener("click", () => go(selected?.color, button.dataset.size)));

  /* Buy */
  const qty = () => Number($("#obuyqty")?.value) || 1;
  $("[data-add]")?.addEventListener("click", () => {
    addToBag(product.id, qty(), selected);
    document.querySelector('[data-open="cart"]')?.click();
  });
  $("[data-buy]")?.addEventListener("click", () => {
    addToBag(product.id, qty(), selected);
    location.assign("checkout.html");
  });
}

document.addEventListener("DOMContentLoaded", init);
