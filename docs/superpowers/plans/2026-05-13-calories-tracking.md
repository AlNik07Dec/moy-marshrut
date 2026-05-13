# Calories Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time calorie tracking (distance × mode coefficient) to walks, store in SQLite, and display on walk screen and weekly stats.

**Architecture:** Calories are derived from GPS distance and walk mode in `walkStore`. They update every time a GPS coordinate arrives (~3 s). On walk finish, calories are persisted to SQLite. The stats screen reads totals from `historyStore.weekStats()`.

**Tech Stack:** Expo 54, React Native, Zustand, expo-sqlite. No new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `src/db/database.ts` | Add `calories` column, migration, update type + insert |
| `src/stores/walkStore.ts` | Add `calories` field, compute on each coordinate |
| `app/walk.tsx` | Refactor stats to 2×2 grid, add ккал card |
| `src/stores/historyStore.ts` | Add `totalCalories` to `WeekStats` |
| `app/(tabs)/stats.tsx` | Add 4th ккал card to summary row |

---

## Task 1: Add `calories` column to the database

**Files:**
- Modify: `src/db/database.ts`

- [ ] **Step 1: Add `calories` to the `WalkSession` interface**

In `src/db/database.ts`, update the interface:

```typescript
export interface WalkSession {
  id: number;
  date: number;
  startTime: number | null;
  mode: string;
  distanceMeters: number;
  durationSeconds: number;
  stepCount: number;
  calories: number;           // ← add this line
  routeCoordinates: string;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
}
```

- [ ] **Step 2: Add `calories` to CREATE TABLE**

Update the `CREATE TABLE IF NOT EXISTS walk_sessions` block to include the new column (add after `stepCount`):

```sql
CREATE TABLE IF NOT EXISTS walk_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date INTEGER NOT NULL,
  mode TEXT NOT NULL,
  distanceMeters REAL NOT NULL DEFAULT 0,
  durationSeconds INTEGER NOT NULL DEFAULT 0,
  stepCount INTEGER NOT NULL DEFAULT 0,
  calories REAL NOT NULL DEFAULT 0,
  routeCoordinates TEXT NOT NULL DEFAULT '[]',
  startLat REAL,
  startLng REAL,
  endLat REAL,
  endLng REAL
);
```

- [ ] **Step 3: Add migration for existing databases**

After the existing `startTime` migration block, add:

```typescript
try {
  await db.execAsync(`ALTER TABLE walk_sessions ADD COLUMN calories REAL NOT NULL DEFAULT 0;`);
} catch {
  // Column already exists — safe to ignore
}
```

- [ ] **Step 4: Update `insertSession`**

Replace the function with:

```typescript
export async function insertSession(
  session: Omit<WalkSession, 'id'>
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO walk_sessions
      (date, startTime, mode, distanceMeters, durationSeconds, stepCount, calories, routeCoordinates, startLat, startLng, endLat, endLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.date,
      session.startTime ?? null,
      session.mode,
      session.distanceMeters,
      session.durationSeconds,
      session.stepCount,
      session.calories,
      session.routeCoordinates,
      session.startLat,
      session.startLng,
      session.endLat,
      session.endLng,
    ]
  );
  return result.lastInsertRowId;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/db/database.ts
git commit -m "feat(db): add calories column to walk_sessions"
```

---

## Task 2: Add calories state and calculation to walkStore

**Files:**
- Modify: `src/stores/walkStore.ts`

- [ ] **Step 1: Add calories coefficient map and state field**

At the top of the file, before `useWalkStore`, add the constant:

```typescript
const KCAL_PER_KM: Record<WalkMode, number> = { fast: 80, slow: 60, parkGame: 70 };
```

In the `WalkState` interface, add `calories` after `stepCount`:

```typescript
calories: number;
```

- [ ] **Step 2: Initialize calories in the store**

In the initial state (the object passed to `create`), add `calories: 0` after `stepCount: 0`:

```typescript
calories: 0,
```

- [ ] **Step 3: Reset calories in `startWalk` and `reset`**

In `startWalk`, add `calories: 0` to the set object (after `stepCount: 0`):

```typescript
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
```

In `reset`, add `calories: 0` to the set object:

```typescript
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
```

- [ ] **Step 4: Compute calories in `addCoordinate`**

Update `addCoordinate` to read `selectedMode` from state and compute calories with the new distance:

```typescript
addCoordinate: (coord) => {
  const { routeCoordinates, distanceMeters, elapsedSeconds, selectedMode } = get();
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

  const newDistance = distanceMeters + delta;

  set((state) => ({
    routeCoordinates: [...state.routeCoordinates, coord],
    startCoordinate: state.startCoordinate ?? coord,
    distanceMeters: newDistance,
    speedKmh: newSpeed > 0 ? newSpeed : state.speedKmh,
    calories: (newDistance / 1000) * KCAL_PER_KM[selectedMode],
  }));
},
```

- [ ] **Step 5: Include calories in `finishWalk`**

Update the destructuring in `finishWalk` to include `calories`, and pass it to `insertSession`:

```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/walkStore.ts
git commit -m "feat(store): add real-time calories calculation to walkStore"
```

---

## Task 3: Update walk screen to 2×2 grid with calories card

**Files:**
- Modify: `app/walk.tsx`

- [ ] **Step 1: Add `calories` to the store destructuring**

In `WalkScreen`, update the `useWalkStore()` destructuring to include `calories`:

```typescript
const {
  routeCoordinates,
  startCoordinate,
  elapsedSeconds,
  distanceMeters,
  stepCount,
  calories,
  selectedMode,
  finishWalk,
} = useWalkStore();
```

- [ ] **Step 2: Replace stats row with 2×2 grid**

Replace the existing `{/* Stats row */}` block:

```tsx
{/* Stats grid 2×2 */}
<View style={styles.statsGrid}>
  <View style={styles.statsRow}>
    <StatCard value={String(stepCount)} unit="шаги" valueColor="#34C759" />
    <StatCard value={formatTime(elapsedSeconds)} unit="время" />
  </View>
  <View style={styles.statsRow}>
    <StatCard value={(distanceMeters / 1000).toFixed(2)} unit="км" valueColor="#007AFF" />
    <StatCard value={String(Math.round(calories))} unit="ккал" valueColor="#FF9500" />
  </View>
</View>
```

- [ ] **Step 3: Update styles**

Replace the `statsRow` style with `statsGrid` and a new `statsRow`:

```typescript
statsGrid: {
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 8,
  gap: 8,
  backgroundColor: '#fff',
},
statsRow: {
  flexDirection: 'row',
  gap: 10,
},
```

- [ ] **Step 4: Verify visually**

Run `npx expo start` and open on iOS device or simulator. Start a walk and confirm:
- Four cards appear in a 2×2 grid
- Шаги (green), Время (grey), Км (blue), Ккал (orange)
- Ккал value updates as you walk (starts at 0, increases with distance)

- [ ] **Step 5: Commit**

```bash
git add app/walk.tsx
git commit -m "feat(ui): 2x2 stats grid with real-time calories on walk screen"
```

---

## Task 4: Add `totalCalories` to historyStore weekStats

**Files:**
- Modify: `src/stores/historyStore.ts`

- [ ] **Step 1: Add `totalCalories` to `WeekStats` interface**

```typescript
export interface WeekStats {
  totalKm: number;
  totalWalks: number;
  totalSeconds: number;
  totalCalories: number;        // ← add this line
  byMode: { fast: number; slow: number; parkGame: number };
  dailyKm: number[];
  dayLabels: string[];
}
```

- [ ] **Step 2: Accumulate calories in `weekStats()`**

In the `weekStats` function, add `let totalCalories = 0;` next to the other accumulators, and sum inside the loop:

```typescript
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
  let totalCalories = 0;
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
},
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/historyStore.ts
git commit -m "feat(store): add totalCalories to weekStats"
```

---

## Task 5: Show totalCalories on stats screen

**Files:**
- Modify: `app/(tabs)/stats.tsx`

- [ ] **Step 1: Add `kcal` string to the `S` constant**

In the `S` object at the top of the file, add:

```typescript
kcal: 'ккал',
```

- [ ] **Step 2: Add 4th summary card**

In the `summaryRow` View, add the calories card after the time card:

```tsx
<View style={styles.summaryCard}>
  <Text style={styles.summaryValue}>{stats.totalCalories}</Text>
  <Text style={styles.summaryLabel}>{S.kcal}</Text>
</View>
```

The full `summaryRow` becomes:

```tsx
<View style={styles.summaryRow}>
  <View style={styles.summaryCard}>
    <Text style={styles.summaryValue}>{stats.totalKm.toFixed(1)}</Text>
    <Text style={styles.summaryLabel}>{S.km}</Text>
  </View>
  <View style={styles.summaryCard}>
    <Text style={styles.summaryValue}>{stats.totalWalks}</Text>
    <Text style={styles.summaryLabel}>{S.walks}</Text>
  </View>
  <View style={styles.summaryCard}>
    <Text style={styles.summaryValue}>{formatHours(stats.totalSeconds)}</Text>
    <Text style={styles.summaryLabel}>{S.timeNoun}</Text>
  </View>
  <View style={styles.summaryCard}>
    <Text style={styles.summaryValue}>{stats.totalCalories}</Text>
    <Text style={styles.summaryLabel}>{S.kcal}</Text>
  </View>
</View>
```

- [ ] **Step 3: Verify visually**

Open the Статистика tab. Confirm:
- Four cards appear in the summary row: км / прогулки / время / ккал
- All cards are equal width
- After completing a walk, ккал reflects the calories of that session

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/stats.tsx
git commit -m "feat(stats): add weekly calories card to summary row"
```
