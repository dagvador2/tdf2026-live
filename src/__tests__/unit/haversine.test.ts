import { describe, it, expect } from "vitest";
import { haversine } from "@/lib/utils/haversine";

describe("haversine", () => {
  it("returns 0 for same point", () => {
    expect(haversine(45.05, 5.72, 45.05, 5.72)).toBe(0);
  });

  it("Paris → Marseille ≈ 660 km", () => {
    const dist = haversine(48.8566, 2.3522, 43.2965, 5.3698);
    expect(dist).toBeGreaterThan(655_000);
    expect(dist).toBeLessThan(665_000);
  });

  it("short distance ~50m", () => {
    // ~50m difference at latitude 45
    const dist = haversine(45.0, 5.0, 45.00045, 5.0);
    expect(dist).toBeGreaterThan(48);
    expect(dist).toBeLessThan(52);
  });
});
