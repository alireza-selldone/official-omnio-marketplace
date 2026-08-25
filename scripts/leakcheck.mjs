/* Does any shop-specific value survive in storefront/ ?
 *
 * The runtime can behave perfectly and the source still carry one shop's
 * values — which resurface the moment someone edits the code rather than
 * running `npm run setup`. This scans the storefront source for category ids,
 * product ids, the shop id and brand copy strings.
 *
 * shop.config.json is excluded on purpose: it IS the place those values live.
 * dist/ is excluded because it is generated from the config.
 *
 * A negative control runs every time. A scan that cannot go red produces
 * confidence and nothing else.
 *
 * Usage: node scripts/leakcheck.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "storefront");

/* The values this repository shipped with. If the template is ever re-based on
   a different demo shop, these change with it. */
const PATTERNS = [
  ["category id", /\b(37955|37956|37957|37958|37959|107902)\b/],
  ["product id", /\b(709\d{3}|325\d{3})\b/],
  ["brand copy", /Z(ü|u)rich and London|EST\.? ?1946|sold by people who repair them/i],
];

let fails = 0;
const fail = (m) => { fails++; console.log("  FAIL  " + m); };
const pass = (m) => console.log("  ok    " + m);

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const f = join(dir, entry);
    if (statSync(f).isDirectory()) { walk(f); continue; }
    // _review.html is a committed record of a past review, not shipped code.
    if (/\.(js|css|html)$/.test(f) && !/_review\.html$/.test(f)) files.push(f);
  }
})(SRC);

console.log(`\nSHOP-SPECIFIC VALUES IN storefront/  (${files.length} files)`);
console.log("-".repeat(64));

/* The identity meta tags are written by `npm run setup`, so their value is
   whatever shop the repo is pointed at. The check is that they AGREE with
   shop.config.json, not that they hold any particular number: a meta that
   disagrees with the config is the state where the storefront and the
   dashboard talk to different shops, which is worse than either value alone. */
{
  const cfg = JSON.parse(readFileSync(join(ROOT, "shop.config.json"), "utf8"));
  const want = String(cfg.shop && cfg.shop.id != null ? cfg.shop.id : "");
  const bad = [];
  for (const f of files.filter((x) => x.endsWith(".html"))) {
    const m = readFileSync(f, "utf8").match(/<meta\s+name="pajulina-shop-id"\s+content="([^"]*)"/);
    if (m && m[1] !== want) {
      bad.push(`${relative(ROOT, f).replace(/\\/g, "/")} says ${m[1]}, config says ${want}`);
    }
  }
  bad.length
    ? bad.forEach((b) => fail(`meta disagrees with config — ${b}`))
    : pass(`every pajulina-shop-id meta agrees with shop.config.json (${want})`);
}

let hits = 0;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  for (const [what, re] of PATTERNS) {
    lines.forEach((line, i) => {
      if (!re.test(line)) return;
      hits++;
      fail(`${what} — ${relative(ROOT, f).replace(/\\/g, "/")}:${i + 1}`);
      console.log(`          ${line.trim().slice(0, 76)}`);
    });
  }
}
if (!hits) pass("none: no category id, product id, shop id or brand copy string");

console.log("\n  --- negative control ---");
/* The shop id is deliberately NOT in this list: it is checked by agreement
   with the config above, not by pattern, because after setup it is legitimately
   the new shop's id. When that rule was removed from PATTERNS this control
   caught it immediately, which is the whole point of keeping it in the run. */
const planted = [
  'const CAT_SLUG = { 37955: "mens-classic" };',
  'const hero = byId(cat, 709403);',
  '<p>Fine watches, sold by people who repair them. Zürich and London.</p>',
  '<span>EST. 1946</span>',
];
const caught = planted.filter((line) => PATTERNS.some(([, re]) => re.test(line)));
caught.length === planted.length
  ? pass(`all ${planted.length} planted values caught, so a clean pass means something`)
  : fail(`only ${caught.length}/${planted.length} planted values caught — this scan proves little`);

console.log("");
console.log(fails ? `${fails} FAILURE(S)\n` : "No shop-specific values leak into the storefront source.\n");
process.exit(fails ? 1 : 0);
