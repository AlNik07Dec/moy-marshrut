# Multiple Walk Reminders — Design Spec

**Date:** 2026-05-06  
**Project:** Walk&Paw (Expo / React Native)  
**Status:** Approved

---

## Overview

Replace the single walk-reminder setting on the Stats screen with a list of independent reminders. Each reminder has its own time, toggle, and delete button. A "+" button adds a new reminder via DateTimePicker.

---

## Modified Files

| File | Change |
|------|--------|
| `src/stores/notificationStore.ts` | Replace single-reminder state with `Reminder[]` list; new actions |
| `src/services/notificationService.ts` | Add `scheduleWithId` and `cancelById`; keep `requestPermissions` and `cancelAll` |
| `app/(tabs)/stats.tsx` | Replace single-reminder row with list UI |

---

## Data Model

### `Reminder` type

```ts
type Reminder = {
  id: string;       // stable local ID, also used as expo-notifications identifier
  hour: number;
  minute: number;
  enabled: boolean;
}
```

### `notificationStore.ts`

```ts
interface NotificationState {
  reminders: Reminder[];
  addReminder: (hour: number, minute: number) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
  setReminderTime: (id: string, hour: number, minute: number) => Promise<void>;
}
```

- Persisted via Zustand `persist` + AsyncStorage, key `notification-reminders` (new key — old `notification-settings` data is discarded)
- `addReminder`: requests permissions (if not granted, returns without adding); generates `id = Date.now().toString()`; schedules notification; appends to list
- `removeReminder`: cancels notification by id; removes from list
- `toggleReminder(id, true)`: schedules notification; sets `enabled: true`
- `toggleReminder(id, false)`: cancels notification; sets `enabled: false`
- `setReminderTime`: updates hour/minute; if enabled, reschedules (same id)

### `notificationService.ts` additions

```ts
scheduleWithId(id: string, hour: number, minute: number): Promise<void>
cancelById(id: string): Promise<void>
```

- `scheduleWithId` calls `scheduleNotificationAsync({ identifier: id, content: { title: 'Walk&Paw 🐾', body: 'Время для прогулки!', sound: true }, trigger: { type: DAILY, hour, minute } })`
- `cancelById` calls `cancelScheduledNotificationAsync(id)`
- Keep existing `requestPermissions()` and `cancelAll()` unchanged

---

## Screen UI — Stats screen Напоминания section

```
Section "Напоминания"
├── [for each reminder in reminders]
│   └── Row
│       ├── Time label (HH:MM, bold blue, tappable → DateTimePicker to edit)
│       ├── Switch (enabled/toggleReminder)
│       └── × button (removeReminder)
├── [if reminders.length < 5]
│   └── "＋ Добавить напоминание" button
└── DateTimePicker (shown on add OR on time tap)
```

- Tapping time of an existing reminder opens DateTimePicker pre-filled with that reminder's time; on confirm → `setReminderTime`
- Tapping "+ Добавить напоминание" opens DateTimePicker with default 18:00; on confirm → `addReminder`
- "+ Добавить напоминание" button hidden when `reminders.length >= 5`
- Empty state (no reminders): shows only the add button

---

## Edge Cases

- **Permission denied on add:** show alert, do not add reminder
- **Max 5 reminders:** hide add button when limit reached
- **Duplicate times:** allowed (two notifications at the same time is valid)
- **App restart:** reminders restored from AsyncStorage; OS retains scheduled notifications by identifier; no rescheduling needed
- **setReminderTime on disabled reminder:** updates time in store only, does not reschedule

---

## Migration

Old `notification-settings` key in AsyncStorage is simply ignored. The new `notification-reminders` key starts empty — user builds their list fresh.

---

## Out of Scope

- Per-reminder labels/names
- Days-of-week selection per reminder
- Snooze functionality
