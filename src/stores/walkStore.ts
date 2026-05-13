import { create } from 'zustand';
import { insertSession } from '@/db/database';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type WalkMode = 'fast' | 'slow' | 'parkGame';

export const WALK_MODES: { id: WalkMode; label: string; icon: string }[] = [
  { id: 'fast', label: 'Пробежка', icon: '🏃' },
  { id: 'slow', label: 'Прогулка', icon: '🚶' },
  { id: 'parkGame', label: 'Игра в парке', icon: '🎾' },
];

const KCAL_PER_KM: Record<WalkMode, number> = { fast: 80, slow: 60, parkGame: 70 };

interface WalkState {
  selectedMode: WalkMode;
  isWalkActive: boolean;

  // Active walk state
  startCoordinate: Coordinate | null;
  routeCoordinates: Coordinate[];
  elapsedSeconds: number;
  distanceMeters: number;
  speedKmh: number;
  stepCount: number;
  calories: number;
  startTime: number | null;

  // Actions
  setMode: (mode: WalkMode) => void;
  startWalk: () => void;
  addCoordinate: (coord: Coordinate) => void;
  tickSecond: () => void;
  setStepCount: (steps: number) => void;
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
  stepCount: 0,
  calories: 0,
  startTime: null,

  setMode: (mode) => set({ selectedMode: mode }),

  startWalk: () =>
    set({
      isWalkActive: true,
      startCoordinate: null,
      routeCoordinates: [],
      elapsedSeconds: 0,
      distanceMeters: 0,
      speedKmh: 0,
      stepCount: 0,
      calories: 0,
      startTime: Date.now(),
    }),

  addCoordinate: (coord) => {
    const { routeCoordinates, elapsedSeconds, selectedMode } = get();
    const prev =
      routeCoordinates.length > 0
        ? routeCoordinates[routeCoordinates.length - 1]
        : null;

    let delta = 0;
    let newSpeed = 0;
    if (prev) {
      delta = haversineDistance(prev, coord);
      newSpeed = elapsedSeconds > 0 ? delta * 3.6 : 0;
    }

    set((state) => {
      const newDist = state.distanceMeters + delta;
      return {
        routeCoordinates: [...state.routeCoordinates, coord],
        startCoordinate: state.startCoordinate ?? coord,
        distanceMeters: newDist,
        speedKmh: newSpeed > 0 ? newSpeed : state.speedKmh,
        calories: (newDist / 1000) * KCAL_PER_KM[selectedMode],
      };
    });
  },

  tickSecond: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  setStepCount: (steps) => set({ stepCount: steps }),

  finishWalk: async () => {
    const {
      selectedMode,
      routeCoordinates,
      distanceMeters,
      elapsedSeconds,
      stepCount,
      calories,
      startCoordinate,
      startTime,
    } = get();

    const endCoord =
      routeCoordinates.length > 0
        ? routeCoordinates[routeCoordinates.length - 1]
        : null;

    await insertSession({
      date: Date.now(),
      startTime: startTime ?? null,
      mode: selectedMode,
      distanceMeters,
      durationSeconds: elapsedSeconds,
      stepCount,
      calories,
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
      stepCount: 0,
      calories: 0,
      startTime: null,
    }),
}));
