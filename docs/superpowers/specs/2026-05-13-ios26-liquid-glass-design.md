# iOS 26 Liquid Glass — Visual Redesign Spec

**Date:** 2026-05-13  
**Project:** Walk&Paw / Мой маршрут  
**Status:** Approved

---

## Context

The app currently uses a light iOS-inspired aesthetic with inline styles scattered across all files (no central theme). The goal is to redesign all 4 screens into the iOS 26 "Liquid Glass" style: dark tinted backgrounds, glass-morphism panels, semi-transparent blurred surfaces, and a cohesive blue-tinted color palette. No structural UI changes — only visual treatment.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Color direction | Dark tinted glass (Option C) | Dark navy + blue glass accents |
| Animations | Visual only — no motion | Simpler, stable on Android |
| Blur implementation | `expo-blur` (BlurView) | Native iOS quality, 1-command install |
| Architecture | Centralized `src/theme.ts` | Colors currently hardcoded everywhere |
| Scope | All 4 screens | Full consistency |

---

## Design Tokens (`src/theme.ts`)

```ts
// Backgrounds
bg:           '#0a0a14'         // main screen background
bgDeep:       '#060a12'         // deeper dark areas

// Glass surfaces (use with BlurView from expo-blur)
glass:        'rgba(79,142,247,0.10)'   // cards, panels
glassDark:    'rgba(8,16,32,0.65)'      // tab bar, header overlay
glassBorder:  'rgba(79,142,247,0.20)'   // borders on glass elements

// Accent colors
accent:       '#4f8ef7'   // primary blue — selected states, links
green:        '#34C759'   // start button, distance, steps
red:          '#FF3B30'   // stop button, delete action
orange:       '#FF9500'   // calories, edit action

// Chart colors (unchanged)
chartFast:    '#e94560'
chartSlow:    '#4f8ef7'
chartPark:    '#4CAF50'

// Text
textPrimary:  '#FFFFFF'
textSecondary:'rgba(255,255,255,0.45)'
textMuted:    'rgba(255,255,255,0.25)'

// Shape
radius:       { sm: 12, md: 14, lg: 18, xl: 22, pill: 50 }
```

---

## New Components

### `src/components/GlassCard.tsx`
A reusable card wrapper. Renders a `BlurView` (tint='dark', intensity=80) with a semi-transparent overlay View using `glassDark` color + `glassBorder` border.

```
Props: children, style?, padding?
BlurView props: tint="dark", intensity={80}
Overlay: backgroundColor=theme.glassDark, borderColor=theme.glassBorder, borderWidth=1
Usage: replaces all white/gray card backgrounds
```

### `src/components/GlassTabBar.tsx`  
Custom tab bar replacing the default Expo Router tab bar. Renders a `BlurView` with `glassDark` tint, floating slightly above content. Indicator dot above active tab icon.

```
Wired via: tabBar prop in app/(tabs)/_layout.tsx
```

---

## Screen Changes

### `app/(tabs)/index.tsx` — Home
- Background: gradient `#0a0e1a → #0d1a2e → #060a12`
- Map fills full height behind everything
- Header: `GlassCard` (blur) with title "Walk&Paw" + green GPS dot
- Bottom panel: `GlassCard` (blur) containing mode buttons + start button
- Mode buttons: `glass` background + `glassBorder`; active state adds glow shadow
- Start button: green gradient + glow shadow + inner highlight border

### `app/walk.tsx` — Active Walk
- Background: same dark gradient
- Stats 2×2 grid (top): `GlassCard` container wrapping 4 `StatCard` cells
  - Steps → `#34C759`, Duration → white, Distance → `#4f8ef7`, Calories → `#FF9500`
- Map: full-height, route polyline stays `#4f8ef7`
- Stop button: red gradient + glow, same structure as start button

### `app/(tabs)/history.tsx` — History
- Background: dark gradient
- Filter toggle (Неделя / Месяц): glass pills, active = `accent` tint + border
- Bar chart: bars use `accent` gradient, background `GlassCard`
- Session rows: `GlassCard` per row; distance in `green`, steps in `accent`
- Date section labels: `textSecondary`, uppercase, small tracking

### `app/(tabs)/stats.tsx` — Statistics
- Background: dark gradient
- Summary row (4 cards): `GlassCard` each; km=`accent`, walks=`green`, kcal=`orange`
- Charts wrapped in `GlassCard` with section label
- Chart colors: `backgroundColor='transparent'`, `backgroundGradientFrom='#0a0a14'`, `backgroundGradientTo='#0d1a2e'`, `color` fn returns `accent` with opacity
- Reminders section: `GlassCard` rows, time display white, toggle tinted

### `app/session/[id].tsx` — Session Detail
- Background: dark gradient
- Map container: keep existing height, route polyline stays `#4f8ef7`
- Times card: `GlassCard` instead of white box
- Stat cards at bottom: use updated `StatCard` (glass background)

### `src/components/StatCard.tsx` — Updated
- Background: `glass` instead of `#F2F2F7`
- Border: `glassBorder`
- Remove all hardcoded light colors

### `src/components/ModeButton.tsx` — Updated
- Background: `glass`; selected: `rgba(79,142,247,0.20)` + `glassBorder` + box-shadow glow

---

## New Dependency

```bash
npx expo install expo-blur
```

`BlurView` from `expo-blur` — wraps panels/headers/tab bar.  
Android fallback: `expo-blur` on Android 12+ renders native blur; older → semi-transparent overlay (acceptable).

---

## Files to Create
- `src/theme.ts`
- `src/components/GlassCard.tsx`
- `src/components/GlassTabBar.tsx`

## Files to Modify
- `app/(tabs)/_layout.tsx` — wire `GlassTabBar`
- `app/(tabs)/index.tsx`
- `app/(tabs)/stats.tsx`
- `app/(tabs)/history.tsx`
- `app/walk.tsx`
- `app/session/[id].tsx`
- `src/components/StatCard.tsx`
- `src/components/ModeButton.tsx`

---

## Verification

1. `npx expo start` — open on iOS simulator
2. Home screen: map visible through glass bottom panel; tab bar has blur over map
3. Walk screen: 2×2 stats grid with correct accent colors on glass cards
4. History: dark rows with glass effect, session data colors correct
5. Stats: charts visible, summary row cards styled correctly
6. No white/gray backgrounds remain (`#F2F2F7`, `#fff`, `#E5E5EA` should be gone)
7. Open on Android: blur may be flat but layout should be intact
