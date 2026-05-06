import { create } from 'zustand';
import { fetchSessions, WalkSession } from '@/db/database';

export type HistoryFilter = 'week' | 'month';

export interface DayGroup {
  date: Date;
  dateKey: string;
  sessions: WalkSession[];
  totalDistanceMeters: number;
}

interface HistoryState {
  sessions: WalkSession[];
  filter: HistoryFilter;
  isLoading: boolean;

  setFilter: (filter: HistoryFilter) => void;
  loadSessions: () => Promise<void>;

  // Derived
  filteredSessions: () => WalkSession[];
  sessionsByDay: () => DayGroup[];
}

const DAY_MS = 86400 * 1000;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  sessions: [],
  filter: 'week',
  isLoading: false,

  setFilter: (filter) => set({ filter }),

  loadSessions: async () => {
    set({ isLoading: true });
    const rows = await fetchSessions();
    set({ sessions: rows, isLoading: false });
  },

  filteredSessions: () => {
    const { sessions, filter } = get();
    const cutoff = Date.now() - (filter === 'week' ? 7 : 30) * DAY_MS;
    return sessions.filter((s) => s.date >= cutoff);
  },

  sessionsByDay: () => {
    const filtered = get().filteredSessions();
    const map = new Map<string, DayGroup>();

    for (const session of filtered) {
      const d = new Date(session.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) {
        map.set(key, {
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          dateKey: key,
          sessions: [],
          totalDistanceMeters: 0,
        });
      }
      const group = map.get(key)!;
      group.sessions.push(session);
      group.totalDistanceMeters += session.distanceMeters;
    }

    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  },
}));
