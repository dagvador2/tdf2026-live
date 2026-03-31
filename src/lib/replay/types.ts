export interface ReplayPosition {
  riderId: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  timestamp: number; // Unix ms
}

export interface ReplayTimeRecord {
  riderId: string;
  riderName: string;
  checkpointName: string;
  checkpointType: string;
  timestamp: number; // Unix ms
}

export interface ReplayPost {
  id: string;
  type: string;
  content: string;
  photoUrl: string | null;
  createdAt: number; // Unix ms
}

export interface ReplayFrame {
  timestamp: number;
  positions: ReplayPosition[];
}

export interface ReplayData {
  frames: ReplayFrame[];
  timeRecords: ReplayTimeRecord[];
  posts: ReplayPost[];
  startTime: number;
  endTime: number;
  totalDurationMs: number;
}
