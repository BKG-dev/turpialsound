/**
 * generate-favicons.mjs
 * Genera el set completo de favicons desde el SVG del logo de Turpial Sound.
 * Requiere solo: sharp   → npm install --save-dev sharp
 *
 * Uso: node scripts/generate-favicons.mjs
 */

import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SVG_PATH = resolve(ROOT, "public", "logo fondo blanco.svg");
const PUBLIC = resolve(ROOT, "public");

// ───── tamaños a generar ─────────────────────────────────────────────────────
const PNG_TARGETS = [
  { name: "favicon-16x16.png",          size: 16  },
  { name: "favicon-32x32.png",          size: 32  },
  { name: "favicon-48x48.png",          size: 48  },
  { name: "apple-touch-icon.png",       size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

// Capas del favicon.ico (formato Vista+ acepta PNG embebido directamente)
const ICO_SIZES = [16, 32, 48];

// ─────────────────────────────────────────────────────────────────────────────

const svgBuffer = readFileSync(SVG_PATH);

async function renderPng(size) {
  return sharp(svgBuffer, { density: Math.ceil((size / 12.7) * 90) })
    .resize(size, size, {
      kernel: sharp.kernel.lanczos3,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/**
 * Codifica un ICO multi-capa con PNGs embebidos (formato Windows Vista+).
 * No requiere dependencias externas.
 *
 * Estructura ICO:
 *   ICONDIR  (6 bytes)
 *   ICONDIRENTRY × N (16 bytes cada una)
 *   Datos PNG concatenados
 */
function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;

  // Calcular offsets: el primer PNG empieza después de ICONDIR + N×ICONDIRENTRY
  const headerSize = 6 + count * 16;
  const offsets = [];
  let offset = headerSize;
  for (const buf of pngBuffers) {
    offsets.push(offset);
    offset += buf.length;
  }

  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);
  let pos = 0;

  // ICONDIR
  ico.writeUInt16LE(0, pos);        // reserved
  pos += 2;
  ico.writeUInt16LE(1, pos);        // type = 1 (ICO)
  pos += 2;
  ico.writeUInt16LE(count, pos);    // número de imágenes
  pos += 2;

  // ICONDIRENTRY para cada imagen
  for (let i = 0; i < count; i++) {
    const sz = sizes[i];
    const encodedSize = sz >= 256 ? 0 : sz; // 0 = 256 según spec
    ico.writeUInt8(encodedSize, pos);    // width
    pos += 1;
    ico.writeUInt8(encodedSize, pos);    // height
    pos += 1;
    ico.writeUInt8(0, pos);              // colorCount (0 = sin paleta)
    pos += 1;
    ico.writeUInt8(0, pos);              // reserved
    pos += 1;
    ico.writeUInt16LE(1, pos);           // planes
    pos += 2;
    ico.writeUInt16LE(32, pos);          // bitCount (32-bit RGBA)
    pos += 2;
    ico.writeUInt32LE(pngBuffers[i].length, pos); // bytesInRes
    pos += 4;
    ico.writeUInt32LE(offsets[i], pos);  // imageOffset
    pos += 4;
  }

  // Datos PNG
  for (const buf of pngBuffers) {
    buf.copy(ico, pos);
    pos += buf.length;
  }

  return ico;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Generando favicons desde:", SVG_PATH);

  // 1. PNGs individuales
  for (const { name, size } of PNG_TARGETS) {
    const buf = await renderPng(size);
    writeFileSync(resolve(PUBLIC, name), buf);
    console.log(`  OK  ${name}  (${size}x${size})`);
  }

  // 2. favicon.ico multi-capa (16 + 32 + 48)
  const icoBuffers = await Promise.all(ICO_SIZES.map(renderPng));
  const icoBuffer = buildIco(icoBuffers, ICO_SIZES);
  writeFileSync(resolve(PUBLIC, "favicon.ico"), icoBuffer);
  console.log(`  OK  favicon.ico  (16 + 32 + 48 px)`);

  console.log("\nTodos los favicons generados en /public");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
