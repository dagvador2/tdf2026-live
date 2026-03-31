import { APP_CONFIG } from "@/lib/utils/constants";

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number; // Unix ms
}

export type TrackerState = "idle" | "tracking" | "paused" | "error";

export interface TrackerFilter {
  maxAccuracyM: number;
  maxSpeedKmh: number;
  minDistanceM: number;
}

const DEFAULT_FILTERS: TrackerFilter = {
  maxAccuracyM: APP_CONFIG.GPS_MAX_ACCURACY_M,
  maxSpeedKmh: APP_CONFIG.GPS_MAX_SPEED_KMH,
  minDistanceM: APP_CONFIG.GPS_MIN_DISTANCE_M,
};

function haversineDistanceM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterGpsPoint(
  point: GpsPoint,
  lastPoint: GpsPoint | null,
  filters: TrackerFilter = DEFAULT_FILTERS
): { accepted: boolean; reason?: string } {
  if (point.accuracy !== null && point.accuracy > filters.maxAccuracyM) {
    return { accepted: false, reason: "accuracy_too_low" };
  }

  if (point.speed !== null && point.speed * 3.6 > filters.maxSpeedKmh) {
    return { accepted: false, reason: "speed_too_high" };
  }

  if (lastPoint) {
    const dist = haversineDistanceM(
      lastPoint.latitude,
      lastPoint.longitude,
      point.latitude,
      point.longitude
    );
    if (dist < filters.minDistanceM) {
      return { accepted: false, reason: "too_close" };
    }
  }

  return { accepted: true };
}

export class GpsTracker {
  private watchId: number | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private lastPoint: GpsPoint | null = null;
  private lastEmitTime = 0;
  private filters: TrackerFilter;
  private onPoint: (point: GpsPoint) => void;
  private onStateChange: (state: TrackerState) => void;
  private onError: (error: GeolocationPositionError) => void;

  state: TrackerState = "idle";

  constructor(opts: {
    onPoint: (point: GpsPoint) => void;
    onStateChange: (state: TrackerState) => void;
    onError: (error: GeolocationPositionError) => void;
    filters?: Partial<TrackerFilter>;
  }) {
    this.onPoint = opts.onPoint;
    this.onStateChange = opts.onStateChange;
    this.onError = opts.onError;
    this.filters = { ...DEFAULT_FILTERS, ...opts.filters };
  }

  async start() {
    if (this.state === "tracking") return;

    await this.requestWakeLock();

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10_000,
      }
    );

    this.setState("tracking");
  }

  pause() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.setState("paused");
  }

  async resume() {
    if (this.state !== "paused") return;
    await this.start();
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.releaseWakeLock();
    this.lastPoint = null;
    this.lastEmitTime = 0;
    this.setState("idle");
  }

  private handlePosition(pos: GeolocationPosition) {
    const now = Date.now();
    if (now - this.lastEmitTime < APP_CONFIG.GPS_INTERVAL_MS) return;

    const point: GpsPoint = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      altitude: pos.coords.altitude,
      speed: pos.coords.speed,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };

    const { accepted } = filterGpsPoint(point, this.lastPoint, this.filters);
    if (!accepted) return;

    this.lastPoint = point;
    this.lastEmitTime = now;
    this.onPoint(point);
  }

  private handleError(err: GeolocationPositionError) {
    this.setState("error");
    this.onError(err);
  }

  private setState(state: TrackerState) {
    this.state = state;
    this.onStateChange(state);
  }

  private async requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      }
    } catch {
      // WakeLock not available or denied — non-blocking
    }
  }

  private releaseWakeLock() {
    this.wakeLock?.release();
    this.wakeLock = null;
  }
}
