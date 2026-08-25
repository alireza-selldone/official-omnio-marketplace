/* Variant dimensions in Selldone are storage fields, not presentation labels.
   Older catalog records may place material/color slugs in `type` or `style`,
   while current fashion records use one of those fields for an actual size.
   Keep color authoritative in `variant.color` and admit a size only when the
   values in one dimension consistently match a real retail size format. */

export const VARIANT_OPTION_FIELDS = Object.freeze(["type", "style", "volume", "weight", "pack"]);

const ALPHA_SIZE_ORDER = new Map([
  "XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL",
].map((value, index) => [value, index]));

const textOf = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

export function normalizeVariantSize(value) {
  const raw = textOf(value);
  if (!raw || /[{}\[\]#]/.test(raw)) return null;

  let match = raw.match(/^(\d{1,2})\s*[-\u2012-\u2015]\s*(\d{1,2})\s*(M|Y)$/i);
  if (match) return `${Number(match[1])}\u2013${Number(match[2])}${match[3].toUpperCase()}`;

  match = raw.match(/^(\d{1,2})\s*(M|Y)$/i);
  if (match) return `${Number(match[1])}${match[2].toUpperCase()}`;

  const compact = raw.replace(/[\s_-]+/g, "").toUpperCase();
  if (/^(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL)$/.test(compact)) return compact;
  match = compact.match(/^([2-4])XL$/);
  if (match) return `${"X".repeat(Number(match[1]))}L`;
  if (/^(?:OS|OSFA|ONESIZE)$/.test(compact)) return "One Size";

  match = raw.match(/^(EU|US|UK)\s*[-:]?\s*(\d{1,3}(?:\.5)?)$/i);
  if (match) return `${match[1].toUpperCase()} ${Number(match[2])}`;

  match = raw.match(/^(\d{1,3}(?:\.5)?)$/);
  if (match) {
    const numeric = Number(match[1]);
    return numeric >= 1 && numeric <= 200 ? String(numeric) : null;
  }

  match = raw.match(/^(\d{1,3})\s*[-\u2012-\u2015]\s*(\d{1,3})$/);
  if (match) return `${Number(match[1])}\u2013${Number(match[2])}`;

  match = raw.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  if (match) return `${Number(match[1])}/${Number(match[2])}`;

  return null;
}

function sizeSortKey(value) {
  let match = value.match(/^(\d+)\u2013(\d+)M$/);
  if (match) return [0, Number(match[1]), Number(match[2]), value];
  match = value.match(/^(\d+)M$/);
  if (match) return [0, Number(match[1]), Number(match[1]), value];
  match = value.match(/^(\d+)\u2013(\d+)Y$/);
  if (match) return [1, Number(match[1]), Number(match[2]), value];
  match = value.match(/^(\d+)Y$/);
  if (match) return [1, Number(match[1]), Number(match[1]), value];
  if (ALPHA_SIZE_ORDER.has(value)) return [2, ALPHA_SIZE_ORDER.get(value), 0, value];
  match = value.match(/^(EU|US|UK) (\d+(?:\.5)?)$/);
  if (match) return [3, { EU: 0, UK: 1, US: 2 }[match[1]], Number(match[2]), value];
  if (/^\d+(?:\.5)?$/.test(value)) return [4, Number(value), 0, value];
  if (value === "One Size") return [6, 0, 0, value];
  return [5, 0, 0, value];
}

export function compareVariantSizes(left, right) {
  const a = sizeSortKey(left), b = sizeSortKey(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return String(a[3]).localeCompare(String(b[3]), undefined, { numeric: true });
}

export function variantSizeOptions(variants) {
  const rows = Array.isArray(variants) ? variants : [];
  const candidates = VARIANT_OPTION_FIELDS.map((field, priority) => {
    const populated = rows.map((variant) => textOf(variant?.[field])).filter(Boolean);
    const normalized = populated.map(normalizeVariantSize).filter(Boolean);
    const coverage = populated.length ? normalized.length / populated.length : 0;
    return {
      field,
      priority,
      matched: normalized.length,
      coverage,
      values: [...new Set(normalized)].sort(compareVariantSizes),
    };
  }).filter((candidate) => candidate.matched > 0 && candidate.coverage >= 0.6);

  candidates.sort((a, b) =>
    b.matched - a.matched ||
    b.coverage - a.coverage ||
    b.values.length - a.values.length ||
    a.priority - b.priority);

  const best = candidates[0];
  return best ? { field: best.field, values: best.values } : { field: null, values: [] };
}

export function variantSizeValue(variant, field) {
  return field ? normalizeVariantSize(variant?.[field]) : null;
}
