"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Non autorisé");
  }
}

export async function linkUserToRider(userId: string, riderId: string) {
  await assertAdmin();

  // Vérifier que le rider n'est pas déjà lié à un autre user
  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    include: { user: true },
  });
  if (!rider) return { ok: false, error: "Coureur introuvable." };
  if (rider.user && rider.user.id !== userId) {
    return {
      ok: false,
      error: `Ce coureur est déjà lié à ${rider.user.email ?? rider.user.name ?? "un autre compte"}.`,
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { riderId, role: "rider" },
  });

  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function unlinkUser(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { riderId: null, role: "pending" },
  });

  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function setRiderEmail(riderId: string, email: string) {
  await assertAdmin();

  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: "Email invalide." };
  }

  // Conflit : un autre rider a déjà cet email
  if (cleanEmail) {
    const existing = await prisma.rider.findUnique({
      where: { email: cleanEmail },
    });
    if (existing && existing.id !== riderId) {
      return {
        ok: false,
        error: `L'email est déjà associé à ${existing.firstName}.`,
      };
    }
  }

  await prisma.rider.update({
    where: { id: riderId },
    data: { email: cleanEmail || null },
  });

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/coureurs");
  return { ok: true };
}
