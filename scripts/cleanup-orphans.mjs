/**
 * cleanup-orphans.mjs
 * Elimina archivos huérfanos confirmados (sin importadores ni referencias).
 * Uso: node scripts/cleanup-orphans.mjs
 *      node scripts/cleanup-orphans.mjs --dry-run   ← solo lista, no borra
 */

import { unlinkSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DRY = process.argv.includes("--dry-run");

const ORPHANS = [
  // ── Componentes sin importadores ──────────────────────────────────────────
  "components/fx/ParticleCanvas.tsx",
  "components/media/AudioVisualizerPlasma.tsx",
  "components/media/AudioVisualizerWaterfall3D.tsx",

  // ── Archivos sueltos raíz ─────────────────────────────────────────────────
  "arbol.txt",

  // ── Imágenes duplicadas / sin referencia ──────────────────────────────────
  "public/images/salas-ensayo9 - Copy.jpg",
];

console.log(DRY ? "[DRY RUN] Archivos que se borrarían:\n" : "Eliminando huérfanos:\n");

let deleted = 0;
let missing = 0;

for (const rel of ORPHANS) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    console.log(`  --  (no existe)  ${rel}`);
    missing++;
    continue;
  }
  if (DRY) {
    console.log(`  DEL  ${rel}`);
  } else {
    unlinkSync(abs);
    console.log(`  OK   ${rel}`);
  }
  deleted++;
}

console.log(
  `\n${DRY ? "Encontrados" : "Eliminados"}: ${deleted}  |  No encontrados: ${missing}`
);
