import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const report = JSON.parse(await readFile(resolve(".tmp/catalog-color-candidates.json"), "utf8"));
const outDir = resolve(".tmp/catalog-contact-sheets");
await mkdir(outDir, { recursive: true });

const rowsPerSheet = 10;
const thumb = 170;
const labelWidth = 360;
const maxAssets = 5;
const rowHeight = 210;
const width = labelWidth + maxAssets * thumb;

function esc(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

for (let offset = 0; offset < report.products.length; offset += rowsPerSheet) {
  const products = report.products.slice(offset, offset + rowsPerSheet);
  const canvas = sharp({ create: { width, height: products.length * rowHeight, channels: 4, background: "#F0F0EE" } });
  const composites = [];
  for (let row = 0; row < products.length; row += 1) {
    const product = products[row];
    const y = row * rowHeight;
    const current = product.currentColors.join(", ") || "none";
    const candidates = product.candidates.map((candidate) => `${candidate.name} ${candidate.hex}`).join(", ") || "none";
    const label = `<svg width="${labelWidth}" height="${rowHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${row % 2 ? "#FAFAF8" : "#FFFFFF"}"/>
      <text x="16" y="31" font-family="Arial" font-size="19" font-weight="700" fill="#111827">${product.id}</text>
      <text x="16" y="59" font-family="Arial" font-size="14" fill="#111827">${esc(product.title).slice(0, 43)}</text>
      <text x="16" y="91" font-family="Arial" font-size="12" fill="#6B7280">CURRENT</text>
      <text x="16" y="111" font-family="Arial" font-size="11" fill="#374151">${esc(current).slice(0, 51)}</text>
      <text x="16" y="143" font-family="Arial" font-size="12" fill="#6B7280">INFERRED</text>
      <text x="16" y="163" font-family="Arial" font-size="11" fill="#374151">${esc(candidates).slice(0, 51)}</text>
      <text x="16" y="192" font-family="Arial" font-size="10" fill="#6B7280">${esc(product.sizes.join(" · ")).slice(0, 56)}</text>
    </svg>`;
    composites.push({ input: Buffer.from(label), left: 0, top: y });
    for (let index = 0; index < Math.min(maxAssets, product.assets.length); index += 1) {
      const asset = product.assets[index];
      try {
        const image = await sharp(asset.file).rotate().resize({ width: thumb - 14, height: thumb - 14, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toBuffer();
        composites.push({ input: image, left: labelWidth + index * thumb + 7, top: y + 7 });
        const palette = asset.palette.slice(0, 2).map((entry) => entry.name).join("/");
        const caption = `<svg width="${thumb}" height="33" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="8" y="21" font-family="Arial" font-size="11" fill="#374151">${esc(asset.role)} · ${esc(palette)}</text></svg>`;
        composites.push({ input: Buffer.from(caption), left: labelWidth + index * thumb, top: y + thumb + 3 });
      } catch { /* missing diagnostic image */ }
    }
  }
  const first = products[0]?.id, last = products.at(-1)?.id;
  const target = join(outDir, `${String(offset / rowsPerSheet + 1).padStart(2, "0")}-${first}-${last}.jpg`);
  await canvas.composite(composites).jpeg({ quality: 88 }).toFile(target);
  console.log(target);
}
