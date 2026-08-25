import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const audit = JSON.parse(await readFile(resolve(".tmp/catalog-media-audit.json"), "utf8"));
const inferred = JSON.parse(await readFile(resolve(".tmp/catalog-color-candidates.json"), "utf8"));
const inferredById = new Map(inferred.products.map((product) => [product.id, product]));

const PALETTE = {
  black: "#111111", white: "#FFFFFF", gray: "#808080", navy: "#243B64",
  blue: "#3D66A3", cyan: "#31A7C7", teal: "#2B7A78", green: "#467A4B",
  olive: "#727B3B", yellow: "#E1B83E", orange: "#D77838", red: "#B8403D",
  pink: "#D58BA3", purple: "#795B99", brown: "#76513E", beige: "#D7C3A5",
};

const LOCKED = new Set([...Array.from({ length: 20 }, (_, index) => 710320 + index), 710143]);
const SHOE_OVERRIDES = new Map([
  [710310, ["#D9D9D9"]], [710311, ["#111111"]], [710312, ["#243B64"]],
  [710313, ["#FFFFFF"]], [710314, ["#727B3B"]], [710315, ["#808080"]],
  [710316, ["#5C7C82"]], [710317, ["#B8403D"]], [710318, ["#243B64"]],
  [710319, ["#111111"]],
]);

function parseHex(value) {
  const match = String(value || "").match(/#[0-9a-f]{6}/i);
  if (!match) return null;
  const hex = match[0].slice(1);
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

function nearestPalette(current, palette) {
  const rgb = parseHex(current);
  if (!palette?.length) return null;
  if (!rgb || String(current).includes("/")) return palette[0]?.hex || null;
  return [...palette].sort((a, b) => distance(rgb, parseHex(a.hex)) - distance(rgb, parseHex(b.hex)))[0]?.hex || null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.toUpperCase()))];
}

const plans = [];
for (const product of audit.products) {
  if (LOCKED.has(product.id)) continue;
  const colorData = inferredById.get(product.id);
  if (!colorData) continue;
  if (SHOE_OVERRIDES.has(product.id)) {
    plans.push({ id: product.id, title: product.title, locked: true, desiredColors: SHOE_OVERRIDES.get(product.id), mappings: [], additions: [], deletions: [] });
    continue;
  }

  const assetsByPath = new Map(colorData.assets.map((asset) => [asset.path, asset]));
  const iconPalette = colorData.assets.find((asset) => asset.role === "icon")?.palette || [];
  const currentGroups = new Map();
  for (const variant of product.variants.filter((variant) => variant.color)) {
    if (!currentGroups.has(variant.color)) currentGroups.set(variant.color, []);
    currentGroups.get(variant.color).push(variant);
  }

  const suggested = [];
  const groupSuggestions = [];
  for (const [currentColor, variants] of currentGroups) {
    const representative = variants.find((variant) => variant.image);
    const palette = representative ? assetsByPath.get(representative.image)?.palette : iconPalette;
    const target = nearestPalette(currentColor, palette || iconPalette);
    groupSuggestions.push({ currentColor, target, variants, source: representative ? "variant-image" : "icon" });
    if (target) suggested.push(target);
  }
  const desiredColors = unique(suggested).slice(0, 5);
  if (!desiredColors.length && currentGroups.size) desiredColors.push("#808080");

  const used = new Set();
  const mappings = [];
  const deletions = [];
  for (const group of groupSuggestions) {
    let target = desiredColors.find((color) => color === group.target && !used.has(color));
    if (!target) target = desiredColors.find((color) => !used.has(color));
    if (!target) {
      deletions.push({ currentColor: group.currentColor, variantIds: group.variants.map((variant) => variant.id) });
      continue;
    }
    used.add(target);
    mappings.push({
      currentColor: group.currentColor,
      targetColor: target,
      source: group.source,
      variantIds: group.variants.map((variant) => variant.id),
    });
  }

  const additions = desiredColors.filter((color) => !used.has(color));
  const sizeTokens = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{1,2}(?:-\d{1,2})?(?:M|Y)?)$/i;
  const dimensions = ["type", "style", "volume", "weight", "pack"];
  const dimensionOptions = dimensions.map((dimension) => ({
    dimension,
    values: unique(product.variants.map((variant) => variant[dimension]).filter((value) => sizeTokens.test(value))),
  })).sort((a, b) => b.values.length - a.values.length);
  const sizeDimension = dimensionOptions[0]?.values.length >= 2 ? dimensionOptions[0].dimension : null;
  const sizes = sizeDimension ? dimensionOptions[0].values : [];
  plans.push({
    id: product.id,
    title: product.title,
    sizeDimension,
    sizes,
    desiredColors,
    mappings,
    additions,
    deletions,
  });
}

const output = resolve(".tmp/catalog-color-plan.json");
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), products: plans }, null, 2));
console.log(JSON.stringify({
  output,
  products: plans.length,
  mappings: plans.reduce((sum, plan) => sum + plan.mappings.length, 0),
  additions: plans.reduce((sum, plan) => sum + plan.additions.length, 0),
  deletions: plans.reduce((sum, plan) => sum + plan.deletions.reduce((count, item) => count + item.variantIds.length, 0), 0),
}, null, 2));
