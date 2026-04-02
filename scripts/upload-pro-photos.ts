/**
 * Script to download pro cyclist photos and upload them to R2 as rider placeholders.
 * Maps each parody team to its real counterpart's rider photos.
 *
 * Usage: npx tsx scripts/upload-pro-photos.ts
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { resolve } from "path";
import { readFileSync } from "fs";

// Load .env.local manually (no dotenv dependency)
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

// Mapping: team slug -> array of pro rider photo URLs (8 per team)
const TEAM_PHOTOS: Record<string, string[]> = {
  // Visma Lease a Ricard -> Team Visma-Lease a Bike
  "visma-lease-a-ricard": [
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/19.png", // Vingegaard
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/9_2026-02-26-095238_phzy.png", // Van Aert
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/3_2026-02-26-094432_udhe.png", // Affini
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/21.png", // Armirail
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/1_2026-02-26-094214_gojb.png", // Barre
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/22.png", // Behrens
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/11_2026-02-26-095608_izjv.png", // Van Belle
    "https://d1lk6qpkbduawh.cloudfront.net/_810x1038_crop_top-center_85_none/9_2026-02-26-085144_ljme.png", // Ferrand-Prevot
  ],

  // EAU Team Pastis -> UAE Team Emirates
  "eau-team-pastis": [
    "https://www.uaeteamemirates.com/wp-content/uploads/2018/12/Pogacar-4-285x492.jpg", // Pogacar
    "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Almeida-1-285x492.png", // Almeida
    "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Arieta-1-285x492.png", // Arrieta
    "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Baroncini-1-285x492.png", // Baroncini
    "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Bjerg-1-285x492.png", // Bjerg
    "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Christen-1-285x492.png", // Christen
    "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Cosnefroy-5-285x492.png", // Cosnefroy
    "https://www.uaeteamemirates.com/wp-content/uploads/2025/12/Herregodts-1-285x492.png", // Herregodts
  ],

  // Groupama Federation du Jaune -> Groupama-FDJ
  "groupama-federation-du-jaune": [
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2016/12/Gaudu-David-1-300x333.png", // Gaudu
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2025/01/Cavagna-R%C3%A9mi-1-300x340.png", // Cavagna
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2020/02/Berthet-Cl%C3%A9ment-1-300x352.png", // Berthet
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2024/01/Barthe-Cyril-1-1-300x349.png", // Barthe
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2022/12/Bower-Lewis-1-1-300x343.png", // Bower
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2016/12/Molard-Rudy-1-300x329.png", // Molard
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2018/01/Madouas-Valentin-1-300x340.png", // Madouas
    "https://www.equipecycliste-groupama-fdj.fr/app/uploads/2015/01/Le-Gac-Olivier-1-300x330.png", // Le Gac
  ],

  // INEOS Anises -> INEOS Grenadiers
  "ineos-anises": [
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/ypnjrkhc/2026-885x765pixels-riders3.jpg", // Bernal
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/dmknwfy4/2026-885x765pixels-riders6.jpg", // Ganna
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/foqjvtae/2026-885x765pixels-riders17.jpg", // C. Rodriguez
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/tj5g52cy/2026-885x765pixels-riders24.jpg", // Tarling
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/ym1jmfef/2026-885x765pixels-riders19.jpg", // Sheffield
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/1swfnper/2026-885x765pixels-riders25.jpg", // Turner
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/qeonnr2w/2026-885x765pixels-riders12.jpg", // Kwiatkowski
    "https://res.cloudinary.com/team-sky/image/upload/c_auto,w_584,ar_1:1,q_90/umbraco-cms/media/qy1phuq4/2026-885x765pixels-riders_arensman.jpg", // Arensman
  ],
};

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

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
  console.log("🚴 Downloading pro cyclist photos and uploading to R2...\n");

  // Get all teams with their riders
  const teams = await prisma.team.findMany({
    include: {
      riders: {
        orderBy: { id: "asc" },
      },
    },
  });

  let totalUpdated = 0;

  for (const team of teams) {
    const photoUrls = TEAM_PHOTOS[team.slug];
    if (!photoUrls) {
      console.log(`⚠️  No photos mapped for team: ${team.name} (${team.slug})`);
      continue;
    }

    console.log(`\n📸 ${team.name} (${team.riders.length} coureurs)`);

    for (let i = 0; i < team.riders.length; i++) {
      const rider = team.riders[i];
      const sourceUrl = photoUrls[i % photoUrls.length]; // Cycle if more riders than photos

      try {
        // Download the image
        const { buffer, contentType } = await downloadImage(sourceUrl);
        const ext = contentType.includes("png") ? "png" : "jpg";
        const key = `riders/${rider.slug}.${ext}`;

        // Upload to R2
        const publicUrl = await uploadToR2(key, buffer, contentType);

        // Update rider in DB
        await prisma.rider.update({
          where: { id: rider.id },
          data: { photoUrl: publicUrl },
        });

        console.log(`   ✅ ${rider.firstName} → ${key}`);
        totalUpdated++;
      } catch (err) {
        console.error(`   ❌ ${rider.firstName}: ${(err as Error).message}`);
      }
    }
  }

  console.log(`\n🎉 ${totalUpdated} photos uploadées sur R2 !`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
