import { create } from 'zustand';
import { fetchSessions, WalkSession } from '@/db/database';

export type HistoryFilter = 'week' | 'month';

export interface DayGroup {
  date: Date;
  dateKey: string;
  sessions: WalkSession[];
  totalDistanceMeters: number;
}

export interface WeekStats {
  totalKm: number;
  totalWalks: number;
  totalSeconds: number;
  totalCalories: number;
  byMode: { fast: number; slow: number; parkGame: number };
  dailyKm: number[];   // 7 elements for week, 30 for month
  dayLabels: string[]; // matching labels array
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
  periodStats: (filter: HistoryFilter) => WeekStats;
}

const DAY_MS = 86400 * 1000;

/** Returns the Monday (00:00:00.000) of the week containing `date` (local time). */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMon = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMon);
  d.setHours(0, 0, 0, 0);
  return d;
}

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

  periodStats: (filter: HistoryFilter): WeekStats => {
    const { sessions } = get();

    if (filter === 'week') {
      const monday = getMondayOf(new Date());
      const weekStart = monday.getTime();
      const weekEnd = weekStart + 7 * DAY_MS;
      const thisWeek = sessions.filter((s) => s.date >= weekStart && s.date < weekEnd);

      const byMode = { fast: 0, slow: 0, parkGame: 0 };
      let totalKm = 0, totalWalks = 0, totalSeconds = 0, totalCalories = 0;
      const dailyKm = [0, 0, 0, 0, 0, 0, 0];

      for (const s of thisWeek) {
        totalKm += s.distanceMeters / 1000;
        totalWalks += 1;
        totalSeconds += s.durationSeconds;
        totalCalories += s.calories ?? 0;
        const mode = s.mode as keyof typeof byMode;
        if (mode in byMode) byMode[mode] += 1;
        const sessionDay = new Date(s.date).getDay();
        const idx = sessionDay === 0 ? 6 : sessionDay - 1;
        dailyKm[idx] += s.distanceMeters / 1000;
      }

      return {
        totalKm,
        totalWalks,
        totalSeconds,
        totalCalories: Math.round(totalCalories),
        byMode,
        dailyKm,
        dayLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      };
    }

    // Month: last 30 days (index 0 = 29 days ago, index 29 = today)
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const monthStart = new Date(todayMidnight);
    monthStart.setDate(monthStart.getDate() - 29);

    const thisMonth = sessions.filter((s) => s.date >= monthStart.getTime());

    const dayLabels: string[] = Array.from({ length: 30 }, (_, i) => {
      if (i % 5 === 0 || i === 29) {
        const d = new Date(monthStart);
        d.setDate(d.getDate() + i);
        return String(d.getDate());
      }
      return '';
    });

    const byMode = { fast: 0, slow: 0, parkGame: 0 };
    let totalKm = 0, totalWalks = 0, totalSeconds = 0, totalCalories = 0;
    const dailyKm: number[] = new Array(30).fill(0);

    for (const s of thisMonth) {
      totalKm += s.distanceMeters / 1000;
      totalWalks += 1;
      totalSeconds += s.durationSeconds;
      totalCalories += s.calories ?? 0;
      const mode = s.mode as keyof typeof byMode;
      if (mode in byMode) byMode[mode] += 1;
      const sessionMidnight = new Date(s.date);
      sessionMidnight.setHours(0, 0, 0, 0);
      const daysFromStart = Math.round(
        (sessionMidnight.getTime() - monthStart.getTime()) / DAY_MS
      );
      if (daysFromStart >= 0 && daysFromStart < 30) {
        dailyKm[daysFromStart] += s.distanceMeters / 1000;
      }
    }

    return {
      totalKm,
      totalWalks,
      totalSeconds,
      totalCalories: Math.round(totalCalories),
      byMode,
      dailyKm,
      dayLabels,
    };
  },
}));
