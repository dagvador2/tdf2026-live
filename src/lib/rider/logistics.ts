export type ArrivalMethod = "car" | "train" | "carpool" | "other";

export interface LogisticsData {
  arrivalMethod: ArrivalMethod | "";
  arrivalDate: string;      // ISO date (YYYY-MM-DD)
  arrivalTime: string;      // HH:MM
  arrivalLocation: string;
  needsPickup: boolean;
  departureDate: string;
  bikeSpaces: string;       // stocké en string pour l'UI, parsé en number à l'écriture
  passengerSpaces: string;
  comment: string;
}

export const ARRIVAL_METHODS: { value: LogisticsData["arrivalMethod"]; label: string }[] = [
  { value: "", label: "—" },
  { value: "car", label: "Voiture" },
  { value: "train", label: "Train" },
  { value: "carpool", label: "Covoiturage" },
  { value: "other", label: "Autre" },
];

export const EMPTY_LOGISTICS: LogisticsData = {
  arrivalMethod: "",
  arrivalDate: "",
  arrivalTime: "",
  arrivalLocation: "",
  needsPickup: false,
  departureDate: "",
  bikeSpaces: "",
  passengerSpaces: "",
  comment: "",
};

export function parseLogistics(raw: unknown): LogisticsData {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LOGISTICS };
  const r = raw as Record<string, unknown>;
  return {
    arrivalMethod:
      typeof r.arrivalMethod === "string"
        ? (r.arrivalMethod as LogisticsData["arrivalMethod"])
        : "",
    arrivalDate: typeof r.arrivalDate === "string" ? r.arrivalDate : "",
    arrivalTime: typeof r.arrivalTime === "string" ? r.arrivalTime : "",
    arrivalLocation:
      typeof r.arrivalLocation === "string" ? r.arrivalLocation : "",
    needsPickup: r.needsPickup === true,
    departureDate:
      typeof r.departureDate === "string" ? r.departureDate : "",
    bikeSpaces:
      typeof r.bikeSpaces === "number" ? String(r.bikeSpaces) : "",
    passengerSpaces:
      typeof r.passengerSpaces === "number" ? String(r.passengerSpaces) : "",
    comment: typeof r.comment === "string" ? r.comment : "",
  };
}
