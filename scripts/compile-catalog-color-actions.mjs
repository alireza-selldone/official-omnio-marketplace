import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const audit = JSON.parse(await readFile(resolve(".tmp/catalog-media-audit.json"), "utf8"));
const plan = JSON.parse(await readFile(resolve(".tmp/catalog-color-plan.json"), "utf8"));
const auditById = new Map(audit.products.map((product) => [product.id, product]));
const actions = [];

for (const item of plan.products) {
  if (item.locked) continue;
  const source = auditById.get(item.id);
  if (!source) continue;
  const variantById = new Map(source.variants.map((variant) => [variant.id, variant]));
  for (const mapping of item.mappings) {
    if (mapping.currentColor.toUpperCase() === mapping.targetColor.toUpperCase()) continue;
    for (const variantId of mapping.variantIds) {
      const variant = variantById.get(variantId);
      if (!variant) continue;
      actions.push({
        kind: "edit",
        productId: item.id,
        title: item.title,
        args: {
          product_id: item.id,
          variant_id: variant.id,
          color: mapping.targetColor,
          quantity: variant.quantity,
          sku: variant.sku || "",
          type: variant.type || "",
          style: variant.style || "",
          volume: variant.volume || "",
          weight: variant.weight || "",
          pack: variant.pack || "",
          pricing: Boolean(variant.pricing),
          price: Number(variant.price || 0),
          currency: variant.currency || "USD",
          commission: 0,
          discount: Number(variant.discount || 0),
          image: variant.image || undefined,
          enable: true,
          confirm: true,
        },
      });
    }
  }
  for (const deletion of item.deletions) {
    for (const variantId of deletion.variantIds) actions.push({
      kind: "delete",
      productId: item.id,
      title: item.title,
      args: { product_id: item.id, variant_id: variantId, confirm: true },
    });
  }
  if (item.sizeDimension && item.sizes.length && item.desiredColors.length) actions.push({
    kind: "matrix",
    productId: item.id,
    title: item.title,
    args: {
      product_id: item.id,
      type_1: "color",
      options_1: item.desiredColors,
      type_2: item.sizeDimension,
      options_2: item.sizes,
      quantity: 8,
      confirm: true,
    },
  });
}

const output = resolve(".tmp/catalog-color-actions.json");
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), actions }, null, 2));
console.log(JSON.stringify({ output, actions: actions.length, byKind: Object.groupBy(actions, (action) => action.kind) && Object.fromEntries(Object.entries(Object.groupBy(actions, (action) => action.kind)).map(([key, value]) => [key, value.length])) }, null, 2));
