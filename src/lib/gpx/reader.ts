import "server-only";

import { readFileSync } from "fs";
import { join } from "path";
import { parseGPX, type GPXData } from "./parser";

/**
 * Read a GPX file from the public directory and parse it.
 * Server-only (uses Node.js fs).
 * @param gpxUrl — relative URL like "/gpx/etape-1-voiron.gpx"
 */
export function readGPXFile(gpxUrl: string): GPXData | null {
  try {
    const filePath = join(process.cwd(), "public", gpxUrl);
    const gpxString = readFileSync(filePath, "utf-8");
    return parseGPX(gpxString);
  } catch {
    return null;
  }
}

/**
 * Read a GPX file from the public directory and return the raw string.
 * Server-only (uses Node.js fs).
 */
export function readGPXFileRaw(gpxUrl: string): string | null {
  try {
    const filePath = join(process.cwd(), "public", gpxUrl);
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}
