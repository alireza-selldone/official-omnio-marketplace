import assert from "node:assert/strict";
import {
  normalizeVariantSize,
  variantSizeOptions,
  variantSizeValue,
} from "../storefront/variant-options.js";

const mixedLegacyRows = [
  { color: "#111111", type: "XS", style: "Red-Blue{s1}" },
  { color: "#FFFFFF", type: "s", style: "White Dark" },
  { color: "#808080", type: "M", style: "{texture-sued}" },
  { color: "#795B99", type: "l", style: "{black-leathe}" },
];
const apparel = variantSizeOptions(mixedLegacyRows);
assert.equal(apparel.field, "type");
assert.deepEqual(apparel.values, ["XS", "S", "M", "L"]);
assert.equal(variantSizeValue(mixedLegacyRows[1], apparel.field), "S");

const footwear = variantSizeOptions([28, 29, 30, 31, 32, 33, 34, 35].map((type) => ({ type: String(type) })));
assert.equal(footwear.field, "type");
assert.deepEqual(footwear.values, ["28", "29", "30", "31", "32", "33", "34", "35"]);

const ages = variantSizeOptions(["6-12m", "0\u20133M", "3Y", "2y"].map((type) => ({ type })));
assert.deepEqual(ages.values, ["0\u20133M", "6\u201312M", "2Y", "3Y"]);

for (const token of ["{black-leathe}", "{brown-concre}", "{texture-sued}", "{original-gra}", "White Dark"]) {
  assert.equal(normalizeVariantSize(token), null);
}
assert.deepEqual(variantSizeOptions([{ type: "{black-leathe}" }, { type: "{texture-sued}" }]), { field: null, values: [] });

console.log("variant size classification: passed");
