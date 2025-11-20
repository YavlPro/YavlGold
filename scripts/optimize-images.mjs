#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const imagesDir = path.join(root, 'assets', 'images');
const srcPng = path.join(imagesDir, 'logo.png');
const outWebp = path.join(imagesDir, 'logo.webp');
const outPngOptim = path.join(imagesDir, 'logo.optim.png');

async function optimize() {
  if (!fs.existsSync(srcPng)) {
    console.error(`[optimize-images] ❌ No existe ${srcPng}`);
    process.exit(1);
  }

  try {
    const image = sharp(srcPng);
    const metadata = await image.metadata();

    // Exportar WebP reducido para header (objetivo ≤ 8KB)
    await image
      .resize({ width: 96, height: 96, fit: 'cover' })
      .webp({ quality: 82, effort: 6 })
      .toFile(outWebp);

    // Re-exportar PNG optimizado (opcional) para comparar tamaños
    await sharp(srcPng)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outPngOptim);

    const webpSize = fs.statSync(outWebp).size;
    const pngSize = fs.statSync(srcPng).size;
    const pngOptSize = fs.statSync(outPngOptim).size;

    const kb = (b) => (b / 1024).toFixed(2) + 'KB';

    console.log('[optimize-images] ✅ Hecho');
    console.log(` - Fuente:      ${srcPng} (${kb(pngSize)}) ${metadata.width}x${metadata.height}`);
    console.log(` - WebP:        ${outWebp} (${kb(webpSize)})`);
    console.log(` - PNG (opt):   ${outPngOptim} (${kb(pngOptSize)})`);

    if (webpSize <= 8 * 1024) {
      console.log(' - Objetivo: ✅ logo.webp ≤ 8KB');
    } else {
      console.log(' - Objetivo: ⚠️ logo.webp > 8KB, ajusta calidad o reduce dimensiones');
    }
  } catch (e) {
    console.error('[optimize-images] ❌ Error:', e.message);
    process.exit(1);
  }
}

optimize();
