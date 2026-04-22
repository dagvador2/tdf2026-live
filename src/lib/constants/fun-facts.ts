export const FUN_FACT_FIELDS = [
  { key: "coureur_tdf_2025", label: "Coureur du Tour 2025 préféré" },
  { key: "coureur_all_time", label: "Coureur all time préféré" },
  { key: "souvenir_tour", label: "Souvenir du Tour le plus marquant" },
  { key: "marque_velo_reve", label: "Marque de vélo de rêve" },
  { key: "col_prefere", label: "Col préféré déjà fait" },
  { key: "pire_souvenir_velo", label: "Pire souvenir à vélo" },
  { key: "meilleur_souvenir_velo", label: "Meilleur souvenir à vélo" },
  { key: "surnom_velo", label: "Surnom de ton vélo" },
  { key: "chanson_col", label: "Chanson dans un col de l'enfer" },
  { key: "boisson_apres_3000m", label: "Boisson après 3000m de D+" },
  { key: "excuse_col", label: "Excuse quand tu es cramé en col" },
] as const;

export const FUN_FACT_KEYS = FUN_FACT_FIELDS.map((f) => f.key);

export type FunFactKey = (typeof FUN_FACT_FIELDS)[number]["key"];
