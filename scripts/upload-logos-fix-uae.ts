/**
 * 1. Upload pro team logos to R2 and update teams in DB
 * 2. Re-download UAE photos, crop to face with sharp, re-upload
 *
 * Usage: npx tsx scripts/upload-logos-fix-uae.ts
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const key = t.slice(0, eq);
  let val = t.slice(eq + 1);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
    val = val.slice(1, -1);
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
const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC = process.env.R2_PUBLIC_URL!;

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function upload(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${PUBLIC}/${key}`;
}

// ── LOGOS ──────────────────────────────────────────────
const LOGOS: Record<string, { url: string; ext: string }> = {
  "visma-lease-a-ricard": {
    url: "https://d1lk6qpkbduawh.cloudfront.net/Logos/logo-tvl.png",
    ext: "png",
  },
  "eau-team-pastis": {
    url: "https://www.uaeteamemirates.com/wp-content/uploads/2017/03/logo-uae.png",
    ext: "png",
  },
  "groupama-federation-du-jaune": {
    url: "https://www.equipecycliste-groupama-fdj.fr/app/themes/groupamafdj_v2/build/images/logo-2026/logo-2026.67c05d4c.svg",
    ext: "svg",
  },
  "ineos-anises": {
    url: "https://upload.wikimedia.org/wikipedia/en/thumb/0/06/Ineos_Grenadiers_Logo.jpg/250px-Ineos_Grenadiers_Logo.jpg",
    ext: "jpg",
  },
};

// ── UAE PHOTOS (to re-crop) ───────────────────────────
const UAE_PHOTOS = [
  "https://www.uaeteamemirates.com/wp-content/uploads/2018/12/Pogacar-4-285x492.jpg",
  "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Almeida-1-285x492.png",
  "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Arieta-1-285x492.png",
  "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Baroncini-1-285x492.png",
  "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Bjerg-1-285x492.png",
  "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Christen-1-285x492.png",
  "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Cosnefroy-5-285x492.png",
  "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Herregodts-1-285x492.png",
];

async function main() {
  // ── 1. Logos ──
  console.log("🏷️  Upload des logos d'équipe...\n");
  for (const [slug, { url, ext }] of Object.entries(LOGOS)) {
    try {
      const buf = await download(url);
      const contentType = ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : "image/jpeg";
      const key = `teams/${slug}-logo.${ext}`;
      const publicUrl = await upload(key, buf, contentType);

      await prisma.team.update({
        where: { slug },
        data: { logoUrl: publicUrl },
      });
      console.log(`   ✅ ${slug} → ${key}`);
    } catch (err) {
      console.error(`   ❌ ${slug}: ${(err as Error).message}`);
    }
  }

  // ── 2. Re-crop UAE photos ──
  console.log("\n📸 Recadrage photos UAE (face crop)...\n");

  const uaeTeam = await prisma.team.findUnique({
    where: { slug: "eau-team-pastis" },
    include: { riders: { orderBy: { id: "asc" } } },
  });

  if (!uaeTeam) {
    console.error("Team eau-team-pastis not found!");
    return;
  }

  for (let i = 0; i < uaeTeam.riders.length; i++) {
    const rider = uaeTeam.riders[i];
    const sourceUrl = UAE_PHOTOS[i % UAE_PHOTOS.length];

    try {
      const buf = await download(sourceUrl);
      const meta = await sharp(buf).metadata();
      const w = meta.width || 285;
      const h = meta.height || 492;

      // Crop top 60% of the image to focus on the face
      const cropHeight = Math.round(h * 0.6);
      const cropped = await sharp(buf)
        .extract({ left: 0, top: 0, width: w, height: cropHeight })
        .jpeg({ quality: 90 })
        .toBuffer();

      const key = `riders/${rider.slug}.jpg`;
      const publicUrl = await upload(key, cropped, "image/jpeg");

      await prisma.rider.update({
        where: { id: rider.id },
        data: { photoUrl: publicUrl },
      });
      console.log(`   ✅ ${rider.firstName} → ${key} (${w}x${cropHeight})`);
    } catch (err) {
      console.error(`   ❌ ${rider.firstName}: ${(err as Error).message}`);
    }
  }

  console.log("\n🎉 Logos + recadrage terminés !");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
