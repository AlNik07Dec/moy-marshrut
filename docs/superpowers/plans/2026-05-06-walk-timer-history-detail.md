# Walk Timer + Session Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix timer format to HH:MM:SS, persist walk start time, add tappable session detail screen with route map.

**Architecture:** Shared `formatTime` util; SQLite migration adds `startTime`; new Expo Router stack route `app/session/[id].tsx`; history rows become Pressable navigating to detail.

**Tech Stack:** React Native, Expo Router, expo-sqlite, react-native-maps, Zustand

---

### Task 1: Shared formatTime utility

**Files:**
- Create: `src/utils/formatTime.ts`

- [ ] **Step 1: Create file**

```ts
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
```

- [ ] **Step 2: Commit**
```bash
git add src/utils/formatTime.ts
git commit -m "feat: add shared formatTime HH:MM:SS utility"
```

---

### Task 2: Add startTime to database

**Files:**
- Modify: `src/db/database.ts`

- [ ] **Step 1: Update WalkSession interface** — add `startTime: number | null`

- [ ] **Step 2: Add migration** — in `getDatabase()`, after the stepCount migration try/catch block, add another try/catch for `startTime`

- [ ] **Step 3: Update insertSession** — accept and store `startTime`

- [ ] **Step 4: Add fetchSessionById** — new exported function

- [ ] **Step 5: Commit**
```bash
git add src/db/database.ts
git commit -m "feat: add startTime column and fetchSessionById to database"
```

---

### Task 3: Update walkStore to track startTime

**Files:**
- Modify: `src/stores/walkStore.ts`

- [ ] **Step 1: Add startTime to WalkState** — `startTime: number | null`

- [ ] **Step 2: startWalk() sets startTime: Date.now()**

- [ ] **Step 3: finishWalk() passes startTime to insertSession**

- [ ] **Step 4: reset() clears startTime: null**

- [ ] **Step 5: Commit**
```bash
git add src/stores/walkStore.ts
git commit -m "feat: track walk startTime in store"
```

---

### Task 4: Fix walk screen timer format

**Files:**
- Modify: `app/walk.tsx`

- [ ] **Step 1: Replace local formatTime with import from utils**

- [ ] **Step 2: Commit**
```bash
git add app/walk.tsx
git commit -m "fix: use shared HH:MM:SS formatTime in walk screen"
```

---

### Task 5: Register session detail route

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add Stack.Screen for session/[id]**

- [ ] **Step 2: Commit**
```bash
git add app/_layout.tsx
git commit -m "feat: register session/[id] stack route"
```

---

### Task 6: Create session detail screen

**Files:**
- Create: `app/session/[id].tsx`

- [ ] **Step 1: Implement full screen** — MapView + stats

- [ ] **Step 2: Commit**
```bash
git add app/session/[id].tsx
git commit -m "feat: add session detail screen with route map"
```

---

### Task 7: Make history rows tappable

**Files:**
- Modify: `app/(tabs)/history.tsx`

- [ ] **Step 1: Import router, wrap SessionRow in Pressable, add chevron**

- [ ] **Step 2: Commit**
```bash
git add app/(tabs)/history.tsx
git commit -m "feat: make history rows tappable, navigate to session detail"
```
