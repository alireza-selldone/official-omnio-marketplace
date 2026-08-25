import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sheets = [
  {
    input: "C:/Users/eeshi/.codex/generated_images/01a01259-f46d-7132-a920-b074f45bb698/exec-63ef6cbb-dd00-4f66-80de-e77651950f44.png",
    names: ["shop-by-product", "women", "men", "girls"],
  },
  {
    input: "C:/Users/eeshi/.codex/generated_images/01a01259-f46d-7132-a920-b074f45bb698/exec-f9eae209-f140-4daf-bd74-a8b54d7ec9a4.png",
    names: ["boys", "baby", "baby-girls", "baby-boys"],
  },
];

const outputDirectory = new URL("../storefront/assets/categories/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

for (const sheet of sheets) {
  const metadata = await sharp(sheet.input).metadata();
  const cellWidth = Math.floor(metadata.width / 2);
  const cellHeight = Math.floor(metadata.height / 2);

  for (let index = 0; index < sheet.names.length; index += 1) {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const inset = 10;
    const left = column * cellWidth + inset;
    const top = row * cellHeight + inset;
    const width = cellWidth - inset * 2;
    const height = cellHeight - inset * 2;
    const cell = await sharp(sheet.input)
      .extract({ left, top, width, height })
      .png()
      .toBuffer();
    const trimmed = await sharp(cell)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 18 })
      .png()
      .toBuffer();
    const trimmedMetadata = await sharp(trimmed).metadata();
    const scale = Math.min(840 / trimmedMetadata.width, 840 / trimmedMetadata.height);
    const targetWidth = Math.max(1, Math.round(trimmedMetadata.width * scale));
    const targetHeight = Math.max(1, Math.round(trimmedMetadata.height * scale));
    const resized = await sharp(trimmed)
      .resize(targetWidth, targetHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
    const destination = fileURLToPath(new URL(`${sheet.names[index]}.png`, outputDirectory));
    await sharp({
      create: { width: 1200, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: resized, left: Math.round((1200 - targetWidth) / 2), top: Math.round((1200 - targetHeight) / 2) }])
      .png({ compressionLevel: 9 })
      .toFile(destination);
    console.log(`${sheet.names[index]}: ${targetWidth}x${targetHeight} on 1200x1200`);
  }
}
