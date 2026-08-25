/* Omnio checkout.
 *
 * Numbered sections down the left, an order panel on the right that stays put,
 * and a slimmed header: once a shopper is buying, navigation is a way out, not
 * a service, so the chrome loses everything except the logo and the lock.
 *
 * There are no card fields anywhere on this page. Card details are entered on
 * the payment provider's own encrypted page, which is both where the real flow
 * sends them and the reason a storefront should not present inputs that look
 * like they collect them.
 */

import {
  loadCatalog, money, bagLines, bagSubtotal, setBagQty, syncBagToSelldone, swatchLabel,
} from "./shop-data.js";
import { variantSizeOptions, variantSizeValue } from "./variant-options.js";
import { storefrontAuth } from "../shared/auth-client.js";
import { getPublicConfig } from "../shared/runtime-config.js";
import { esc } from "./app.js";

const $ = (s, r = document) => r.querySelector(s);
const FREE_OVER = 45;

function variantBits(line) {
  const variant = line.variant;
  if (!variant) return "";
  const field = variantSizeOptions([variant]).field;
  const size = field ? variantSizeValue(variant, field) : "";
  return [variant.color ? swatchLabel(variant.color) : "", size].filter(Boolean).join(" · ");
}

function step(number, title, body, done = false) {
  return `<section class="ostep${done ? " is-done" : ""}">
    <div class="ostep__hd"><span>${number}</span><h2>${esc(title)}</h2></div>
    <div class="ostep__bd">${body}</div>
  </section>`;
}

function addressStep() {
  const field = (id, label, attrs = "") =>
    `<label class="ofield" for="${id}"><span>${label}</span><input id="${id}" ${attrs}></label>`;
  return step(1, "Delivery address", `
    <div class="ogrid2">
      ${field("ck-name", "Full name", 'autocomplete="name"')}
      ${field("ck-phone", "Phone", 'type="tel" autocomplete="tel"')}
    </div>
    ${field("ck-street", "Address", 'autocomplete="street-address" placeholder="Street, building, apartment"')}
    <div class="ogrid3">
      ${field("ck-city", "City", 'autocomplete="address-level2"')}
      ${field("ck-region", "Region", 'autocomplete="address-level1"')}
      ${field("ck-post", "Postal code", 'autocomplete="postal-code"')}
    </div>
    <label class="ofield" for="ck-country"><span>Country</span>
      <select id="ck-country" autocomplete="country-name">
        <option>United Kingdom</option><option>Germany</option><option>France</option>
        <option>Netherlands</option><option>Spain</option><option>Italy</option>
      </select></label>`);
}

function paymentStep() {
  const option = (value, title, note, checked = false) => `
    <label class="opay${checked ? " is-on" : ""}">
      <input type="radio" name="ckpay" value="${value}"${checked ? " checked" : ""}>
      <span class="opay__dot" aria-hidden="true"></span>
      <span><b>${esc(title)}</b><small>${esc(note)}</small></span>
    </label>`;
  return step(2, "Payment method", `
    <div role="radiogroup" aria-label="Payment method">
      ${option("card", "Credit or debit card", "Visa, Mastercard, Amex", true)}
      ${option("wallet", "Wallet", "Apple Pay, Google Pay, PayPal")}
      ${option("cod", "Cash on delivery", "Pay the courier on arrival")}
    </div>
    <p class="osecure">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
      Card details are entered on the payment provider's encrypted page after this step.
      This site never sees or stores a card number.</p>`);
}

function reviewStep(lines) {
  return step(3, "Review items and delivery", `
    <div class="oreview">
      ${lines.map((line) => {
        const bits = variantBits(line);
        return `<div class="oreview__row">
          <span class="oreview__art"><img src="${esc(line.p.image)}" alt="" width="70" height="70" loading="lazy"></span>
          <div>
            <b>${esc(line.p.name)}</b>
            ${bits ? `<small>${esc(bits)}</small>` : ""}
            <span class="oreview__qty">
              <button type="button" data-step="-1" data-key="${line.p.id}:${line.variantId || 0}" aria-label="Fewer">&minus;</button>
              <em>${line.qty}</em>
              <button type="button" data-step="1" data-key="${line.p.id}:${line.variantId || 0}" aria-label="More">+</button>
            </span>
          </div>
          <span class="oreview__money">${money(line.unitPrice * line.qty)}</span>
        </div>`;
      }).join("")}
    </div>`);
}

function panelHTML(lines, subtotal, buttonLabel, note) {
  const count = lines.reduce((n, line) => n + line.qty, 0);
  const free = subtotal >= FREE_OVER;
  return `<aside class="opanel">
    <button class="obtn obtn--act obtn--full" type="button" id="ckgo">${esc(buttonLabel)}</button>
    <p class="opanel__note" id="ckstatus" role="status">${esc(note || "")}</p>
    <hr>
    <h2>Order summary</h2>
    <div class="opanel__row"><span>Items (${count})</span><span>${money(subtotal)}</span></div>
    <div class="opanel__row"><span>Delivery</span><span${free ? ' class="is-free"' : ""}>${free ? "Free" : "At checkout"}</span></div>
    <div class="opanel__row"><span>Tax</span><span>At checkout</span></div>
    <div class="opanel__total"><span>Order total</span><b>${money(subtotal)}</b></div>
    ${!free ? `<p class="opanel__nudge">Add ${money(FREE_OVER - subtotal)} more for free delivery.</p>` : ""}
  </aside>`;
}

async function init() {
  const root = $("#ckroot");
  if (!root) return;
  const catalog = await loadCatalog();

  /* Sign-in needs an OAuth client. Resolve the failure into a state the page
     can render rather than letting it throw inside the click handler, where a
     shopper sees a button that does nothing. */
  const session = storefrontAuth.session().catch((error) => ({
    authenticated: false, unavailable: String(error?.message || error),
  }));

  const draw = () => {
    const lines = bagLines(catalog);
    if (!lines.length) {
      root.innerHTML = `<div class="oempty"><h1>Your bag is empty</h1>
        <p>Once you add something it will appear here.</p>
        <a class="obtn obtn--act" href="shop.html">Browse the catalogue</a></div>`;
      return;
    }
    const subtotal = bagSubtotal(catalog);
    root.innerHTML = `
      <div class="ocheckout">
        <div class="ocheckout__main">
          ${addressStep()}${paymentStep()}${reviewStep(lines)}
        </div>
        ${panelHTML(lines, subtotal, "Continue to secure payment", "")}
      </div>`;

    root.querySelectorAll("[data-step]").forEach((button) =>
      button.addEventListener("click", () => {
        const [id, variantId] = button.dataset.key.split(":").map(Number);
        const line = bagLines(catalog).find((l) => l.p.id === id && (l.variantId || 0) === variantId);
        if (!line) return;
        setBagQty(id, variantId || null, line.qty + Number(button.dataset.step));
        draw();
      }));

    root.querySelectorAll('input[name="ckpay"]').forEach((input) =>
      input.addEventListener("change", () =>
        root.querySelectorAll(".opay").forEach((label) =>
          label.classList.toggle("is-on", label.contains(input) && input.checked))));

    const go = $("#ckgo");
    const status = $("#ckstatus");
    session.then((value) => {
      if (value.unavailable) {
        go.disabled = true;
        go.textContent = "Checkout unavailable";
        status.textContent = "Sign-in is not configured for this shop yet.";
      } else if (!value.authenticated) {
        go.textContent = "Sign in to continue";
      }
    });

    go.addEventListener("click", async () => {
      go.disabled = true;
      status.textContent = "Checking your session…";
      try {
        const value = await session;
        if (value.unavailable) throw new Error("Sign-in is not configured for this shop yet.");
        if (!value.authenticated) { await storefrontAuth.startLogin("/checkout.html"); return; }
        status.textContent = "Updating your secure basket…";
        await syncBagToSelldone(value.accessToken, catalog);
        const domain = getPublicConfig().shop.domain;
        if (!domain) throw new Error("This shop has no checkout domain configured.");
        const base = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
        location.assign(`${base.replace(/\/$/, "")}/basket`);
      } catch (error) {
        status.textContent = error?.message || "Checkout is temporarily unavailable.";
        go.disabled = false;
      }
    });
  };

  draw();
}

document.addEventListener("DOMContentLoaded", init);
