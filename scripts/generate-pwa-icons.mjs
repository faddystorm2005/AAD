// One-off icon generator for PWA installation.
//
// Reads public/images/aad/logo.png and produces three sized PNGs
// for the manifest + apple-touch-icon. Run once when logo changes:
//   node scripts/generate-pwa-icons.mjs
//
// Output files (committed to git, do not regenerate per build):
//   public/icons/icon-192.png
//   public/icons/icon-512.png
//   public/icons/apple-touch-icon-180.png

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const sourceLogo = join(projectRoot, 'public/images/aad/logo.png');
const outputDir = join(projectRoot, 'public/icons');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon-180.png', size: 180 },
];

await mkdir(outputDir, { recursive: true });

for (const { name, size } of sizes) {
  const outputPath = join(outputDir, name);
  await sharp(sourceLogo)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log('All icons generated. Commit public/icons/ to git.');
