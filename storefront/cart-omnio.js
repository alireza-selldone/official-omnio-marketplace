/* Omnio bag.
 *
 * A full page rather than a slide-over. A drawer is right when the bag is a
 * glance on the way to somewhere else; at this catalogue size the bag is a
 * working list a shopper edits, compares and returns to, and a 380px panel is
 * the wrong room to do that in.
 *
 * Prices are recomputed from the live catalogue on every render, so a bag left
 * open overnight shows today's price rather than yesterday's.
 */

import { loadCatalog, money, bagLines, bagSubtotal, setBagQty, swatchLabel } from "./shop-data.js";
import { variantSizeOptions, variantSizeValue } from "./variant-options.js";
import { esc } from "./app.js";

const $ = (s, r = document) => r.querySelector(s);
const FREE_OVER = 45;

function bits(line) {
  const variant = line.variant;
  if (!variant) return "";
  const field = variantSizeOptions([variant]).field;
  const size = field ? variantSizeValue(variant, field) : "";
  return [variant.color ? swatchLabel(variant.color) : "", size].filter(Boolean).join(" · ");
}

function lineHTML(line) {
  const key = `${line.p.id}:${line.variantId || 0}`;
  const detail = bits(line);
  const max = Math.max(line.qty, Math.min(10, Number(line.p.qty) || 1));
  return `<article class="obag__row">
    <a class="obag__art" href="product.html?id=${line.p.id}">
      <img src="${esc(line.p.image)}" alt="${esc(line.p.name)}" width="150" height="150" loading="lazy">
    </a>
    <div class="obag__body">
      <a class="obag__name" href="product.html?id=${line.p.id}">${esc(line.p.name)}</a>
      ${detail ? `<p class="obag__variant">${esc(detail)}</p>` : ""}
      <p class="obag__stock${line.p.qty > 0 ? "" : " is-out"}">${line.p.qty > 0 ? "In stock" : "Currently unavailable"}</p>
      ${line.p.vendorName ? `<p class="obag__seller">Sold by <a href="vendor.html?vendor=${esc(line.p.vendorSlug)}">${esc(line.p.vendorName)}</a></p>` : ""}
      <div class="obag__tools">
        <label class="obag__qty" for="q-${key}"><span class="sr">Quantity</span>
          <select id="q-${key}" data-qty="${key}">
            ${Array.from({ length: max }, (unused, index) =>
              `<option value="${index + 1}"${index + 1 === line.qty ? " selected" : ""}>${index + 1}</option>`).join("")}
          </select></label>
        <button type="button" class="obag__del" data-remove="${key}">Delete</button>
      </div>
    </div>
    <span class="obag__money">${money(line.unitPrice * line.qty)}</span>
  </article>`;
}

export async function renderBag(root) {
  const catalog = await loadCatalog();

  const draw = () => {
    const lines = bagLines(catalog);
    if (!lines.length) {
      root.innerHTML = `<div class="oempty">
        <h1>Your Omnio bag is empty</h1>
        <p>Items you add will be kept here on this device.</p>
        <a class="obtn obtn--act" href="shop.html">Browse the catalogue</a></div>`;
      return;
    }
    const subtotal = bagSubtotal(catalog);
    const count = lines.reduce((n, line) => n + line.qty, 0);
    const free = subtotal >= FREE_OVER;

    root.innerHTML = `<div class="obag">
      <div class="obag__list">
        <div class="obag__hd"><h1>Shopping bag</h1><span>Price</span></div>
        ${lines.map(lineHTML).join("")}
        <p class="obag__sub">Subtotal (${count} item${count === 1 ? "" : "s"}):
          <b>${money(subtotal)}</b></p>
      </div>
      <aside class="obag__panel">
        ${free
          ? `<p class="obag__free"><b>Your order qualifies for free delivery.</b></p>`
          : `<p class="obag__nudge">Add ${money(FREE_OVER - subtotal)} of eligible items for free delivery.</p>`}
        <p class="obag__total">Subtotal (${count} item${count === 1 ? "" : "s"}): <b>${money(subtotal)}</b></p>
        <a class="obtn obtn--act obtn--full" href="checkout.html">Proceed to checkout</a>
        <p class="obag__fine">Delivery, taxes and the final total are confirmed at checkout.</p>
      </aside>
    </div>`;

    root.querySelectorAll("[data-qty]").forEach((select) =>
      select.addEventListener("change", () => {
        const [id, variantId] = select.dataset.qty.split(":").map(Number);
        setBagQty(id, variantId || null, Number(select.value));
        draw();
      }));
    root.querySelectorAll("[data-remove]").forEach((button) =>
      button.addEventListener("click", () => {
        const [id, variantId] = button.dataset.remove.split(":").map(Number);
        setBagQty(id, variantId || null, 0);
        draw();
      }));
  };

  draw();
}

document.addEventListener("DOMContentLoaded", () => {
  const root = $("#bagroot");
  if (root) renderBag(root);
});
