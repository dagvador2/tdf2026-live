/**
 * Generate PWA icons from an SVG source.
 * Creates: 192x192, 512x512 PNGs + apple-touch-icon 180x180 + favicon 32x32
 *
 * Usage: npx tsx scripts/generate-icons.ts
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const ICONS_DIR = resolve(__dirname, "../public/icons");
mkdirSync(ICONS_DIR, { recursive: true });

// SVG icon: dark blue rounded square with yellow "TDF" and "2026" + mountain silhouette
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#242850"/>
      <stop offset="100%" stop-color="#1B1F3B"/>
    </linearGradient>
  </defs>

  <!-- Background rounded square -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>

  <!-- Mountain silhouette -->
  <path d="M0 420 L120 280 L180 330 L280 200 L360 300 L420 240 L512 360 L512 512 L0 512 Z"
        fill="#2A2F55" opacity="0.6"/>
  <path d="M0 440 L150 320 L220 370 L320 250 L400 340 L512 280 L512 512 L0 512 Z"
        fill="#1B1F3B" opacity="0.4"/>

  <!-- Road line -->
  <path d="M180 512 L256 320 L332 512" fill="none" stroke="#F2C200" stroke-width="3" opacity="0.3"/>

  <!-- TDF text -->
  <text x="256" y="235" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-weight="900" font-size="180" fill="#F2C200" letter-spacing="-5">
    TDF
  </text>

  <!-- 2026 text -->
  <text x="256" y="330" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="90" fill="#FFFFFF" letter-spacing="8">
    2026
  </text>

  <!-- Small LIVE dot -->
  <circle cx="256" cy="380" r="8" fill="#E03C31"/>
  <text x="256" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="36" fill="#E03C31" letter-spacing="6">
    LIVE
  </text>
</svg>
`;

const sizes = [
  { name: "icon-512x512.png", size: 512 },
  { name: "icon-192x192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-16x16.png", size: 16 },
];

async function main() {
  const svgBuffer = Buffer.from(svgIcon);

  for (const { name, size } of sizes) {
    const png = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();

    const outPath = resolve(ICONS_DIR, name);
    writeFileSync(outPath, png);
    console.log(`✅ ${name} (${size}x${size})`);
  }

  // Also create a copy of apple-touch-icon at the public root (iOS looks there)
  const applePng = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  writeFileSync(resolve(__dirname, "../public/apple-touch-icon.png"), applePng);
  console.log("✅ /apple-touch-icon.png (root)");

  // Create favicon.ico from 32x32
  const favicon32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  writeFileSync(resolve(__dirname, "../public/favicon.ico"), favicon32);
  console.log("✅ /favicon.ico");

  console.log("\n🎉 Toutes les icônes générées !");
}

main().catch(console.error);
