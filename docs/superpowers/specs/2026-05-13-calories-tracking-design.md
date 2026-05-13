# Calories Tracking Design

**Date:** 2026-05-13
**Status:** Approved

## Goal

Add real-time calorie tracking during walks using data already available in the project (GPS distance + walk mode). Display calories on the walk screen and in weekly stats. No new dependencies required.

## Data Sources

| Metric   | Source                          | Status       |
|----------|---------------------------------|--------------|
| Steps    | `expo-sensors` Pedometer        | Already works |
| Distance | GPS haversine in `walkStore`    | Already works |
| Calories | distanceKm × mode coefficient   | To be added   |

## Calories Formula

Calories are derived from GPS distance and walk mode (no user weight/height required):

- `slow` (Прогулка): `distanceKm × 60` kcal
- `fast` (Пробежка): `distanceKm × 80` kcal
- `parkGame` (Игра в парке): `distanceKm × 70` kcal

Recalculated on every `addCoordinate` call — effectively real-time (every 3 s or every 5 m via GPS).

## Changes

### 1. `src/stores/walkStore.ts`

- Add `calories: number` field (initial value `0`).
- Compute calories inside `addCoordinate` after updating `distanceMeters`:
  ```
  const KJ_PER_KM = { fast: 80, slow: 60, parkGame: 70 };
  calories = (distanceMeters / 1000) * KJ_PER_KM[selectedMode];
  ```
- Reset calories to `0` in `startWalk` and `reset`.
- Include calories in `finishWalk` payload passed to `insertSession`.

### 2. `src/db/database.ts`

- Add `calories REAL NOT NULL DEFAULT 0` to `CREATE TABLE` statement.
- Add `ALTER TABLE walk_sessions ADD COLUMN calories REAL NOT NULL DEFAULT 0` migration block (with try/catch, same pattern as existing migrations).
- Add `calories` to `WalkSession` interface.
- Add `calories` to `insertSession` parameters and SQL query.

### 3. `app/walk.tsx`

Change stats layout from a single row of 3 cards to a 2×2 grid:

```
[ шаги 🟢 ]  [ время ⚪ ]
[ км 🔵   ]  [ ккал 🟠 ]
```

- Replace `statsRow` (flexDirection: row) with a 2×2 `flexWrap: wrap` grid.
- Each card takes ~50% width minus gap.
- Add 4th `StatCard` showing `Math.round(calories)` with unit `ккал` and `valueColor="#FF9500"`.

### 4. `src/stores/historyStore.ts`

- Add `totalCalories: number` to `WeekStats` interface.
- Sum `session.calories` across `thisWeek` sessions in `weekStats()`.

### 5. `app/(tabs)/stats.tsx`

- Add 4th summary card to `summaryRow`:
  - Value: `stats.totalCalories` (rounded integer)
  - Label: `ккал` (Unicode: `ккал`)

## Constraints

- No new npm packages.
- Works in standard Expo Go — no EAS Dev Client needed.
- Calories are approximate (no user profile). This is acceptable for a personal pet-walk tracker.
- The `calories` column is added via migration so existing DB data is preserved (old rows get `0`).
