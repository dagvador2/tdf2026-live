import {
  BingoCategory,
  type BingoCellTemplate,
  type BingoGrid,
  type BingoGridCell,
  type PrismaClient,
} from "@prisma/client";
import {
  CATEGORY_DISTRIBUTION,
  GRID_CELL_COUNT,
  MAX_NAME_REPEAT_PER_GRID,
  NAME_PLACEHOLDER,
} from "./constants";
import {
  type RNG,
  createRng,
  pickWeighted,
  randomSeed,
  shuffle,
} from "./rng";

export type ParticipantForBingo = {
  id: string;
  name: string;
};

type Picked = {
  templateId: string;
  text: string;
  category: BingoCategory;
};

type GeneratedGrid = BingoGrid & { cells: BingoGridCell[] };

export type GenerateGridParams = {
  eventId: string;
  userId: string;
  prisma: PrismaClient;
};

/**
 * Idempotent grid generation. Returns the existing grid for (eventId, userId)
 * if one already exists; otherwise picks 16 templates following the category
 * distribution + weighting rules, substitutes {name} placeholders, shuffles
 * positions, and persists the grid + cells in one transaction.
 */
export async function generateGrid(
  params: GenerateGridParams
): Promise<GeneratedGrid> {
  const { eventId, userId, prisma } = params;

  const existing = await prisma.bingoGrid.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { cells: { orderBy: { position: "asc" } } },
  });
  if (existing) return existing;

  const templates = await prisma.bingoCellTemplate.findMany({
    where: { eventId, isActive: true, NOT: { targetUserId: userId } },
  });

  const participants = await loadParticipants(prisma, userId);

  const seed = randomSeed();
  const rng = createRng(seed);

  const picks = pickTemplates({ templates, participants, rng });

  // Map picks → positions via a Fisher-Yates shuffle driven by the SAME RNG,
  // so (eventId, userId, seed) deterministically reproduces the layout.
  const positions = shuffle(
    Array.from({ length: GRID_CELL_COUNT }, (_, i) => i),
    rng
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const grid = await tx.bingoGrid.create({
        data: { eventId, userId, seed },
      });

      await tx.bingoGridCell.createMany({
        data: picks.map((p, i) => ({
          gridId: grid.id,
          templateId: p.templateId,
          position: positions[i],
          text: p.text,
          category: p.category,
        })),
      });

      const cells = await tx.bingoGridCell.findMany({
        where: { gridId: grid.id },
        orderBy: { position: "asc" },
      });
      return { ...grid, cells };
    });
  } catch (err) {
    // Race: two concurrent generations for the same (eventId, userId) — the
    // @@unique constraint guarantees one wins. The other re-reads.
    if (isUniqueConstraintError(err)) {
      const settled = await prisma.bingoGrid.findUnique({
        where: { eventId_userId: { eventId, userId } },
        include: { cells: { orderBy: { position: "asc" } } },
      });
      if (settled) return settled;
    }
    throw err;
  }
}

async function loadParticipants(
  prisma: PrismaClient,
  excludeUserId: string
): Promise<ParticipantForBingo[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "rider",
      NOT: { id: excludeUserId },
      name: { not: null },
    },
    select: { id: true, name: true, rider: { select: { firstName: true } } },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.rider?.firstName ?? u.name ?? "Anonyme",
  }));
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

type PickTemplatesParams = {
  templates: BingoCellTemplate[];
  participants: ParticipantForBingo[];
  rng: RNG;
};

export function pickTemplates({
  templates,
  participants,
  rng,
}: PickTemplatesParams): Picked[] {
  const byCategory: Record<BingoCategory, BingoCellTemplate[]> = {
    GENERIC: [],
    GROUP_SPECIFIC: [],
    SELF_REFERENTIAL: [],
  };
  for (const t of templates) byCategory[t.category].push(t);

  const picked: Picked[] = [];
  const usedTemplateIds = new Set<string>();
  const nameUsage = new Map<string, number>();

  // Pass 1: try to honour the distribution from each category.
  for (const category of Object.keys(
    CATEGORY_DISTRIBUTION
  ) as BingoCategory[]) {
    const want = CATEGORY_DISTRIBUTION[category];
    const pool = byCategory[category].filter(
      (t) => !usedTemplateIds.has(t.id)
    );
    const got = pickFromPool({
      pool,
      count: want,
      participants,
      rng,
      nameUsage,
    });
    for (const p of got) {
      picked.push(p);
      usedTemplateIds.add(p.templateId);
    }
    if (got.length < want) {
      const missing = want - got.length;
      console.warn(
        `[bingo] category ${category} short by ${missing}/${want}, will fall back to GENERIC`
      );
    }
  }

  // Pass 2: fallback to GENERIC if any category came up short.
  if (picked.length < GRID_CELL_COUNT) {
    const genericPool = byCategory.GENERIC.filter(
      (t) => !usedTemplateIds.has(t.id)
    );
    const fillers = pickFromPool({
      pool: genericPool,
      count: GRID_CELL_COUNT - picked.length,
      participants,
      rng,
      nameUsage,
    });
    for (const f of fillers) {
      picked.push(f);
      usedTemplateIds.add(f.templateId);
    }
  }

  // Pass 3: last-resort fallback to ANY remaining active template.
  if (picked.length < GRID_CELL_COUNT) {
    const allPool = templates.filter((t) => !usedTemplateIds.has(t.id));
    const fillers = pickFromPool({
      pool: allPool,
      count: GRID_CELL_COUNT - picked.length,
      participants,
      rng,
      nameUsage,
    });
    for (const f of fillers) {
      picked.push(f);
      usedTemplateIds.add(f.templateId);
    }
  }

  if (picked.length < GRID_CELL_COUNT) {
    throw new Error(
      `[bingo] not enough active templates to fill a grid: got ${picked.length}/${GRID_CELL_COUNT}`
    );
  }

  return picked;
}

type PickFromPoolParams = {
  pool: BingoCellTemplate[];
  count: number;
  participants: ParticipantForBingo[];
  rng: RNG;
  nameUsage: Map<string, number>;
};

function pickFromPool({
  pool,
  count,
  participants,
  rng,
  nameUsage,
}: PickFromPoolParams): Picked[] {
  let remaining = pool.slice();
  const out: Picked[] = [];
  const skipped: BingoCellTemplate[] = [];

  while (out.length < count && remaining.length > 0) {
    const result = pickWeighted(remaining, rng);
    if (!result) break;
    const { picked: candidate, rest } = result;
    remaining = rest;

    const substituted = substituteName({
      template: candidate,
      participants,
      rng,
      nameUsage,
    });
    if (substituted === null) {
      // Could not satisfy the {name} constraint (cap reached for all
      // candidates). Park this template and try another.
      skipped.push(candidate);
      continue;
    }
    out.push({
      templateId: candidate.id,
      text: substituted.text,
      category: candidate.category,
    });
    if (substituted.usedName) {
      nameUsage.set(
        substituted.usedName,
        (nameUsage.get(substituted.usedName) ?? 0) + 1
      );
    }
  }

  // We deliberately do not retry skipped templates here: by definition the
  // {name} cap is grid-wide and won't loosen later in this pass.
  void skipped;
  return out;
}

type SubstituteParams = {
  template: BingoCellTemplate;
  participants: ParticipantForBingo[];
  rng: RNG;
  nameUsage: Map<string, number>;
};

function substituteName(
  params: SubstituteParams
): { text: string; usedName: string | null } | null {
  const { template, participants, rng, nameUsage } = params;

  if (!template.text.includes(NAME_PLACEHOLDER)) {
    return { text: template.text, usedName: null };
  }

  const eligible = participants.filter(
    (p) => (nameUsage.get(p.name) ?? 0) < MAX_NAME_REPEAT_PER_GRID
  );
  if (eligible.length === 0) return null;

  const pickIdx = Math.floor(rng() * eligible.length);
  const chosen = eligible[pickIdx];

  return {
    text: template.text.split(NAME_PLACEHOLDER).join(chosen.name),
    usedName: chosen.name,
  };
}
