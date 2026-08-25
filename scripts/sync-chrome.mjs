/* Write the header that app.js hydrates to into every static page.
 *
 * The two have to agree. If the static markup is a version behind, the browser
 * paints it and app.js swaps it a moment later, which is the header flash. If
 * the static markup merely *claims* to be current — the data-shared-chrome
 * version matches but the markup does not — app.js skips the swap entirely and
 * the old header is what the shopper gets.
 *
 * `npm run check:chrome` fails when they diverge; this is how you fix it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";

const app = readFileSync("storefront/app.js", "utf8");
const marker = "const SHARED_HEADER_HTML = `";
const start = app.indexOf(marker);
if (start < 0) throw new Error("SHARED_HEADER_HTML not found in app.js");
const end = app.indexOf("`;", start + marker.length);

const header = app.slice(start + marker.length, end)
  .replaceAll("\\`", "`")
  .replaceAll("\\${", "${")
  .replaceAll("\\\\", "\\")
  .trim();

const pages = globSync("storefront/*.html");
let changed = 0;

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const open = html.indexOf("<header");
  if (open < 0) continue;
  const close = html.indexOf("</header>", open);
  if (close < 0) continue;

  const indent = " ".repeat(Math.max(0, open - (html.lastIndexOf("\n", open) + 1)));
  const block = header.split("\n").map((line, i) => (i ? indent + line : line)).join("\n");
  const next = html.slice(0, open) + block + html.slice(close + "</header>".length);

  if (next !== html) {
    writeFileSync(page, next, "utf8");
    changed += 1;
  }
}

console.log(`chrome synced into ${changed} of ${pages.length} pages`);
