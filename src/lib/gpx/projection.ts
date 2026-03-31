import { haversine } from "@/lib/utils/haversine";
import type { GPXPoint } from "./parser";

export interface ProjectionResult {
  distanceFromStart: number;
  segmentIndex: number;
  nearestPoint: { lat: number; lng: number };
}

/**
 * Project a point onto a GPX polyline.
 * Returns the distance from start along the polyline to the nearest segment.
 */
export function projectOnPolyline(
  lat: number,
  lng: number,
  polyline: GPXPoint[]
): ProjectionResult {
  if (polyline.length === 0) {
    return { distanceFromStart: 0, segmentIndex: 0, nearestPoint: { lat, lng } };
  }

  if (polyline.length === 1) {
    return {
      distanceFromStart: 0,
      segmentIndex: 0,
      nearestPoint: { lat: polyline[0].lat, lng: polyline[0].lng },
    };
  }

  let minDist = Infinity;
  let bestSegmentIndex = 0;
  let bestFraction = 0;

  // Precompute cumulative distances
  const cumDist: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    cumDist[i] =
      cumDist[i - 1] +
      haversine(
        polyline[i - 1].lat,
        polyline[i - 1].lng,
        polyline[i].lat,
        polyline[i].lng
      );
  }

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];

    const { distance, fraction } = pointToSegmentDistance(
      lat,
      lng,
      a.lat,
      a.lng,
      b.lat,
      b.lng
    );

    if (distance < minDist) {
      minDist = distance;
      bestSegmentIndex = i;
      bestFraction = fraction;
    }
  }

  const segmentLength = cumDist[bestSegmentIndex + 1] - cumDist[bestSegmentIndex];
  const distanceFromStart = cumDist[bestSegmentIndex] + bestFraction * segmentLength;

  const a = polyline[bestSegmentIndex];
  const b = polyline[bestSegmentIndex + 1];
  const nearestPoint = {
    lat: a.lat + bestFraction * (b.lat - a.lat),
    lng: a.lng + bestFraction * (b.lng - a.lng),
  };

  return {
    distanceFromStart,
    segmentIndex: bestSegmentIndex,
    nearestPoint,
  };
}

/**
 * Calculate the distance from a point to a line segment,
 * and the fraction along the segment for the nearest point.
 */
function pointToSegmentDistance(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): { distance: number; fraction: number } {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;

  let fraction = 0;
  if (lenSq > 0) {
    fraction = ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
    fraction = Math.max(0, Math.min(1, fraction));
  }

  const projLat = aLat + fraction * dy;
  const projLng = aLng + fraction * dx;

  return {
    distance: haversine(pLat, pLng, projLat, projLng),
    fraction,
  };
}
