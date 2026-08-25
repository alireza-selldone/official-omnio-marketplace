import sharp from "sharp";
import { resolve } from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error("Usage: node scripts/remove-checker-alpha.mjs <input.png> <output.png>");
  process.exit(2);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const pixels = width * height;
const seen = new Uint8Array(pixels);
const queue = new Int32Array(pixels);
let head = 0;
let tail = 0;

const isCheckerBackground = (pixel) => {
  const offset = pixel * 4;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  return high - low <= 6 && (r + g + b) / 3 >= 230;
};

const enqueue = (pixel) => {
  if (pixel < 0 || pixel >= pixels || seen[pixel] || !isCheckerBackground(pixel)) return;
  seen[pixel] = 1;
  queue[tail++] = pixel;
};

for (let x = 0; x < width; x += 1) {
  enqueue(x);
  enqueue((height - 1) * width + x);
}
for (let y = 1; y < height - 1; y += 1) {
  enqueue(y * width);
  enqueue(y * width + width - 1);
}

while (head < tail) {
  const pixel = queue[head++];
  const x = pixel % width;
  if (x > 0) enqueue(pixel - 1);
  if (x + 1 < width) enqueue(pixel + 1);
  if (pixel >= width) enqueue(pixel - width);
  if (pixel + width < pixels) enqueue(pixel + width);
}

for (let pixel = 0; pixel < pixels; pixel += 1) {
  const offset = pixel * 4;
  if (seen[pixel]) data[offset + 3] = 0;
  // Some commerce CDNs inspect or flatten the hidden RGB channels beneath
  // fully transparent pixels. Clear those channels as well so a removed
  // checkerboard cannot be resurrected during image optimisation.
  if (data[offset + 3] === 0) {
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
  }
}

await sharp(data, { raw: info }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(output);
console.log(JSON.stringify({ input, output, width, height, removedPixels: tail, removedRatio: tail / pixels }));
