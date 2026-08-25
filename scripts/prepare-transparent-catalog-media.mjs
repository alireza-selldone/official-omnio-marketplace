import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import sharp from "sharp";

const report = JSON.parse(await readFile(resolve(".tmp/catalog-media-audit.json"), "utf8"));
const outputDir = resolve(".tmp/catalog-transparent");
await mkdir(outputDir, { recursive: true });

function canonicalAssets(product) {
  const preferred = new Map(product.variants.filter((variant) => variant.image).map((variant) => [variant.id, variant.image]));
  const grouped = new Map();
  const out = product.assets.filter((asset) => !asset.variantId);
  product.assets.filter((asset) => asset.variantId).forEach((asset) => {
    if (!grouped.has(asset.variantId)) grouped.set(asset.variantId, []);
    grouped.get(asset.variantId).push(asset);
  });
  grouped.forEach((assets, variantId) => out.push(assets.find((asset) => asset.path === preferred.get(variantId)) || assets[0]));
  return out;
}

async function removeConnectedNeutralBackground(input) {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pixels = width * height;
  const seen = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  const isBackground = (pixel) => {
    const offset = pixel * 4;
    const r = data[offset], g = data[offset + 1], b = data[offset + 2], a = data[offset + 3];
    const high = Math.max(r, g, b), low = Math.min(r, g, b), avg = (r + g + b) / 3;
    return a < 20 || (high - low <= 24 && avg >= 216);
  };
  const enqueue = (pixel) => {
    if (pixel < 0 || pixel >= pixels || seen[pixel] || !isBackground(pixel)) return;
    seen[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++], x = pixel % width;
    if (x) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < pixels) enqueue(pixel + width);
  }
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4;
    if (seen[pixel]) data[offset + 3] = 0;
    if (data[offset + 3] === 0) data[offset] = data[offset + 1] = data[offset + 2] = 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

const outputs = [];
for (const product of report.products) {
  for (const asset of canonicalAssets(product)) {
    const affected = asset.analysis.whiteBackdrop || asset.analysis.brightNeutralBackdrop;
    const isPrimary = asset.role === "icon";
    const isVariant = Boolean(asset.variantId && product.variants.some((variant) => variant.id === asset.variantId && variant.image === asset.path));
    if (!affected || (!isPrimary && !isVariant)) continue;
    const transparent = await removeConnectedNeutralBackground(asset.file);
    const subject = await sharp(transparent).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: false }).png().toBuffer();
    const filename = `${product.id}-${isPrimary ? "icon" : `variant-${asset.variantId}`}.png`;
    const output = resolve(outputDir, filename);
    await sharp({ create: { width: 1200, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: subject, gravity: "center" }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(output);
    const stats = await sharp(output).stats();
    outputs.push({ productId: product.id, title: product.title, role: asset.role, variantId: asset.variantId, source: asset.path, output, filename: basename(output), alphaMin: stats.channels[3]?.min, alphaMax: stats.channels[3]?.max });
  }
}

const manifest = resolve(".tmp/catalog-transparent-manifest.json");
await writeFile(manifest, JSON.stringify({ generatedAt: new Date().toISOString(), outputs }, null, 2));
console.log(JSON.stringify({ manifest, images: outputs.length, icons: outputs.filter((item) => item.variantId == null).length, variants: outputs.filter((item) => item.variantId != null).length }, null, 2));
