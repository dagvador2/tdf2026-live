import type { Rider } from "@prisma/client";
import { FUN_FACT_KEYS } from "@/lib/constants/fun-facts";

export interface ProfileCompletion {
  total: number;
  sections: {
    profile: number;    // nickname + photo
    sport: number;      // weight + ftp
    funFacts: number;   // 11 questions
    stages: number;     // au moins 1 participation
    logistics: number;  // champs principaux
  };
}

const LOGISTICS_REQUIRED_KEYS = [
  "arrivalMethod",
  "arrivalDate",
  "arrivalTime",
  "arrivalLocation",
] as const;

/**
 * Calcule la complétion du profil coureur (0-100).
 * 5 sections pondérées à 20% chacune.
 */
export function computeProfileCompletion(
  rider: Rider,
  stageEntriesCount: number
): ProfileCompletion {
  // Section profil de base : nickname + photo (50/50)
  const profile =
    (rider.nickname ? 50 : 0) + (rider.photoUrl ? 50 : 0);

  // Section sport : poids + ftp
  const sport =
    (rider.weightKg != null ? 50 : 0) + (rider.ftpWatts != null ? 50 : 0);

  // Section fun facts : 11 questions
  const funFactsMap = (rider.funFacts as Record<string, string> | null) ?? {};
  const filledCount = FUN_FACT_KEYS.filter(
    (key) => typeof funFactsMap[key] === "string" && funFactsMap[key].trim() !== ""
  ).length;
  const funFacts = Math.round((filledCount / FUN_FACT_KEYS.length) * 100);

  // Section étapes : au moins une participation confirmée → 100
  const stages = stageEntriesCount > 0 ? 100 : 0;

  // Section logistique : 4 champs principaux
  const logisticsMap =
    (rider.logistics as Record<string, unknown> | null) ?? {};
  const logisticsFilled = LOGISTICS_REQUIRED_KEYS.filter((k) => {
    const v = logisticsMap[k];
    return v != null && v !== "";
  }).length;
  const logistics = Math.round(
    (logisticsFilled / LOGISTICS_REQUIRED_KEYS.length) * 100
  );

  const total = Math.round(
    (profile + sport + funFacts + stages + logistics) / 5
  );

  return { total, sections: { profile, sport, funFacts, stages, logistics } };
}
