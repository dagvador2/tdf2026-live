import "server-only";
import { prisma } from "@/lib/db";

export type Period = "24h" | "7d" | "30d" | "all";

export const PERIOD_LABEL: Record<Period, string> = {
  "24h": "24h",
  "7d": "7 jours",
  "30d": "30 jours",
  all: "Depuis le début",
};

const PERIOD_INTERVAL: Record<Exclude<Period, "all">, string> = {
  "24h": "1 day",
  "7d": "7 days",
  "30d": "30 days",
};

export interface StoryStatsRow {
  storyId: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: Date | null;
  views: number;
  reads: number;
  shares: number;
  uniqueViews: number;
}

export interface AggregateKPIs {
  totalViews: number;
  totalReads: number;
  totalShares: number;
  uniqueVisitors: number;
  completionRate: number; // 0..1
}

/**
 * Per-story stats over the chosen period.
 *
 * "uniqueViews" : COUNT DISTINCT visitor (userId si connecté, sinon
 * sessionId, sinon NULL → compté chacun comme un anonyme distinct).
 */
export async function getStoryStats(period: Period): Promise<StoryStatsRow[]> {
  const sinceCondition =
    period === "all" ? "" : `AND ev.created_at > NOW() - INTERVAL '${PERIOD_INTERVAL[period]}'`;

  const rows = await prisma.$queryRawUnsafe<
    {
      story_id: string;
      slug: string;
      title: string;
      category: string;
      published_at: Date | null;
      views: bigint;
      reads: bigint;
      shares: bigint;
      unique_views: bigint;
    }[]
  >(`
    SELECT
      story.id AS story_id,
      story.slug,
      story.title,
      story.category,
      story.published_at,
      COUNT(*) FILTER (WHERE ev.kind = 'view')  AS views,
      COUNT(*) FILTER (WHERE ev.kind = 'read')  AS reads,
      COUNT(*) FILTER (WHERE ev.kind = 'share') AS shares,
      COUNT(DISTINCT COALESCE(ev.user_id, ev.session_id))
        FILTER (WHERE ev.kind = 'view')         AS unique_views
    FROM tour_stories story
    LEFT JOIN story_view_events ev
      ON ev.story_id = story.id
      ${sinceCondition}
    GROUP BY story.id
    ORDER BY views DESC, story.title ASC
  `);

  return rows.map((r) => ({
    storyId: r.story_id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    publishedAt: r.published_at,
    views: Number(r.views),
    reads: Number(r.reads),
    shares: Number(r.shares),
    uniqueViews: Number(r.unique_views),
  }));
}

export function aggregateKPIs(rows: StoryStatsRow[]): AggregateKPIs {
  let v = 0,
    r = 0,
    sh = 0,
    u = 0;
  for (const row of rows) {
    v += row.views;
    r += row.reads;
    sh += row.shares;
    u += row.uniqueViews;
  }
  return {
    totalViews: v,
    totalReads: r,
    totalShares: sh,
    uniqueVisitors: u,
    completionRate: v > 0 ? r / v : 0,
  };
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  views: number;
  reads: number;
}

/** Daily timeseries over the period (UTC days). */
export async function getDailyTimeseries(period: Period): Promise<DailyPoint[]> {
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;

  const rows = await prisma.$queryRawUnsafe<
    { day: Date; views: bigint; reads: bigint }[]
  >(`
    SELECT
      DATE_TRUNC('day', ev.created_at) AS day,
      COUNT(*) FILTER (WHERE ev.kind = 'view') AS views,
      COUNT(*) FILTER (WHERE ev.kind = 'read') AS reads
    FROM story_view_events ev
    WHERE ev.created_at > NOW() - INTERVAL '${days} days'
    GROUP BY day
    ORDER BY day ASC
  `);

  // Fill missing days with zeros for nicer chart.
  const map = new Map<string, { views: number; reads: number }>();
  for (const r of rows) {
    const key = new Date(r.day).toISOString().slice(0, 10);
    map.set(key, { views: Number(r.views), reads: Number(r.reads) });
  }
  const out: DailyPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const v = map.get(key) ?? { views: 0, reads: 0 };
    out.push({ date: key, views: v.views, reads: v.reads });
  }
  return out;
}

export interface PerUserReads {
  userId: string;
  name: string | null;
  email: string | null;
  riderName: string | null;
  readSlugs: string[];
  readCount: number;
}

/**
 * "Qui a lu quoi" : pour chaque User qui a au moins un event "read" sur la
 * periode, retourne la liste distincte des slugs lus. Ne tient PAS compte
 * du sessionId anonyme.
 */
export async function getPerUserReads(period: Period): Promise<PerUserReads[]> {
  const sinceCondition =
    period === "all" ? "" : `AND ev.created_at > NOW() - INTERVAL '${PERIOD_INTERVAL[period]}'`;

  const rows = await prisma.$queryRawUnsafe<
    {
      user_id: string;
      name: string | null;
      email: string | null;
      rider_name: string | null;
      slugs: string[];
    }[]
  >(`
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      r.first_name AS rider_name,
      ARRAY_AGG(DISTINCT s.slug ORDER BY s.slug) AS slugs
    FROM users u
    JOIN story_view_events ev
      ON ev.user_id = u.id
      AND ev.kind = 'read'
      ${sinceCondition}
    JOIN tour_stories s ON s.id = ev.story_id
    LEFT JOIN riders r ON r.id = u.rider_id
    GROUP BY u.id, r.first_name
    ORDER BY COUNT(DISTINCT s.slug) DESC, u.name ASC
  `);

  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    riderName: r.rider_name,
    readSlugs: r.slugs,
    readCount: r.slugs.length,
  }));
}
