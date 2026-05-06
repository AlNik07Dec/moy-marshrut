# Walk Timer Format + Session Detail Screen — Design Spec

**Date:** 2026-05-06  
**Project:** Walk&Paw (Expo / React Native)  
**Status:** Approved by user

---

## Overview

Three coordinated changes:
1. Fix walk timer display format to always show `HH:MM:SS`.
2. Persist explicit walk start time to SQLite.
3. Add a session detail screen reachable from the History tab.

---

## 1. Timer Format Fix

**File:** `app/walk.tsx` — `formatTime(seconds: number): string`

**Current behavior:**
- Under 1 hour → `MM:SS` (e.g. `05:30`)
- 1 hour or more → `H:MM:SS` (e.g. `1:05:30`)

**New behavior:** always three zero-padded components:
- `HH:MM:SS` (e.g. `00:05:30`, `01:05:30`)

```ts
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
```

This same helper is needed in the detail screen — extract to `src/utils/formatTime.ts`.

---

## 2. Start Time Persistence

### 2a. Database (`src/db/database.ts`)

Add `startTime INTEGER` column to `walk_sessions`:

```sql
ALTER TABLE walk_sessions ADD COLUMN startTime INTEGER;
```

Applied as a migration (in the existing try/catch migration pattern).

Update `WalkSession` interface:
```ts
startTime: number | null; // Unix ms, time walk began
```

Update `insertSession` to accept and store `startTime`.

Add `fetchSessionById(id: number): Promise<WalkSession | null>` for the detail screen.

### 2b. Walk Store (`src/stores/walkStore.ts`)

Add to `WalkState`:
```ts
startTime: number | null;
```

`startWalk()` sets `startTime: Date.now()`.  
`finishWalk()` passes `startTime` from state to `insertSession`.  
`reset()` clears `startTime: null`.

**Note:** `date` (the existing field) continues to record the end timestamp and is used for sorting. `startTime` is a new field for display.

---

## 3. Session Detail Screen

### 3a. New route: `app/session/[id].tsx`

Navigation: `router.push('/session/' + session.id)` from `history.tsx`.  
Transition: standard Stack card (not modal).

**Layout (top → bottom, wrapped in `ScrollView`):**

```
┌─────────────────────────────┐
│        MapView (280px)       │  ← polyline + HomeMarker, non-interactive (scrollEnabled=false)
├─────────────────────────────┤
│  🚶 Прогулка   Вт, 6 мая   │  ← mode icon + label, formatted date
├─────────────────────────────┤
│  Начало 14:30:05             │
│  Конец  14:45:35             │
├─────────────────────────────┤
│  [00:15:30]  [2.34 км]  [3 421 шаги]  │  ← three StatCards
└─────────────────────────────┘
```

- If `routeCoordinates` is empty: MapView centers on `startLat/startLng` with no polyline.
- If `startTime` is null (old sessions before migration): display "—" in start/end fields.
- Steps card hidden when `stepCount === 0`.
- End time = `startTime + durationSeconds * 1000`.

**Data loading:** `useEffect` fetches `fetchSessionById(id)` on mount; show `ActivityIndicator` while loading; show "Прогулка не найдена" on null result.

### 3b. Navigation registration (`app/_layout.tsx`)

Add to root Stack:
```tsx
<Stack.Screen
  name="session/[id]"
  options={{ title: 'Прогулка', headerBackTitle: 'История' }}
/>
```

### 3c. History screen (`app/(tabs)/history.tsx`)

`SessionRow` wraps its content in `Pressable`:
```tsx
<Pressable onPress={() => router.push('/session/' + session.id)}>
  ...existing content...
</Pressable>
```

Add chevron icon (`›`) on the right of each row to signal tappability.

---

## 4. Shared Utility

Extract `formatTime` to `src/utils/formatTime.ts` — used by `walk.tsx` and `app/session/[id].tsx`.

---

## Files Changed / Created

| File | Change |
|------|--------|
| `src/utils/formatTime.ts` | **New** — shared `formatTime(seconds)` → `HH:MM:SS` |
| `src/db/database.ts` | Add `startTime` field, migration, `fetchSessionById` |
| `src/stores/walkStore.ts` | Add `startTime` to state, `startWalk`, `finishWalk`, `reset` |
| `app/walk.tsx` | Import `formatTime` from utils (remove local copy) |
| `app/_layout.tsx` | Register `session/[id]` Stack route |
| `app/(tabs)/history.tsx` | Make `SessionRow` tappable, add chevron |
| `app/session/[id].tsx` | **New** — session detail screen |

---

## Out of Scope

- Delete session functionality (can be added later)
- Edit session (not needed)
- Export / share walk (separate feature)
- Background location tracking (separate feature)
- `parkGame` mode walk initiation (already blocked in the UI, keep as-is)
