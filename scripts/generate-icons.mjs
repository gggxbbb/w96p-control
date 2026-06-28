import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'icon.svg');

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, `icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}

// Also generate maskable icon with padding
for (const size of sizes) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 26, b: 24, alpha: 1 },
    },
  })
    .composite([{
      input: await sharp(svgPath).resize(Math.round(size * 0.7), Math.round(size * 0.7)).png().toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(join(publicDir, `icon-${size}-maskable.png`));
  console.log(`Generated icon-${size}-maskable.png`);
}
