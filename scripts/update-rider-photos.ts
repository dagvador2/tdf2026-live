/**
 * Uploads the retouched rider photos ("détourés") from the Panini folder to R2
 * and updates each rider's photoUrl.
 *
 * Usage: npx tsx scripts/update-rider-photos.ts
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { resolve } from "path";
import { readFileSync } from "fs";

// Load .env.local manually (no dotenv dependency) — same pattern as upload-pro-photos.ts
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  let val = trimmed.slice(eqIdx + 1);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const prisma = new PrismaClient();

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || "tdf2026";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const PHOTOS_DIR = "/Users/clemdaguetschott/Desktop/TDF 26/Panini/03_PHOTOS/detoures";

const FILE_TO_SLUG: Record<string, string> = {
  "Ambre.png": "ambre",
  "Antoine.png": "antoine-bailly",
  "Antonin.png": "antonin-la-boherie",
  "Barraz.png": "florian-barraz",
  "Benjamin.png": "benjamin",
  "Clément Daguet.png": "clement-daguet",
  "Coco.png": "coco",
  "Eve.png": "eve-moins",
  "Gab.png": "gabriel-berthet-nivon",
  "Gaëlle.png": "gaelle",
  "Jules.png": "jules-seguin",
  "Kevin.png": "kevin-lorenzo",
  "Louison.png": "louison-timmerman",
  "Loulou.png": "louise-loisel",
  "Lucie.png": "lucie-dupont",
  "Maxou.png": "maxime-lovat",
  "Nadège.png": "nadege-pollak",
  "Nico.png": "nicolas-debray",
  "Patrick.png": "patrick-pham",
  "Pierre.png": "pierre-chollet",
  "Quentin.png": "quentin-lambert",
  "Robin.png": "robin-vouillot",
  "Romain.png": "romain-choler",
  "Ronan.png": "ronan-thomas",
  "Selim.png": "selim-achite",
  "Stanoche.png": "stanoche",
  "Surirey.png": "mathieu-surirey",
  "Thierry.png": "thierry-daguet",
  "Thomas.png": "thomas-barsack",
};

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  const entries = Object.entries(FILE_TO_SLUG);
  let ok = 0;
  const failed: string[] = [];

  for (const [fileName, slug] of entries) {
    const rider = await prisma.rider.findUnique({ where: { slug } });
    if (!rider) {
      console.error(`✗ Aucun coureur trouvé pour slug="${slug}" (${fileName})`);
      failed.push(fileName);
      continue;
    }

    const filePath = resolve(PHOTOS_DIR, fileName);
    const buffer = readFileSync(filePath);
    // Timestamped key to bust any CDN/browser cache on the replaced photo
    const key = `riders/${slug}-${Date.now()}.png`;

    const url = await uploadToR2(key, buffer, "image/png");
    await prisma.rider.update({ where: { id: rider.id }, data: { photoUrl: url } });

    console.log(`✅ ${fileName.padEnd(22)} → ${slug.padEnd(25)} → ${url}`);
    ok++;
  }

  console.log(`\n🎉 ${ok}/${entries.length} photos mises à jour.`);
  if (failed.length) {
    console.log(`❌ Échecs: ${failed.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
