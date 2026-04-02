/**
 * Fix the 2 missing Groupama-FDJ photos (accent issue in URLs)
 * Usage: npx tsx scripts/fix-missing-photos.ts
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const fixes = [
  { slug: "lucie-dupont", url: "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2025/01/Cavagna-Remi-72-300x449.jpg" },
  { slug: "louise-loisel", url: "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2020/02/Berthet-Clement-64-300x449.jpg" },
];

async function main() {
  for (const { slug, url } of fixes) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    });
    if (!res.ok) {
      console.error(`❌ ${slug}: ${res.status} ${res.statusText} for ${url}`);
      continue;
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = contentType.includes("png") ? "png" : "jpg";
    const key = `riders/${slug}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    await prisma.rider.update({
      where: { slug },
      data: { photoUrl: publicUrl },
    });
    console.log(`✅ ${slug} → ${key}`);
  }
  console.log("\n🎉 Fix terminé !");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
