// Lecture seule — parse le nouveau GPX CLM (distance, D+, départ/arrivée)
import * as fs from 'fs';
import { parseGPX } from '../src/lib/gpx/parser';

const file = process.argv[2] ?? '/Users/clemdaguetschott/Downloads/CLM 21 Juillet.gpx';
const gpx = parseGPX(fs.readFileSync(file, 'utf-8'));
const pts = gpx.coordinates;
const first = pts[0];
const last = pts[pts.length - 1];
console.log(JSON.stringify({
  points: pts.length,
  totalDistance: gpx.totalDistance,
  totalElevationGain: Math.round(gpx.totalElevationGain),
  minElevation: gpx.minElevation,
  maxElevation: gpx.maxElevation,
  first,
  last,
}, null, 2));
