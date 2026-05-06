# Stats Screen & Walk Reminder Notifications — Design Spec

**Date:** 2026-05-06  
**Project:** Walk&Paw (Expo / React Native)  
**Status:** Approved

---

## Overview

Add a third tab **«Статистика»** to the bottom tab bar. The screen shows:

1. Summary row — total km / walks / time for the current calendar week
2. Pie chart — walk count by mode (fast / slow / parkGame)
3. Line chart — daily distance (km) for the current calendar week (Mon–Sun)
4. Notification settings — daily walk reminder toggle + editable time (default 18:00)

---

## New Files

| File | Purpose |
|------|---------|
| `app/(tabs)/stats.tsx` | Statistics screen (ScrollView, all sections) |
| `src/stores/notificationStore.ts` | Zustand store — notification enabled flag + time |
| `src/services/notificationService.ts` | expo-notifications wrapper (permissions, schedule, cancel) |

## Modified Files

| File | Change |
|------|--------|
| `app/(tabs)/_layout.tsx` | Add third tab: route `stats`, title «Статистика», icon `bar-chart` |
| `src/stores/historyStore.ts` | Add `weekStats()` selector |

## New Dependency

```
expo-notifications
```

Already installed and used: `react-native-chart-kit`, `react-native-svg`, `@react-native-community/datetimepicker`.

---

## Data Layer

### `historyStore.ts` — `weekStats()` selector

Computed from sessions whose `date` falls within the **current calendar week** (Monday 00:00 – Sunday 23:59, local time).

Returns:

```ts
type WeekStats = {
  totalKm: number
  totalWalks: number
  totalSeconds: number
  byMode: { fast: number; slow: number; parkGame: number }
  dailyKm: number[]   // 7 elements, index 0 = Monday of current week
  dayLabels: string[] // ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]
}
```

- `dailyKm[i]` sums `distanceMeters / 1000` for all sessions on day `i` of the current week.
- Days in the future default to `0`.

### `notificationStore.ts`

```ts
type NotificationState = {
  enabled: boolean
  hour: number    // default 18
  minute: number  // default 0
  setEnabled: (v: boolean) => Promise<void>
  setTime: (hour: number, minute: number) => Promise<void>
}
```

- Persisted via Zustand `persist` middleware + `AsyncStorage`.
- `setEnabled(true)`: calls `requestPermissions()`, if granted calls `scheduleDaily(hour, minute)`, otherwise keeps `enabled = false` and shows alert.
- `setEnabled(false)`: calls `cancelAll()`.
- `setTime(h, m)`: updates state; if `enabled`, calls `scheduleDaily(h, m)` (which cancels the old trigger first).

### `notificationService.ts`

```ts
requestPermissions(): Promise<boolean>
scheduleDaily(hour: number, minute: number): Promise<void>
cancelAll(): Promise<void>
```

- `scheduleDaily` cancels all existing scheduled notifications before creating a new daily trigger.
- Daily trigger: `{ hour, minute, repeats: true }` — fires every day at the specified time.
- Notification content: title «Walk&Paw 🐾», body «Время для прогулки!».
- Scheduled notifications persist in the OS; no need to reschedule on app restart.

---

## Screen Layout — `stats.tsx`

```
ScrollView
├── SummaryRow
│   ├── StatCard "X.X км"
│   ├── StatCard "N прогулок"
│   └── StatCard "H:MM ч"
├── Section "По режимам"
│   └── PieChart (react-native-chart-kit)
│       data: byMode → [{name, population, color, legendFontColor}]
│       fallback: Text "Нет прогулок за эту неделю"
├── Section "Дистанция за неделю"
│   └── LineChart (react-native-chart-kit)
│       labels: dayLabels, datasets: dailyKm
│       hidden when all values are 0
└── Section "Напоминания"
    └── Row
        ├── Label "Напоминать о прогулке"
        ├── Sub-label time string "HH:MM"  ← tappable, opens DateTimePicker
        └── Switch (enabled/setEnabled)
            DateTimePicker (shown on time press, mode="time", default 18:00)
```

### Pie Chart colours

| Mode | Label | Colour |
|------|-------|--------|
| fast | Быстрая | `#e94560` |
| slow | Медленная | `#4f8ef7` |
| parkGame | Игра в парке | `#4CAF50` |

---

## Edge Cases

- **No walks this week** — PieChart replaced by centred text «Нет данных за эту неделю»; LineChart hidden; summary shows `0 км / 0 прогулок / 0:00 ч`.
- **Single mode** — PieChart renders normally with one segment.
- **Permission denied** — `setEnabled` resolves to `false`, `Alert.alert` informs user to allow notifications in device settings.
- **Expo Go** — `expo-notifications` local notifications work in Expo Go on device; scheduling may be limited in iOS Simulator.
- **App restart** — OS retains scheduled notifications; `notificationStore` restores state from `AsyncStorage`; no rescheduling needed.

---

## Navigation

- Route file: `app/(tabs)/stats.tsx`
- Tab icon: `bar-chart` (Ionicons)
- Tab label: `Статистика`
- Position: third tab, after «История»

---

## Out of Scope

- Push (remote) notifications
- Multiple reminders per day
- Notification history / log
- Statistics beyond current calendar week on this screen (history tab already covers longer ranges)
