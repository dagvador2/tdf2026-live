export const TEAM_COLORS: Record<string, string> = {
  "visma-lease-a-ricard": "#F2C200",
  "eau-team-pastis": "#E8E0D0",
  "groupama-federation-du-jaune": "#0055A4",
  "ineos-anises": "#E03C31",
};

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

export const STAGE_TYPE_LABELS: Record<string, string> = {
  road: "Route",
  team_tt: "CLM par équipe",
  individual_tt: "CLM individuel",
  mountain: "Montagne",
};

export const ENTRY_STATUS_LABELS: Record<string, string> = {
  registered: "Inscrit",
  started: "Parti",
  tracking: "En course",
  finished: "Arrivé",
  dnf: "Abandon",
  dns: "Non-partant",
};

export const APP_CONFIG = {
  GPS_INTERVAL_MS: 5_000,
  GPS_BATCH_INTERVAL_MS: 15_000,
  GPS_MAX_ACCURACY_M: 50,
  GPS_MAX_SPEED_KMH: 80,
  GPS_MIN_DISTANCE_M: 2,
  GPS_OFFLINE_BATCH_SIZE: 50,
  SSE_HEARTBEAT_MS: 30_000,
  GEOFENCE_DEFAULT_RADIUS_M: 50,
  GEOFENCE_MOUNTAIN_RADIUS_M: 100,
  UPLOAD_MAX_SIZE_MB: 10,
  EVENT_DATE: new Date("2026-07-20T00:00:00+02:00"),
} as const;
