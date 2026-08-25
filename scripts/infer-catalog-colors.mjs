import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const REPORT_PATH = resolve(".tmp/catalog-media-audit.json");
const OUTPUT_PATH = resolve(".tmp/catalog-color-candidates.json");
const report = JSON.parse(await readFile(REPORT_PATH, "utf8"));

const PALETTE = {
  black: "#111111", white: "#FFFFFF", gray: "#808080", navy: "#243B64",
  blue: "#3D66A3", cyan: "#31A7C7", teal: "#2B7A78", green: "#467A4B",
  olive: "#727B3B", yellow: "#E1B83E", orange: "#D77838", red: "#B8403D",
  pink: "#D58BA3", purple: "#795B99", brown: "#76513E", beige: "#D7C3A5",
};
const WORD_TO_NAME = {
  charcoal: "black", grey: "gray", silver: "gray", indigo: "navy", turquoise: "teal",
  sage: "green", burgundy: "red", maroon: "red", coral: "orange", mustard: "yellow",
  gold: "yellow", rose: "pink", violet: "purple", lilac: "purple", lavender: "purple",
  plum: "purple", cream: "beige", ivory: "white", sand: "beige", tan: "beige",
  camel: "brown",
};

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, max ? delta / max : 0, max];
}

function classify(r, g, b) {
  const [h, s, v] = rgbToHsv(r, g, b);
  if (v < 0.19) return "black";
  if (s < 0.12 && v > 0.86) return "white";
  if (s < 0.16) return "gray";
  if (h >= 18 && h < 48 && s < 0.48 && v > 0.58) return "beige";
  if (h >= 8 && h < 45 && v < 0.62) return "brown";
  if (h < 14 || h >= 346) return "red";
  if (h < 42) return "orange";
  if (h < 67) return "yellow";
  if (h < 92) return "olive";
  if (h < 155) return "green";
  if (h < 184) return "teal";
  if (h < 202) return "cyan";
  if (h < 225) return v < 0.48 ? "navy" : "blue";
  if (h < 257) return "navy";
  if (h < 305) return "purple";
  return "pink";
}

function backgroundMask(data, width, height) {
  const pixels = width * height;
  const mask = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0, tail = 0;
  const isBackground = (pixel) => {
    const offset = pixel * 4;
    const r = data[offset], g = data[offset + 1], b = data[offset + 2], a = data[offset + 3];
    if (a < 20) return true;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), avg = (r + g + b) / 3;
    return a > 245 && max - min < 14 && avg > 224;
  };
  const enqueue = (pixel) => {
    if (pixel < 0 || pixel >= pixels || mask[pixel] || !isBackground(pixel)) return;
    mask[pixel] = 1;
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
  return mask;
}

async function paletteOf(file) {
  const { data, info } = await sharp(file).rotate().resize({ width: 180, height: 180, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const background = backgroundMask(data, width, height);
  const counts = Object.fromEntries(Object.keys(PALETTE).map((name) => [name, 0]));
  let total = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const pixel = y * width + x, offset = pixel * 4;
    if (background[pixel] || data[offset + 3] < 40) continue;
    const nx = (x + 0.5) / width, ny = (y + 0.5) / height;
    const centerWeight = nx > 0.12 && nx < 0.88 && ny > 0.14 && ny < 0.95 ? 2 : 1;
    const lowerBodyWeight = ny > 0.32 && ny < 0.9 ? 1.35 : 1;
    const weight = centerWeight * lowerBodyWeight;
    counts[classify(data[offset], data[offset + 1], data[offset + 2])] += weight;
    total += weight;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, hex: PALETTE[name], ratio: total ? count / total : 0 }))
    .filter((entry) => entry.ratio >= 0.055)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 4);
}

function canonicalAssets(product) {
  const preferred = new Map(product.variants.filter((variant) => variant.image).map((variant) => [variant.id, variant.image]));
  const grouped = new Map();
  const out = product.assets.filter((asset) => !asset.variantId);
  product.assets.filter((asset) => asset.variantId).forEach((asset) => {
    if (!grouped.has(asset.variantId)) grouped.set(asset.variantId, []);
    grouped.get(asset.variantId).push(asset);
  });
  grouped.forEach((assets, variantId) => {
    out.push(assets.find((asset) => asset.path === preferred.get(variantId)) || assets[0]);
  });
  return out;
}

const products = [];
for (const product of report.products) {
  const assets = canonicalAssets(product);
  const assetPalettes = [];
  for (const asset of assets) {
    try { assetPalettes.push({ role: asset.role, path: asset.path, file: asset.file, palette: await paletteOf(asset.file) }); }
    catch (error) { assetPalettes.push({ role: asset.role, path: asset.path, file: asset.file, palette: [], error: String(error) }); }
  }
  const wordColors = [...new Set(product.colorWords.map((word) => WORD_TO_NAME[word] || word).filter((name) => PALETTE[name]))];
  const visualColors = [];
  assetPalettes.forEach((asset) => {
    const first = asset.palette[0];
    if (first && first.ratio >= 0.16 && !visualColors.includes(first.name)) visualColors.push(first.name);
  });
  const candidates = [...new Set([...wordColors, ...visualColors])].slice(0, 4);
  products.push({
    id: product.id,
    title: product.title,
    currentColors: [...new Set(product.variants.map((variant) => variant.color).filter(Boolean))],
    sizes: [...new Set(product.variants.map((variant) => variant.type).filter(Boolean))],
    wordColors,
    visualColors,
    candidates: candidates.map((name) => ({ name, hex: PALETTE[name] })),
    assets: assetPalettes,
  });
}

await mkdir(resolve(".tmp"), { recursive: true });
await writeFile(OUTPUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), products }, null, 2));
console.log(JSON.stringify({ output: OUTPUT_PATH, products: products.length, withoutCandidates: products.filter((product) => !product.candidates.length).length }, null, 2));
