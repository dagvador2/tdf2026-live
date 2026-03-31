import { haversine } from "@/lib/utils/haversine";

export interface GPXPoint {
  lat: number;
  lng: number;
  ele: number;
}

export interface GPXData {
  coordinates: GPXPoint[];
  elevationProfile: { distance: number; elevation: number }[];
  totalDistance: number;
  totalElevationGain: number;
  minElevation: number;
  maxElevation: number;
}

/**
 * Parse a GPX XML string into structured data.
 */
export function parseGPX(gpxString: string): GPXData {
  const trkpts = extractTrackpoints(gpxString);

  if (trkpts.length === 0) {
    return {
      coordinates: [],
      elevationProfile: [],
      totalDistance: 0,
      totalElevationGain: 0,
      minElevation: 0,
      maxElevation: 0,
    };
  }

  let cumulativeDistance = 0;
  let totalElevationGain = 0;
  let minElevation = trkpts[0].ele;
  let maxElevation = trkpts[0].ele;

  const elevationProfile: { distance: number; elevation: number }[] = [
    { distance: 0, elevation: trkpts[0].ele },
  ];

  for (let i = 1; i < trkpts.length; i++) {
    const prev = trkpts[i - 1];
    const curr = trkpts[i];

    cumulativeDistance += haversine(prev.lat, prev.lng, curr.lat, curr.lng);

    const elevDiff = curr.ele - prev.ele;
    if (elevDiff > 0) {
      totalElevationGain += elevDiff;
    }

    minElevation = Math.min(minElevation, curr.ele);
    maxElevation = Math.max(maxElevation, curr.ele);

    elevationProfile.push({
      distance: cumulativeDistance,
      elevation: curr.ele,
    });
  }

  return {
    coordinates: trkpts,
    elevationProfile,
    totalDistance: cumulativeDistance,
    totalElevationGain,
    minElevation,
    maxElevation,
  };
}

/**
 * Extract trackpoints from GPX XML string using regex (works on server & client).
 */
function extractTrackpoints(gpxString: string): GPXPoint[] {
  const points: GPXPoint[] = [];
  const eleRegex = /<ele>([^<]+)<\/ele>/;

  // Use a simpler, more robust approach: split by trkpt tags
  const segments = gpxString.split(/<trkpt\s/);

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const latMatch = segment.match(/lat=["']([^"']+)["']/);
    const lonMatch = segment.match(/lon=["']([^"']+)["']/) || segment.match(/lng=["']([^"']+)["']/);
    const eleMatch = segment.match(eleRegex);

    if (latMatch && lonMatch) {
      points.push({
        lat: parseFloat(latMatch[1]),
        lng: parseFloat(lonMatch[1]),
        ele: eleMatch ? parseFloat(eleMatch[1]) : 0,
      });
    }
  }

  return points;
}
