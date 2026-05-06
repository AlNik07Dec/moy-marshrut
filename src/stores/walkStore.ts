import { create } from 'zustand';
import { insertSession } from '@/db/database';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type WalkMode = 'fast' | 'slow' | 'parkGame';

export const WALK_MODES: { id: WalkMode; label: string; icon: string }[] = [
  { id: 'fast', label: 'Быстрая', icon: '🐕' },
  { id: 'slow', label: 'Медленная', icon: '🚶' },
  { id: 'parkGame', label: 'Игра в парке', icon: '🎮' },
];

interface WalkState {
  selectedMode: WalkMode;
  isWalkActive: boolean;

  // Active walk state
  startCoordinate: Coordinate | null;
  routeCoordinates: Coordinate[];
  elapsedSeconds: number;
  distanceMeters: number;
  speedKmh: number;

  // Actions
  setMode: (mode: WalkMode) => void;
  startWalk: () => void;
  addCoordinate: (coord: Coordinate) => void;
  tickSecond: () => void;
  finishWalk: () => Promise<void>;
  reset: () => void;
}

function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export const useWalkStore = create<WalkState>((set, get) => ({
  selectedMode: 'slow',
  isWalkActive: false,
  startCoordinate: null,
  routeCoordinates: [],
  elapsedSeconds: 0,
  distanceMeters: 0,
  speedKmh: 0,

  setMode: (mode) => set({ selectedMode: mode }),

  startWalk: () =>
    set({
      isWalkActive: true,
      startCoordinate: null,
      routeCoordinates: [],
      elapsedSeconds: 0,
      distanceMeters: 0,
      speedKmh: 0,
    }),

  addCoordinate: (coord) => {
    const { routeCoordinates, distanceMeters, elapsedSeconds } = get();
    const prev =
      routeCoordinates.length > 0
        ? routeCoordinates[routeCoordinates.length - 1]
        : null;

    let delta = 0;
    let newSpeed = 0;
    if (prev) {
      delta = haversineDistance(prev, coord);
      // Speed: meters per elapsed second tick (approximate)
      newSpeed = elapsedSeconds > 0 ? delta * 3.6 : 0;
    }

    set((state) => ({
      routeCoordinates: [...state.routeCoordinates, coord],
      startCoordinate: state.startCoordinate ?? coord,
      distanceMeters: distanceMeters + delta,
      speedKmh: newSpeed > 0 ? newSpeed : state.speedKmh,
    }));
  },

  tickSecond: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  finishWalk: async () => {
    const { selectedMode, routeCoordinates, distanceMeters, elapsedSeconds, startCoordinate } =
      get();

    const endCoord =
      routeCoordinates.length > 0
        ? routeCoordinates[routeCoordinates.length - 1]
        : null;

    await insertSession({
      date: Date.now(),
      mode: selectedMode,
      distanceMeters,
      durationSeconds: elapsedSeconds,
      routeCoordinates: JSON.stringify(routeCoordinates),
      startLat: startCoordinate?.latitude ?? null,
      startLng: startCoordinate?.longitude ?? null,
      endLat: endCoord?.latitude ?? null,
      endLng: endCoord?.longitude ?? null,
    });

    set({ isWalkActive: false });
  },

  reset: () =>
    set({
      startCoordinate: null,
      routeCoordinates: [],
      elapsedSeconds: 0,
      distanceMeters: 0,
      speedKmh: 0,
    }),
}));
