import { mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { selldoneImagePathToUrl } from "../dashboard/features/selldone-images.js";

const SHOP_ID = 14952;
const BASE = "https://xapi.selldone.com/shops/@fashioni";
const ROOT = resolve("storefront/assets/products/variants");
const REFERENCE_DIR = resolve(ROOT, "references");
const PRODUCTS = [
  [710322, ["#a9b6a0", "#d8cbb8"]], [710326, ["#d7a4a4", "#c9b7db"]],
  [710331, ["#3e5c8a", "#a66a4a"]], [710333, ["#244b36", "#3e5c8a"]],
  [710320, ["#a9b6a0", "#b7cbe6"]], [710338, ["#c9b7db", "#f4ebdd"]],
  [710321, ["#b7cbe6", "#d8cbb8"]], [710330, ["#3d5a40", "#3e5c8a"]],
  [710323, ["#d8cbb8", "#b7cbe6"]], [710335, ["#d7a4a4", "#f4ebdd"]],
  [710325, ["#f4ebdd", "#c9b7db"]], [710327, ["#f4ebdd", "#c9b7db"]],
  [710328, ["#d7a4a4", "#c9b7db"]], [710332, ["#3e5c8a", "#7c8798"]],
  [710336, ["#c9b7db", "#3e5c8a"]], [710337, ["#d7a4a4", "#7c8798"]],
  [710324, ["#d8cbb8", "#a9b6a0"]], [710329, ["#f4ebdd", "#c9b7db"]],
  [710334, ["#185bc7", "#244b36"]], [710339, ["#d98c78", "#3e5c8a"]],
];

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
async function fetchJson(url) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(url);
    const text = await response.text();
    if (response.ok && text.trim().startsWith("{")) return JSON.parse(text);
    if (response.status !== 429) throw new Error(`${url} failed (${response.status})`);
    await sleep(1200 * (attempt + 1));
  }
  throw new Error(`${url} remained rate limited.`);
}

await mkdir(REFERENCE_DIR, { recursive: true });
const manifest = [];
for (const [productId, targetColors] of PRODUCTS) {
  const detail = (await fetchJson(`${BASE}/products/${productId}/info`)).product;
  const sourceUrl = selldoneImagePathToUrl(detail.icon, { shopId: SHOP_ID, scope: "products", size: 1024 });
  if (!sourceUrl) throw new Error(`No source image for ${productId}`);
  const sourceResponse = await fetch(sourceUrl);
  if (!sourceResponse.ok) throw new Error(`Image ${sourceUrl} failed (${sourceResponse.status})`);
  const contentType = sourceResponse.headers.get("content-type") || "image/png";
  const extension = contentType.includes("webp") ? "webp" : contentType.includes("jpeg") ? "jpg" : "png";
  const referenceFile = resolve(REFERENCE_DIR, `${productId}.${extension}`);
  await writeFile(referenceFile, Buffer.from(await sourceResponse.arrayBuffer()));
  const variants = (detail.product_variants || []).filter((variant) => variant.enable !== false && !variant.deleted_at);
  for (const color of targetColors) {
    const rows = variants.filter((variant) => String(variant.color).toLowerCase() === color.toLowerCase());
    if (!rows.length) throw new Error(`No ${color} variant for ${productId}`);
    manifest.push({
      productId,
      title: detail.title,
      color: color.toUpperCase(),
      targetVariantId: rows[0].id,
      variantIds: rows.map((row) => row.id),
      referenceFile: relative(process.cwd(), referenceFile).replaceAll("\\", "/"),
      outputFile: relative(process.cwd(), resolve(ROOT, `${productId}-${color.slice(1).toLowerCase()}.png`)).replaceAll("\\", "/"),
    });
  }
  await sleep(450);
}

await writeFile(resolve(ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${PRODUCTS.length} references for ${manifest.length} missing color images.`);
