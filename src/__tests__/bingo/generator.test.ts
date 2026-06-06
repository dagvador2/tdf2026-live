import { describe, expect, it } from "vitest";
import { BingoCategory, type BingoCellTemplate } from "@prisma/client";
import {
  pickTemplates,
  type ParticipantForBingo,
} from "@/features/bingo/lib/generator";
import {
  CATEGORY_DISTRIBUTION,
  GRID_CELL_COUNT,
} from "@/features/bingo/lib/constants";
import { createRng } from "@/features/bingo/lib/rng";

function makeTemplate(
  i: number,
  category: BingoCategory,
  overrides: Partial<BingoCellTemplate> = {}
): BingoCellTemplate {
  return {
    id: `tpl_${category}_${i}`,
    eventId: "evt_test",
    text:
      category === BingoCategory.GROUP_SPECIFIC
        ? `{name} fait quelque chose #${i}`
        : `${category} case #${i}`,
    category,
    weight: 10,
    targetUserId: null,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildRichPool() {
  const pool: BingoCellTemplate[] = [];
  for (let i = 0; i < 20; i++) pool.push(makeTemplate(i, BingoCategory.GENERIC));
  for (let i = 0; i < 20; i++)
    pool.push(makeTemplate(i, BingoCategory.GROUP_SPECIFIC));
  for (let i = 0; i < 20; i++)
    pool.push(makeTemplate(i, BingoCategory.SELF_REFERENTIAL));
  return pool;
}

const participants: ParticipantForBingo[] = Array.from({ length: 30 }, (_, i) => ({
  id: `u_${i}`,
  name: `User${i}`,
}));

describe("generator / pickTemplates", () => {
  it("returns exactly 16 picks", () => {
    const picks = pickTemplates({
      templates: buildRichPool(),
      participants,
      rng: createRng("seed-a"),
    });
    expect(picks.length).toBe(GRID_CELL_COUNT);
  });

  it("respects the category distribution when pools are rich", () => {
    const picks = pickTemplates({
      templates: buildRichPool(),
      participants,
      rng: createRng("seed-a"),
    });
    const counts: Record<BingoCategory, number> = {
      GENERIC: 0,
      GROUP_SPECIFIC: 0,
      SELF_REFERENTIAL: 0,
    };
    for (const p of picks) counts[p.category]++;
    expect(counts).toEqual(CATEGORY_DISTRIBUTION);
  });

  it("never picks the same template twice", () => {
    const picks = pickTemplates({
      templates: buildRichPool(),
      participants,
      rng: createRng("seed-a"),
    });
    const ids = new Set(picks.map((p) => p.templateId));
    expect(ids.size).toBe(picks.length);
  });

  it("substitutes {name} in GROUP_SPECIFIC picks", () => {
    const picks = pickTemplates({
      templates: buildRichPool(),
      participants,
      rng: createRng("seed-a"),
    });
    for (const p of picks) {
      expect(p.text.includes("{name}")).toBe(false);
    }
    const group = picks.filter((p) => p.category === BingoCategory.GROUP_SPECIFIC);
    expect(group.length).toBeGreaterThan(0);
    for (const p of group) {
      const matched = participants.some((u) => p.text.includes(u.name));
      expect(matched).toBe(true);
    }
  });

  it("caps a single name at 2 occurrences per grid", () => {
    // 1 participant only → max 2 GROUP_SPECIFIC picks can be filled with {name}.
    const onlyOne: ParticipantForBingo[] = [{ id: "u1", name: "Solo" }];
    const picks = pickTemplates({
      templates: buildRichPool(),
      participants: onlyOne,
      rng: createRng("seed-a"),
    });
    const usage = picks.filter((p) => p.text.includes("Solo")).length;
    expect(usage).toBeLessThanOrEqual(2);
  });

  it("is reproducible: same templates + seed → same picks", () => {
    const a = pickTemplates({
      templates: buildRichPool(),
      participants,
      rng: createRng("seed-determinism"),
    });
    const b = pickTemplates({
      templates: buildRichPool(),
      participants,
      rng: createRng("seed-determinism"),
    });
    expect(a.map((p) => p.templateId)).toEqual(b.map((p) => p.templateId));
    expect(a.map((p) => p.text)).toEqual(b.map((p) => p.text));
  });

  it("falls back to GENERIC when GROUP_SPECIFIC is too thin", () => {
    const thin: BingoCellTemplate[] = [];
    for (let i = 0; i < 20; i++) thin.push(makeTemplate(i, BingoCategory.GENERIC));
    // Only 1 GROUP_SPECIFIC template (need 5) → fallback should add 4 GENERIC.
    thin.push(makeTemplate(0, BingoCategory.GROUP_SPECIFIC));
    for (let i = 0; i < 5; i++)
      thin.push(makeTemplate(i, BingoCategory.SELF_REFERENTIAL));

    const picks = pickTemplates({
      templates: thin,
      participants,
      rng: createRng("seed-fb"),
    });
    expect(picks.length).toBe(GRID_CELL_COUNT);
    const groupCount = picks.filter(
      (p) => p.category === BingoCategory.GROUP_SPECIFIC
    ).length;
    expect(groupCount).toBeLessThanOrEqual(1);
    const genericCount = picks.filter(
      (p) => p.category === BingoCategory.GENERIC
    ).length;
    expect(genericCount).toBeGreaterThanOrEqual(
      CATEGORY_DISTRIBUTION.GENERIC // at least the target
    );
  });

  it("throws when no fallback can fill the grid", () => {
    // Only 5 templates total → cannot reach 16.
    const tiny: BingoCellTemplate[] = [];
    for (let i = 0; i < 5; i++) tiny.push(makeTemplate(i, BingoCategory.GENERIC));
    expect(() =>
      pickTemplates({
        templates: tiny,
        participants,
        rng: createRng("seed-tiny"),
      })
    ).toThrow();
  });
});
