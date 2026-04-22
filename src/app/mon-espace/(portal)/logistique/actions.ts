"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import type { LogisticsData } from "@/lib/rider/logistics";

export async function updateLogistics(values: LogisticsData) {
  const result = await getSessionRider();
  if (result.status !== "rider") {
    return { ok: false, error: "Tu dois être lié à un profil coureur." };
  }

  const bikeSpaces =
    values.bikeSpaces.trim() === "" ? null : parseInt(values.bikeSpaces, 10);
  const passengerSpaces =
    values.passengerSpaces.trim() === ""
      ? null
      : parseInt(values.passengerSpaces, 10);

  if (bikeSpaces != null && (Number.isNaN(bikeSpaces) || bikeSpaces < 0 || bikeSpaces > 20)) {
    return { ok: false, error: "Nombre de places vélo invalide." };
  }
  if (passengerSpaces != null && (Number.isNaN(passengerSpaces) || passengerSpaces < 0 || passengerSpaces > 20)) {
    return { ok: false, error: "Nombre de places passager invalide." };
  }

  const payload = {
    arrivalMethod: values.arrivalMethod || null,
    arrivalDate: values.arrivalDate || null,
    arrivalTime: values.arrivalTime || null,
    arrivalLocation: values.arrivalLocation.trim() || null,
    needsPickup: values.needsPickup,
    departureDate: values.departureDate || null,
    bikeSpaces,
    passengerSpaces,
    comment: values.comment.trim() || null,
  };

  await prisma.rider.update({
    where: { id: result.rider.id },
    data: { logistics: payload },
  });

  revalidatePath("/mon-espace");
  revalidatePath("/mon-espace/logistique");
  return { ok: true };
}
