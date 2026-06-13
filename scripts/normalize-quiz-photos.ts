/**
 * normalize-quiz-photos.ts — run once.
 *
 * Source : "Photos quizz/Bloc 2" et "Photos quizz/Bloc 3" à la racine du repo.
 * Les noms d'origine ont des espaces, majuscules, accents et un caractère `%`
 * (Railway tourne sous Linux case-sensitive → on normalise vers des chemins
 * propres en minuscules, positionnels, sans le slug d'origine).
 *
 * Chaque fichier se termine par `{_ou-}{N}.{ext}` où N = numéro d'ordre.
 *  - Bloc 3 : 1 image par question  → /public/photos-quizz/bloc3/b3_{N}.{ext}
 *  - Bloc 2 : 2 images par duel      → /public/photos-quizz/bloc2/b2_{duel}_{option}.{ext}
 *             duel = ceil(N/2), option = N impair ? "a" : "b"
 *
 * Génère /public/photos-quizz/manifest.json. Les chemins d'images sont TOUJOURS
 * résolus via ce manifeste — jamais en dur dans un composant.
 *
 *   npx tsx scripts/normalize-quiz-photos.ts
 */
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC_BLOC2 = join(ROOT, "Photos quizz", "Bloc 2");
const SRC_BLOC3 = join(ROOT, "Photos quizz", "Bloc 3");
const OUT_DIR = join(ROOT, "public", "photos-quizz");
const OUT_BLOC2 = join(OUT_DIR, "bloc2");
const OUT_BLOC3 = join(OUT_DIR, "bloc3");
const PUBLIC_BASE = "/photos-quizz";

const N_RE = /[_-](\d+)\.[^.]+$/; // capture le numéro d'ordre avant l'extension
const EXT_RE = /\.([^.]+)$/;

const warnings: string[] = [];
function warn(msg: string) {
  warnings.push(msg);
  console.warn(`⚠️  ${msg}`);
}

type ParsedFile = { n: number; ext: string; original: string };

function listImages(dir: string): ParsedFile[] {
  if (!existsSync(dir)) {
    warn(`Dossier introuvable : ${dir}`);
    return [];
  }
  const parsed: ParsedFile[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue; // .DS_Store & co
    const nMatch = name.match(N_RE);
    const extMatch = name.match(EXT_RE);
    if (!nMatch || !extMatch) {
      warn(`Numéro/extension illisible, ignoré : "${name}"`);
      continue;
    }
    parsed.push({
      n: Number(nMatch[1]),
      ext: extMatch[1].toLowerCase(),
      original: name,
    });
  }
  return parsed.sort((a, b) => a.n - b.n);
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function reportGaps(label: string, numbers: number[]) {
  if (numbers.length === 0) return;
  const max = Math.max(...numbers);
  const present = new Set(numbers);
  for (let i = 1; i <= max; i++) {
    if (!present.has(i)) warn(`${label} : numéro ${i} manquant dans la séquence (1..${max})`);
  }
}

// ---------- BLOC 3 : 1 image / question ----------
function processBloc3() {
  ensureDir(OUT_BLOC3);
  const files = listImages(SRC_BLOC3);
  const manifest: Record<string, string> = {};

  reportGaps("Bloc 3", files.map((f) => f.n));

  for (const f of files) {
    const outName = `b3_${f.n}.${f.ext}`;
    copyFileSync(join(SRC_BLOC3, f.original), join(OUT_BLOC3, outName));
    if (manifest[f.n]) warn(`Bloc 3 : doublon pour la question ${f.n} ("${f.original}")`);
    manifest[String(f.n)] = `${PUBLIC_BASE}/bloc3/${outName}`;
  }

  console.log(`✅ Bloc 3 : ${files.length} image(s) copiée(s).`);
  return manifest;
}

// ---------- BLOC 2 : 2 images / duel (numérotation continue) ----------
function processBloc2() {
  ensureDir(OUT_BLOC2);
  const files = listImages(SRC_BLOC2);
  const manifest: Record<string, { a?: string; b?: string }> = {};

  reportGaps("Bloc 2", files.map((f) => f.n));

  for (const f of files) {
    const duel = Math.ceil(f.n / 2);
    const option = f.n % 2 === 1 ? "a" : "b";
    const outName = `b2_${duel}_${option}.${f.ext}`;
    copyFileSync(join(SRC_BLOC2, f.original), join(OUT_BLOC2, outName));
    const slot = (manifest[String(duel)] ??= {});
    if (slot[option]) warn(`Bloc 2 : doublon duel ${duel} option ${option} ("${f.original}")`);
    slot[option] = `${PUBLIC_BASE}/bloc2/${outName}`;
  }

  // Chaque duel doit avoir exactement 2 images (a + b)
  for (const [duel, slot] of Object.entries(manifest)) {
    if (!slot.a || !slot.b) {
      warn(`Bloc 2 : duel ${duel} incomplet (a=${!!slot.a}, b=${!!slot.b}) — attendu 2 images`);
    }
  }

  console.log(`✅ Bloc 2 : ${files.length} image(s) copiée(s) → ${Object.keys(manifest).length} duel(s).`);
  return manifest;
}

function main() {
  console.log("📸 Normalisation des photos quiz…\n");
  ensureDir(OUT_DIR);

  const bloc2 = processBloc2();
  const bloc3 = processBloc3();

  const manifest = { bloc2, bloc3 };
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\n✅ Manifeste écrit : ${join(OUT_DIR, "manifest.json")}`);

  console.log(`\n${warnings.length} avertissement(s).`);
  if (warnings.length) console.log(warnings.map((w) => `   • ${w}`).join("\n"));
}

main();
