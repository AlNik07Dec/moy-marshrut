# Multiple Walk Reminders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single walk-reminder setting with a list of independent reminders, each with its own time, toggle, and delete button.

**Architecture:** `notificationStore` changes from a single `{ enabled, hour, minute }` to `{ reminders: Reminder[] }`. `notificationService` gains `scheduleWithId`/`cancelById`. `stats.tsx` renders the list UI.

**Tech Stack:** Expo ~54, React Native, Zustand v5 persist + AsyncStorage, expo-notifications (already installed), @react-native-community/datetimepicker (already installed).

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/services/notificationService.ts` |
| Modify | `src/stores/notificationStore.ts` |
| Modify | `app/(tabs)/stats.tsx` |

---

## Task 1: Extend `notificationService` with per-id scheduling

**Files:**
- Modify: `src/services/notificationService.ts`

- [ ] **Step 1: Add `scheduleWithId` and `cancelById` exports**

Replace the full content of `src/services/notificationService.ts` with:

```ts
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

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

export async function scheduleWithId(id: string, hour: number, minute: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
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

export async function cancelById(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDaily(hour: number, minute: number): Promise<void> {
  await cancelAll();
  await scheduleWithId('default', hour, minute);
}
```

Note: `scheduleDaily` is kept for backward compatibility (it's no longer used but may be imported elsewhere — keeping it avoids TypeScript errors during transition).

- [ ] **Step 2: Verify TypeScript**

```bash
cd "D:\Cursor\Project\Мой маршрут"
npx tsc --noEmit
```

Expected: only the known pre-existing `history.tsx` error. No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/notificationService.ts
git commit -m "feat: add scheduleWithId and cancelById to notificationService"
```

---

## Task 2: Refactor `notificationStore` to support multiple reminders

**Files:**
- Modify: `src/stores/notificationStore.ts`

- [ ] **Step 1: Replace the store**

Replace the full content of `src/stores/notificationStore.ts` with:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestPermissions,
  scheduleWithId,
  cancelById,
} from '@/services/notificationService';

export type Reminder = {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

interface NotificationState {
  reminders: Reminder[];
  addReminder: (hour: number, minute: number) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
  setReminderTime: (id: string, hour: number, minute: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: async (hour: number, minute: number) => {
        const granted = await requestPermissions();
        if (!granted) return;
        const id = Date.now().toString();
        await scheduleWithId(id, hour, minute);
        set((state) => ({
          reminders: [...state.reminders, { id, hour, minute, enabled: true }],
        }));
      },

      removeReminder: async (id: string) => {
        try {
          await cancelById(id);
        } finally {
          set((state) => ({
            reminders: state.reminders.filter((r) => r.id !== id),
          }));
        }
      },

      toggleReminder: async (id: string, enabled: boolean) => {
        const reminder = get().reminders.find((r) => r.id === id);
        if (!reminder) return;
        if (enabled) {
          const granted = await requestPermissions();
          if (!granted) return;
          await scheduleWithId(id, reminder.hour, reminder.minute);
        } else {
          try {
            await cancelById(id);
          } finally {
            // fall through to set state
          }
        }
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, enabled } : r,
          ),
        }));
      },

      setReminderTime: async (id: string, hour: number, minute: number) => {
        const reminder = get().reminders.find((r) => r.id === id);
        if (!reminder) return;
        if (reminder.enabled) {
          await scheduleWithId(id, hour, minute);
        }
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, hour, minute } : r,
          ),
        }));
      },
    }),
    {
      name: 'notification-reminders',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: only the known pre-existing `history.tsx` error. Note: `stats.tsx` will now have TypeScript errors because it still references the old `enabled`/`hour`/`minute`/`setEnabled`/`setTime` API — these will be fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add src/stores/notificationStore.ts
git commit -m "feat: refactor notificationStore to support multiple reminders"
```

---

## Task 3: Update `stats.tsx` with the new reminders list UI

**Files:**
- Modify: `app/(tabs)/stats.tsx`

- [ ] **Step 1: Replace the Напоминания section and related state**

Replace the full content of `app/(tabs)/stats.tsx` with:

```tsx
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
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
// @ts-ignore
import { PieChart, LineChart } from 'react-native-chart-kit';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useHistoryStore } from '@/stores/historyStore';
import { useNotificationStore, Reminder } from '@/stores/notificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const MAX_REMINDERS = 5;

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

type PickerMode = { type: 'add' } | { type: 'edit'; id: string };

export default function StatsScreen() {
  const { loadSessions, weekStats } = useHistoryStore();
  const { reminders, addReminder, removeReminder, toggleReminder, setReminderTime } =
    useNotificationStore();

  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const stats = weekStats();
  const hasData = stats.totalWalks > 0;
  const hasDistanceData = stats.dailyKm.some((v) => v > 0);

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

  const currentReminder =
    pickerMode?.type === 'edit'
      ? reminders.find((r) => r.id === pickerMode.id)
      : null;

  const pickerDate = new Date();
  if (currentReminder) {
    pickerDate.setHours(currentReminder.hour, currentReminder.minute, 0, 0);
  } else {
    pickerDate.setHours(18, 0, 0, 0);
  }

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setPickerMode(null);
    if (!selected) return;
    const h = selected.getHours();
    const m = selected.getMinutes();

    if (pickerMode?.type === 'add') {
      addReminder(h, m);
      setPickerMode(null);
    } else if (pickerMode?.type === 'edit' && pickerMode.id) {
      setReminderTime(pickerMode.id, h, m);
      if (Platform.OS === 'ios') setPickerMode(null);
    }
  };

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

      {/* Pie chart */}
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

      {/* Line chart */}
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

      {/* Reminders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Напоминания</Text>

        {reminders.map((reminder: Reminder) => (
          <View key={reminder.id} style={styles.reminderRow}>
            <Pressable
              style={styles.reminderTimeBlock}
              onPress={() => setPickerMode({ type: 'edit', id: reminder.id })}
            >
              <Text style={[styles.reminderTime, !reminder.enabled && styles.reminderTimeDisabled]}>
                {padTwo(reminder.hour)}:{padTwo(reminder.minute)}
              </Text>
            </Pressable>
            <Switch
              value={reminder.enabled}
              onValueChange={(v) => { toggleReminder(reminder.id, v); }}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
              style={styles.reminderSwitch}
            />
            <TouchableOpacity
              onPress={() => removeReminder(reminder.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {reminders.length < MAX_REMINDERS && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setPickerMode({ type: 'add' })}
          >
            <Text style={styles.addBtnText}>＋ Добавить напоминание</Text>
          </TouchableOpacity>
        )}
      </View>

      {pickerMode !== null && (
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  reminderTimeBlock: { flex: 1 },
  reminderTime: {
    fontSize: 26,
    fontWeight: '700',
    color: '#007AFF',
  },
  reminderTimeDisabled: { color: '#C7C7CC' },
  reminderSwitch: { marginRight: 12 },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  addBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: only the known pre-existing `history.tsx` error. No errors in `stats.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/stats.tsx"
git commit -m "feat: replace single reminder with multi-reminder list UI"
```

---

## Self-Review

**Spec coverage:**
- [x] List of reminders with time / toggle / × — Task 3
- [x] Tapping time opens DateTimePicker → `setReminderTime` — Task 3
- [x] "+ Добавить напоминание" button → `addReminder` — Task 3
- [x] Button hidden at 5 reminders — Task 3 (`MAX_REMINDERS = 5`)
- [x] Permission request on add — Task 2 (`addReminder` calls `requestPermissions`)
- [x] `scheduleWithId` / `cancelById` — Task 1
- [x] New persistence key `notification-reminders` — Task 2
- [x] `finally` on `cancelById` calls — Task 2 (`removeReminder`, `toggleReminder`)
- [x] `setReminderTime` skips reschedule when disabled — Task 2

**Type consistency:**
- `Reminder` exported from `notificationStore.ts`, imported in `stats.tsx` ✓
- `pickerMode: { type: 'add' } | { type: 'edit'; id: string } | null` — all branches handled ✓
- `scheduleWithId(id, hour, minute)` signature matches usage in store ✓

**No placeholders:** all code blocks complete. ✓
