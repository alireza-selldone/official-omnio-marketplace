import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = "C:/Users/eeshi/.codex/generated_images/01a01259-f46d-7132-a920-b074f45bb698/";
const sheets = [
  ["exec-51c5eaa1-958a-4f77-abbf-63566bf5d407.png", ["oatmeal-ribbed-bodysuit-set", "bear-cloud-sleepsuit", "sky-quilted-pramsuit", "sage-dungaree-romper"]],
  ["exec-1b10e4e8-e20e-4d3d-b949-f2741503e19d.png", ["first-step-knit-booties", "meadow-ribbed-bodysuit-set", "cloud-knit-cardigan", "petal-ruffle-sleepsuit"]],
  ["exec-f06e43a7-f66c-4c40-a053-e7b01037763b.png", ["rainbow-jersey-romper-set", "first-bloom-soft-sole-shoes", "trail-graphic-tshirt", "forest-fleece-zip-hoodie"]],
  ["exec-673f015f-b34a-4922-b3a9-4d327dc596fd.png", ["stone-stretch-chino-jogger", "cobalt-lightweight-puffer", "courtline-kids-trainers", "rainbow-cotton-sweatshirt"]],
  ["exec-fe5f1301-1017-4fde-b015-6e1a74396b16.png", ["petal-pleated-dress", "lilac-wide-leg-trousers", "rose-hooded-fleece-jacket", "starstep-everyday-trainers"]],
];
const outputDirectory = new URL("../storefront/assets/products/luma-lane/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

for (const [file, names] of sheets) {
  const input = `${root}${file}`;
  const metadata = await sharp(input).metadata();
  const cellWidth = Math.floor(metadata.width / 2);
  const cellHeight = Math.floor(metadata.height / 2);
  for (let index = 0; index < names.length; index += 1) {
    const inset = 10;
    const cell = await sharp(input)
      .extract({
        left: (index % 2) * cellWidth + inset,
        top: Math.floor(index / 2) * cellHeight + inset,
        width: cellWidth - inset * 2,
        height: cellHeight - inset * 2,
      })
      .png()
      .toBuffer();
    const trimmed = await sharp(cell)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 18 })
      .png()
      .toBuffer();
    const item = await sharp(trimmed).metadata();
    const scale = Math.min(720 / item.width, 720 / item.height);
    const width = Math.max(1, Math.round(item.width * scale));
    const height = Math.max(1, Math.round(item.height * scale));
    const resized = await sharp(trimmed).resize(width, height, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const destination = fileURLToPath(new URL(`${names[index]}.png`, outputDirectory));
    await sharp({ create: { width: 1200, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, left: Math.round((1200 - width) / 2), top: Math.round((1200 - height) / 2) }])
      .png({ compressionLevel: 9 })
      .toFile(destination);
    console.log(`${names[index]}: ${width}x${height} on 1200x1200`);
  }
}
