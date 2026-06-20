/**
 * Attribue un code Traccar unique (6 caractères, sans caractères ambigus) à
 * chaque coureur qui n'en a pas encore. Re-run safe : les coureurs déjà dotés
 * d'un code sont laissés tels quels.
 *
 * Ce code est l'« identifiant de l'appareil » que le coureur colle dans
 * l'app Traccar Client. Le serveur (/api/track) l'utilise pour retrouver le
 * coureur.
 *
 * Usage : npx tsx scripts/generate-traccar-codes.ts
 */
import { randomInt } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Sans 0/O, 1/I/L pour éviter toute confusion à la saisie.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

async function main() {
  const riders = await prisma.rider.findMany({
    select: { id: true, firstName: true, traccarDeviceId: true },
    orderBy: { firstName: "asc" },
  });

  const used = new Set(
    riders.map((r) => r.traccarDeviceId).filter((c): c is string => c !== null)
  );

  let assigned = 0;
  for (const rider of riders) {
    if (rider.traccarDeviceId) continue;

    let code = randomCode();
    while (used.has(code)) code = randomCode();
    used.add(code);

    await prisma.rider.update({
      where: { id: rider.id },
      data: { traccarDeviceId: code },
    });
    assigned++;
  }

  console.log(`✅ ${assigned} code(s) attribué(s) (${riders.length - assigned} déjà existant(s))\n`);

  const updated = await prisma.rider.findMany({
    select: { firstName: true, traccarDeviceId: true },
    orderBy: { firstName: "asc" },
  });
  for (const r of updated) {
    console.log(`   ${r.traccarDeviceId ?? "——————"}  ${r.firstName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
