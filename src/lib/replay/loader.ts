import type {
  ReplayData,
  ReplayFrame,
  ReplayPosition,
  ReplayTimeRecord,
  ReplayPost,
} from "./types";

const FRAME_INTERVAL_MS = 5_000; // 5-second frames
const PAGE_SIZE = 10_000;

interface RawPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  timestamp: string;
  entry: {
    rider: { id: string };
  };
}

interface RawTimeRecord {
  timestamp: string;
  checkpoint: { name: string; type: string };
  entry: {
    rider: { id: string; firstName: string };
  };
}

interface RawPost {
  id: string;
  type: string;
  content: string;
  photoUrl: string | null;
  createdAt: string;
}

/**
 * Load all replay data for a stage, handling pagination.
 */
export async function loadReplayData(stageId: string): Promise<ReplayData> {
  // Load all pages of positions
  const allPositions: ReplayPosition[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `/api/replay?stageId=${stageId}&type=positions&page=${page}&pageSize=${PAGE_SIZE}`
    );
    const data = await res.json();
    const positions: ReplayPosition[] = data.positions.map(
      (p: RawPosition) => ({
        riderId: p.entry.rider.id,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        speed: p.speed,
        timestamp: new Date(p.timestamp).getTime(),
      })
    );
    allPositions.push(...positions);
    hasMore = data.hasMore;
    page++;
  }

  // Load time records
  const trRes = await fetch(
    `/api/replay?stageId=${stageId}&type=timeRecords`
  );
  const trData = await trRes.json();
  const timeRecords: ReplayTimeRecord[] = trData.timeRecords.map(
    (r: RawTimeRecord) => ({
      riderId: r.entry.rider.id,
      riderName: r.entry.rider.firstName,
      checkpointName: r.checkpoint.name,
      checkpointType: r.checkpoint.type,
      timestamp: new Date(r.timestamp).getTime(),
    })
  );

  // Load posts
  const postRes = await fetch(
    `/api/replay?stageId=${stageId}&type=posts`
  );
  const postData = await postRes.json();
  const posts: ReplayPost[] = postData.posts.map((p: RawPost) => ({
    id: p.id,
    type: p.type,
    content: p.content,
    photoUrl: p.photoUrl,
    createdAt: new Date(p.createdAt).getTime(),
  }));

  // Build frames (group positions into 5-second buckets)
  const frames = buildFrames(allPositions, FRAME_INTERVAL_MS);

  const startTime = frames.length > 0 ? frames[0].timestamp : 0;
  const endTime =
    frames.length > 0 ? frames[frames.length - 1].timestamp : 0;

  return {
    frames,
    timeRecords,
    posts,
    startTime,
    endTime,
    totalDurationMs: endTime - startTime,
  };
}

/**
 * Group positions into frames at a fixed interval.
 * Each frame contains the latest known position per rider at that timestamp.
 */
function buildFrames(
  positions: ReplayPosition[],
  intervalMs: number
): ReplayFrame[] {
  if (positions.length === 0) return [];

  // Sort by timestamp
  positions.sort((a, b) => a.timestamp - b.timestamp);

  const minTime = positions[0].timestamp;
  const maxTime = positions[positions.length - 1].timestamp;
  const frames: ReplayFrame[] = [];

  let posIdx = 0;
  const latestByRider = new Map<string, ReplayPosition>();

  for (let t = minTime; t <= maxTime; t += intervalMs) {
    // Advance pointer and update latest positions
    while (posIdx < positions.length && positions[posIdx].timestamp <= t) {
      const p = positions[posIdx];
      latestByRider.set(p.riderId, p);
      posIdx++;
    }

    frames.push({
      timestamp: t,
      positions: Array.from(latestByRider.values()),
    });
  }

  return frames;
}
