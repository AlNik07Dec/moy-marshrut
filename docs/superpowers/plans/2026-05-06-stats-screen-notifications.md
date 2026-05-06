# Stats Screen & Walk Reminder Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a «Статистика» tab with a weekly summary, pie chart (by mode), line chart (distance), and a configurable daily walk-reminder notification.

**Architecture:** New Zustand store `notificationStore` persists reminder settings (enabled, hour, minute) via AsyncStorage. `notificationService` wraps `expo-notifications` for scheduling/cancelling daily triggers. `historyStore` gains a `weekStats()` selector. The `stats.tsx` tab composes everything into a ScrollView. No test framework is configured; verification is done via Expo Go on device/simulator.

**Tech Stack:** Expo ~54, React Native 0.81, Expo Router ~6, `expo-notifications`, `@react-native-async-storage/async-storage`, `react-native-chart-kit` + `react-native-svg` (already installed), `@react-native-community/datetimepicker` (already installed), Zustand ~5 (already installed).

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/stores/historyStore.ts` |
| Create | `src/services/notificationService.ts` |
| Create | `src/stores/notificationStore.ts` |
| Create | `app/(tabs)/stats.tsx` |
| Modify | `app/(tabs)/_layout.tsx` |

---

## Task 1: Install new dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install `expo-notifications` and `@react-native-async-storage/async-storage`**

```bash
cd "D:\Cursor\Project\Мой маршрут"
npx expo install expo-notifications @react-native-async-storage/async-storage
```

Expected: both packages added to `package.json` `dependencies`, `node_modules` updated.

- [ ] **Step 2: Verify install**

```bash
grep -E "expo-notifications|async-storage" package.json
```

Expected output contains both package names.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-notifications and async-storage"
```

---

## Task 2: Add `weekStats()` selector to `historyStore`

**Files:**
- Modify: `src/stores/historyStore.ts`

- [ ] **Step 1: Add `WeekStats` type and `weekStats()` method to the interface**

In `src/stores/historyStore.ts`, add the `WeekStats` type after the existing `DayGroup` type, add `weekStats: () => WeekStats` to the `HistoryState` interface, and implement `weekStats` in the store. Replace the full file with:

```ts
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
  byMode: { fast: number; slow: number; parkGame: number };
  dailyKm: number[];   // 7 elements, index 0 = Monday of current week
  dayLabels: string[]; // ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
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
  weekStats: () => WeekStats;
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

  weekStats: (): WeekStats => {
    const { sessions } = get();
    const monday = getMondayOf(new Date());
    const weekStart = monday.getTime();
    const weekEnd = weekStart + 7 * DAY_MS;

    const thisWeek = sessions.filter((s) => s.date >= weekStart && s.date < weekEnd);

    const byMode = { fast: 0, slow: 0, parkGame: 0 };
    let totalKm = 0;
    let totalWalks = 0;
    let totalSeconds = 0;
    const dailyKm = [0, 0, 0, 0, 0, 0, 0];

    for (const s of thisWeek) {
      totalKm += s.distanceMeters / 1000;
      totalWalks += 1;
      totalSeconds += s.durationSeconds;

      const mode = s.mode as keyof typeof byMode;
      if (mode in byMode) byMode[mode] += 1;

      // Day index: 0 = Monday, 6 = Sunday
      const sessionDay = new Date(s.date).getDay(); // 0=Sun
      const idx = sessionDay === 0 ? 6 : sessionDay - 1;
      dailyKm[idx] += s.distanceMeters / 1000;
    }

    return {
      totalKm,
      totalWalks,
      totalSeconds,
      byMode,
      dailyKm,
      dayLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    };
  },
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "D:\Cursor\Project\Мой маршрут"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/historyStore.ts
git commit -m "feat: add weekStats() selector to historyStore"
```

---

## Task 3: Create `notificationService.ts`

**Files:**
- Create: `src/services/notificationService.ts`

- [ ] **Step 1: Create the file**

```ts
// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Нет разрешения',
      'Разрешите уведомления в настройках телефона, чтобы получать напоминания о прогулке.',
    );
    return false;
  }
  return true;
}

export async function scheduleDaily(hour: number, minute: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Walk&Paw 🐾',
      body: 'Время для прогулки!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as Notifications.DailyTriggerInput,
  });
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/notificationService.ts
git commit -m "feat: add notificationService (expo-notifications wrapper)"
```

---

## Task 4: Create `notificationStore.ts`

**Files:**
- Create: `src/stores/notificationStore.ts`

- [ ] **Step 1: Create the file**

```ts
// src/stores/notificationStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestPermissions,
  scheduleDaily,
  cancelAll,
} from '@/services/notificationService';

interface NotificationState {
  enabled: boolean;
  hour: number;
  minute: number;
  setEnabled: (value: boolean) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      enabled: false,
      hour: 18,
      minute: 0,

      setEnabled: async (value: boolean) => {
        if (value) {
          const granted = await requestPermissions();
          if (!granted) return;
          const { hour, minute } = get();
          await scheduleDaily(hour, minute);
          set({ enabled: true });
        } else {
          await cancelAll();
          set({ enabled: false });
        }
      },

      setTime: async (hour: number, minute: number) => {
        set({ hour, minute });
        if (get().enabled) {
          await scheduleDaily(hour, minute);
        }
      },
    }),
    {
      name: 'notification-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/notificationStore.ts
git commit -m "feat: add notificationStore (Zustand + AsyncStorage persist)"
```

---

## Task 5: Create `stats.tsx` screen

**Files:**
- Create: `app/(tabs)/stats.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/(tabs)/stats.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PieChart, LineChart } from 'react-native-chart-kit';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useHistoryStore } from '@/stores/historyStore';
import { useNotificationStore } from '@/stores/notificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

const PIE_COLORS = {
  fast: '#e94560',
  slow: '#4f8ef7',
  parkGame: '#4CAF50',
};

const MODE_LABELS = {
  fast: 'Пробежка',
  slow: 'Прогулка',
  parkGame: 'Игра в парке',
};

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`;
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

export default function StatsScreen() {
  const { loadSessions, weekStats } = useHistoryStore();
  const { enabled, hour, minute, setEnabled, setTime } = useNotificationStore();
  const [showPicker, setShowPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const stats = weekStats();
  const hasData = stats.totalWalks > 0;
  const hasDistanceData = stats.dailyKm.some((v) => v > 0);

  // Pie chart data — only include modes with count > 0
  const pieData = (
    Object.entries(stats.byMode) as [keyof typeof PIE_COLORS, number][]
  )
    .filter(([, count]) => count > 0)
    .map(([mode, count]) => ({
      name: MODE_LABELS[mode],
      population: count,
      color: PIE_COLORS[mode],
      legendFontColor: '#1C1C1E',
      legendFontSize: 13,
    }));

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selected) {
      setTime(selected.getHours(), selected.getMinutes());
    }
  };

  const pickerDate = new Date();
  pickerDate.setHours(hour, minute, 0, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalKm.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>км</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalWalks}</Text>
          <Text style={styles.summaryLabel}>прогулок</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatHours(stats.totalSeconds)}</Text>
          <Text style={styles.summaryLabel}>время</Text>
        </View>
      </View>

      {/* Pie chart — by mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>По режимам</Text>
        {hasData ? (
          <PieChart
            data={pieData}
            width={CHART_WIDTH}
            height={160}
            chartConfig={{
              color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              labelColor: () => '#1C1C1E',
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            absolute={false}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>Нет прогулок за эту неделю</Text>
          </View>
        )}
      </View>

      {/* Line chart — distance per day */}
      {hasDistanceData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Дистанция за неделю</Text>
          <LineChart
            data={{
              labels: stats.dayLabels,
              datasets: [{ data: stats.dailyKm }],
            }}
            width={CHART_WIDTH}
            height={160}
            yAxisSuffix=" км"
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: () => '#8E8E93',
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#007AFF' },
              propsForBackgroundLines: { strokeWidth: 0.5, stroke: '#E5E5EA' },
            }}
            bezier
            style={{ borderRadius: 12 }}
            fromZero
          />
        </View>
      )}

      {/* Notification settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Напоминания</Text>
        <View style={styles.notifCard}>
          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.notifLabel}>Напоминать о прогулке</Text>
              <Pressable onPress={() => enabled && setShowPicker(true)}>
                <Text style={[styles.notifTime, !enabled && styles.notifTimeDisabled]}>
                  {padTwo(hour)}:{padTwo(minute)}
                </Text>
              </Pressable>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>
          {enabled && (
            <Text style={styles.notifHint}>
              Каждый день в {padTwo(hour)}:{padTwo(minute)} — нажми на время, чтобы изменить
            </Text>
          )}
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { paddingBottom: 40 },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    margin: 16,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  summaryLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  section: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptyChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: '#8E8E93' },
  notifCard: { gap: 8 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifInfo: { flex: 1 },
  notifLabel: { fontSize: 15, color: '#1C1C1E' },
  notifTime: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 2,
  },
  notifTimeDisabled: { color: '#C7C7CC' },
  notifHint: { fontSize: 12, color: '#8E8E93' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/stats.tsx
git commit -m "feat: add Stats screen (pie chart, line chart, notification settings)"
```

---

## Task 6: Add «Статистика» tab to `_layout.tsx`

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add the third tab**

Replace the full content of `app/(tabs)/_layout.tsx` with:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Walk&Paw',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Статистика',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test in Expo Go**

- Run `npx expo start` and open on device or simulator
- Verify three tabs appear: Walk&Paw / История / Статистика
- Navigate to «Статистика»:
  - With no walks this week: summary shows 0, pie chart shows "Нет прогулок", line chart is hidden
  - Toggle «Напоминать о прогулке» on: OS permission dialog appears; if granted, switch stays on
  - Tap time (28pt blue number): DateTimePicker opens, change time, verify it updates
  - Toggle off: switch turns off
- Navigate to «История» and back — stats screen still shows correct toggle state (AsyncStorage persisted)

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat: add Статистика tab to bottom navigation"
```

---

## Self-Review

**Spec coverage:**
- [x] New «Статистика» tab → Task 6
- [x] Summary row (km / walks / time) → Task 5
- [x] PieChart by modes → Task 5
- [x] LineChart distance/week → Task 5
- [x] `weekStats()` selector → Task 2
- [x] `notificationService` (permissions, schedule, cancel) → Task 3
- [x] `notificationStore` (enabled, hour, minute, persist) → Task 4
- [x] DateTimePicker to change time → Task 5
- [x] Fallback when no data → Task 5
- [x] Permission-denied alert → Task 3

**Type consistency:**
- `WeekStats.dailyKm` (7-element array) used identically in Task 2 and Task 5 ✓
- `WeekStats.dayLabels` `string[]` used in Task 5 ✓
- `notificationStore` exports `useNotificationStore`; imported in Task 5 as `useNotificationStore` ✓
- `notificationService` exports `requestPermissions`, `scheduleDaily`, `cancelAll`; all three imported in Task 4 ✓
- `setEnabled` signature `(value: boolean) => Promise<void>` matches Switch `onValueChange` (`(value: boolean) => void`) — React Native Switch accepts async callbacks ✓

**No placeholders:** all code blocks are complete. ✓
