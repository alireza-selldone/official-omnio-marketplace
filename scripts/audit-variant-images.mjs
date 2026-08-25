const base = "https://xapi.selldone.com/shops/@fashioni";
async function fetchJson(url) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(url);
    const text = await response.text();
    if (response.ok && text.trim().startsWith("{")) return JSON.parse(text);
    if (response.status !== 429) throw new Error(`${url} failed (${response.status}): ${text.slice(0, 60)}`);
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  throw new Error(`${url} remained rate limited after retries.`);
}

const listing = await fetchJson(`${base}/products/all?dir=*&limit=250&products_only=true&with_category=true&with_total=true`);
const products = listing.products || listing.data || [];
const details = [];
for (let offset = 0; offset < products.length; offset += 2) {
  const batch = products.slice(offset, offset + 2);
  details.push(...await Promise.all(batch.map(async (row) => {
    return (await fetchJson(`${base}/products/${row.id}/info`)).product;
  })));
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const normalize = (value) => String(value || "").trim().toLowerCase();
const report = details.map((product) => {
  const enabled = (product.product_variants || []).filter((variant) => variant.enable !== false);
  const colors = [...new Set(enabled.map((variant) => normalize(variant.color)).filter(Boolean))];
  const imagePaths = [product.icon, ...(product.images || []).map((image) => image.path)].filter(Boolean);
  const mappedColors = new Set(enabled.filter((variant) => variant.image).map((variant) => normalize(variant.color)).filter(Boolean));
  return {
    id: product.id,
    title: product.title,
    variants: enabled.length,
    colors: colors.length,
    visuals: new Set(imagePaths).size,
    apiMappedColors: mappedColors.size,
    shortage: Math.max(0, colors.length - new Set(imagePaths).size),
    colorsList: colors,
    missingColorValues: colors.slice(new Set(imagePaths).size),
  };
});

const shortages = report.filter((row) => row.shortage > 0);
console.log(JSON.stringify({
  products: report.length,
  variantRows: report.reduce((sum, row) => sum + row.variants, 0),
  multiColorProducts: report.filter((row) => row.colors > 1).length,
  apiFullyMappedProducts: report.filter((row) => row.colors > 0 && row.apiMappedColors === row.colors).length,
  deterministicFrontendCoverage: shortages.length === 0,
  shortageProducts: shortages,
}, null, 2));
