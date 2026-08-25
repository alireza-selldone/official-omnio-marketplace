/* Omnio listing.
 *
 * A left filter rail and horizontal result rows, which is the shape large
 * catalogue retail settled on for a reason: a row gives the title enough
 * width to be read rather than truncated, and puts price, rating, delivery
 * and seller on one scan line so two results can be compared without opening
 * either.
 *
 * Every facet is counted from the products actually in the result set, so a
 * filter never offers a choice that leads nowhere.
 */

import { loadCatalog, money, promotionSafeProducts } from "./shop-data.js";
import { esc } from "./app.js";

const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);

const state = {
  cat: params.get("cat") || "",
  brand: params.get("brand") || "",
  vendor: params.get("vendor") || "",
  sort: params.get("sort") || "featured",
  min: Number(params.get("min")) || 0,
  max: Number(params.get("max")) || 0,
  stock: params.get("stock") === "1",
  deal: params.get("deal") === "1",
};

function pushState() {
  const next = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => {
    if (value === "" || value === 0 || value === false || value === "featured") return;
    next.set(key, value === true ? "1" : String(value));
  });
  history.replaceState(null, "", next.toString() ? `?${next}` : location.pathname);
}

const SORTS = [
  ["featured", "Featured"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["discount", "Biggest saving"],
  ["new", "Newest arrivals"],
];

function sortProducts(rows) {
  const list = [...rows];
  const saving = (p) => (p.was && p.was > p.price) ? 1 - p.price / p.was : 0;
  if (state.sort === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (state.sort === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (state.sort === "discount") list.sort((a, b) => saving(b) - saving(a));
  else if (state.sort === "new") list.sort((a, b) => Number(b.id) - Number(a.id));
  return list;
}

/* Facets count against everything except their own dimension, so ticking one
   brand does not make every other brand read as "0". */
function facetCounts(all, dimension) {
  const rows = all.filter((product) => {
    if (dimension !== "cat" && state.cat && product.cat !== state.cat) return false;
    if (dimension !== "brand" && state.brand && product.brand !== state.brand) return false;
    if (dimension !== "vendor" && state.vendor && product.vendorSlug !== state.vendor) return false;
    if (state.stock && !(product.qty > 0)) return false;
    if (state.deal && !(product.was > product.price)) return false;
    if (state.min && product.price < state.min) return false;
    if (state.max && product.price > state.max) return false;
    return true;
  });
  const counts = new Map();
  rows.forEach((product) => {
    const key = dimension === "cat" ? product.cat
      : dimension === "brand" ? product.brand : product.vendorSlug;
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function applyFilters(all) {
  return all.filter((product) => {
    if (state.cat && product.cat !== state.cat) return false;
    if (state.brand && product.brand !== state.brand) return false;
    if (state.vendor && product.vendorSlug !== state.vendor) return false;
    if (state.stock && !(product.qty > 0)) return false;
    if (state.deal && !(product.was > product.price)) return false;
    if (state.min && product.price < state.min) return false;
    if (state.max && product.price > state.max) return false;
    return true;
  });
}

function facetHTML(title, dimension, entries, current) {
  if (entries.length < 2) return "";
  return `<section class="ofacet">
    <h3>${esc(title)}</h3>
    <ul>
      ${current ? `<li><button type="button" data-clear="${dimension}" class="ofacet__clear">&larr; All ${esc(title.toLowerCase())}</button></li>` : ""}
      ${entries.slice(0, 12).map(([value, label, count]) => `
        <li><button type="button" data-facet="${dimension}" data-value="${esc(value)}"
          class="${value === current ? "is-on" : ""}" aria-pressed="${value === current}">
          ${esc(label)} <small>${count}</small></button></li>`).join("")}
    </ul>
  </section>`;
}

function rowHTML(product) {
  const saving = product.was && product.was > product.price
    ? Math.round((1 - product.price / product.was) * 100) : 0;
  const score = Math.round(Number(product.rate) || 0);
  return `<article class="orow">
    <a class="orow__art" href="product.html?id=${product.id}">
      <img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" width="200" height="200">
    </a>
    <div class="orow__body">
      <a class="orow__name" href="product.html?id=${product.id}">${esc(product.name)}</a>
      ${product.brand ? `<p class="orow__brand">by ${esc(product.brand)}</p>` : ""}
      ${product.rateCount ? `<p class="orow__rate"><span aria-label="${score} out of 5">${"★".repeat(score)}${"☆".repeat(5 - score)}</span> <small>${product.rateCount}</small></p>` : ""}
      <p class="orow__price">
        <b>${money(product.price)}</b>
        ${product.was > product.price ? `<s>${money(product.was)}</s><em>${saving}% off</em>` : ""}
      </p>
      ${product.vendorName ? `<p class="orow__seller">Sold by <a href="vendor.html?vendor=${esc(product.vendorSlug)}">${esc(product.vendorName)}</a></p>` : ""}
      <p class="orow__stock${product.qty > 0 ? "" : " is-out"}">${product.qty > 0 ? "In stock" : "Currently unavailable"}</p>
    </div>
    <div class="orow__act">
      <a class="obtn obtn--act" href="product.html?id=${product.id}">See options</a>
    </div>
  </article>`;
}

async function init() {
  const root = $("#shoproot");
  if (!root) return;
  const catalog = await loadCatalog();
  const all = promotionSafeProducts(catalog.products);
  const catName = (slug) => catalog.cats.find((c) => c.slug === slug)?.name || slug;

  const render = () => {
    const results = sortProducts(applyFilters(all));

    const catCounts = facetCounts(all, "cat");
    const brandCounts = facetCounts(all, "brand");
    const vendorCounts = facetCounts(all, "vendor");
    const vendorName = (slug) => all.find((p) => p.vendorSlug === slug)?.vendorName || slug;

    const heading = state.cat ? catName(state.cat)
      : state.brand ? state.brand
      : state.vendor ? vendorName(state.vendor) : "All products";

    root.innerHTML = `
      <div class="olist">
        <aside class="olist__rail" aria-label="Refine results">
          ${facetHTML("Department", "cat",
            [...catCounts.entries()].sort((a, b) => b[1] - a[1]).map(([slug, n]) => [slug, catName(slug), n]),
            state.cat)}
          ${facetHTML("Seller", "vendor",
            [...vendorCounts.entries()].sort((a, b) => b[1] - a[1]).map(([slug, n]) => [slug, vendorName(slug), n]),
            state.vendor)}
          ${facetHTML("Brand", "brand",
            [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => [name, name, n]),
            state.brand)}
          <section class="ofacet">
            <h3>Price</h3>
            <div class="ofacet__price">
              <label class="sr" for="ofmin">Minimum price</label>
              <input id="ofmin" type="number" inputmode="numeric" placeholder="Min" value="${state.min || ""}">
              <span>to</span>
              <label class="sr" for="ofmax">Maximum price</label>
              <input id="ofmax" type="number" inputmode="numeric" placeholder="Max" value="${state.max || ""}">
              <button type="button" data-price>Go</button>
            </div>
          </section>
          <section class="ofacet">
            <h3>Show</h3>
            <label class="ofacet__check"><input type="checkbox" data-toggle="stock" ${state.stock ? "checked" : ""}> In stock only</label>
            <label class="ofacet__check"><input type="checkbox" data-toggle="deal" ${state.deal ? "checked" : ""}> Reduced right now</label>
          </section>
        </aside>

        <div class="olist__main">
          <div class="olist__hd">
            <div><h1>${esc(heading)}</h1>
              <p>${results.length} result${results.length === 1 ? "" : "s"}</p></div>
            <label class="olist__sort" for="osort"><span>Sort by</span>
              <select id="osort">${SORTS.map(([value, label]) =>
                `<option value="${value}"${state.sort === value ? " selected" : ""}>${label}</option>`).join("")}</select>
            </label>
          </div>
          ${results.length
            ? `<div class="olist__rows">${results.slice(0, 60).map(rowHTML).join("")}</div>`
            : `<p class="olist__none">Nothing matches those filters yet. Try removing one.</p>`}
        </div>
      </div>`;

    root.querySelectorAll("[data-facet]").forEach((button) =>
      button.addEventListener("click", () => {
        const dimension = button.dataset.facet;
        state[dimension] = state[dimension] === button.dataset.value ? "" : button.dataset.value;
        pushState(); render();
      }));
    root.querySelectorAll("[data-clear]").forEach((button) =>
      button.addEventListener("click", () => { state[button.dataset.clear] = ""; pushState(); render(); }));
    root.querySelectorAll("[data-toggle]").forEach((box) =>
      box.addEventListener("change", () => { state[box.dataset.toggle] = box.checked; pushState(); render(); }));
    $("#osort")?.addEventListener("change", (event) => { state.sort = event.target.value; pushState(); render(); });
    root.querySelector("[data-price]")?.addEventListener("click", () => {
      state.min = Number($("#ofmin").value) || 0;
      state.max = Number($("#ofmax").value) || 0;
      pushState(); render();
    });
  };

  render();
}

document.addEventListener("DOMContentLoaded", init);
