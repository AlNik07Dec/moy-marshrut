# iOS 26 Liquid Glass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 4 screens of Walk&Paw into iOS 26 Liquid Glass style — dark tinted backgrounds, glass-morphism panels via expo-blur, centralized theme.

**Architecture:** Create `src/theme.ts` as single source of design tokens. Add two reusable components: `GlassCard` (BlurView wrapper for large panels) and `GlassTabBar` (custom floating tab bar with blur). StatCard/ModeButton get rgba-glass styling without BlurView (performance). All 5 screens updated screen-by-screen.

**Tech Stack:** React Native 0.81.5, Expo 54, expo-blur (new), expo-router, react-native-safe-area-context, @expo/vector-icons (Ionicons)

---

## File Map

| Action | File | Role |
|---|---|---|
| Create | `src/theme.ts` | All design tokens |
| Create | `src/components/GlassCard.tsx` | BlurView wrapper for large panels |
| Create | `src/components/GlassTabBar.tsx` | Custom tab bar with blur |
| Modify | `app/(tabs)/_layout.tsx` | Wire GlassTabBar, dark header |
| Modify | `src/components/StatCard.tsx` | Glass rgba background |
| Modify | `src/components/ModeButton.tsx` | Glass rgba background |
| Modify | `app/(tabs)/index.tsx` | Dark bg, map full-screen, glass bottom panel |
| Modify | `app/walk.tsx` | Dark bg, glass stats grid |
| Modify | `app/(tabs)/history.tsx` | Dark bg, glass chart + rows, dark chart colors |
| Modify | `app/(tabs)/stats.tsx` | Dark bg, glass sections, dark chart colors |
| Modify | `app/session/[id].tsx` | Dark bg, glass times card |

---

## Task 1: Install expo-blur and create src/theme.ts

**Files:**
- Run: `npx expo install expo-blur`
- Create: `src/theme.ts`

- [ ] **Step 1: Install expo-blur**

```bash
npx expo install expo-blur
```

Expected output: package added to package.json and installed in node_modules.

- [ ] **Step 2: Create src/theme.ts**

```ts
export const theme = {
  colors: {
    bg:           '#0a0a14',
    bgDeep:       '#060a12',
    glass:        'rgba(79,142,247,0.10)',
    glassDark:    'rgba(8,16,32,0.65)',
    glassBorder:  'rgba(79,142,247,0.20)',
    accent:       '#4f8ef7',
    green:        '#34C759',
    red:          '#FF3B30',
    orange:       '#FF9500',
    chartFast:    '#e94560',
    chartSlow:    '#4f8ef7',
    chartPark:    '#4CAF50',
    textPrimary:  '#FFFFFF',
    textSecondary:'rgba(255,255,255,0.45)',
    textMuted:    'rgba(255,255,255,0.25)',
  },
  radius: {
    sm:   12,
    md:   14,
    lg:   18,
    xl:   22,
    pill: 50,
  },
  tabBarHeight: 88,
} as const;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/theme.ts package.json
git commit -m "feat(theme): add iOS 26 design tokens and install expo-blur"
```

---

## Task 2: Create GlassCard component

**Files:**
- Create: `src/components/GlassCard.tsx`

`GlassCard` is a `BlurView` (tint="dark", intensity=80) with a semi-transparent dark overlay and glass border. Used for large panels: home bottom panel, section headers, history day groups, stats sections, session times card.

> Note: `StatCard` and `ModeButton` use plain rgba glass (no BlurView) for performance.

- [ ] **Step 1: Create src/components/GlassCard.tsx**

```tsx
import React from 'react';
import { BlurView } from 'expo-blur';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  intensity?: number;
  borderRadius?: number;
}

export function GlassCard({
  children,
  style,
  padding = 14,
  intensity = 80,
  borderRadius = theme.radius.lg,
}: Props) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      style={[styles.blur, { borderRadius }, style]}
    >
      <View style={[styles.overlay, { padding, borderRadius }]}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.glassDark,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/GlassCard.tsx
git commit -m "feat(ui): add GlassCard component with expo-blur"
```

---

## Task 3: Create GlassTabBar component

**Files:**
- Create: `src/components/GlassTabBar.tsx`

Custom tab bar: absolutely positioned at the bottom, BlurView overlay, indicator dot above active icon. Uses `useSafeAreaInsets` for home-indicator padding.

- [ ] **Step 1: Create src/components/GlassTabBar.tsx**

```tsx
import React from 'react';
import { BlurView } from 'expo-blur';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';

const TAB_META: Record<string, { active: string; inactive: string; label: string }> = {
  index:   { active: 'map',       inactive: 'map-outline',       label: 'Карта' },
  history: { active: 'time',      inactive: 'time-outline',      label: 'История' },
  stats:   { active: 'bar-chart', inactive: 'bar-chart-outline', label: 'Статистика' },
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <BlurView intensity={80} tint="dark" style={styles.blur}>
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            active: 'ellipse',
            inactive: 'ellipse-outline',
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {isFocused && <View style={styles.dot} />}
              <Ionicons
                name={(isFocused ? meta.active : meta.inactive) as any}
                size={22}
                color={isFocused ? theme.colors.accent : theme.colors.textMuted}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  overlay: {
    backgroundColor: theme.colors.glassDark,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  labelActive: {
    color: theme.colors.accent,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/GlassTabBar.tsx
git commit -m "feat(ui): add GlassTabBar with expo-blur and safe area insets"
```

---

## Task 4: Wire GlassTabBar into layout + dark headers

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

Full replacement of the file:

- [ ] **Step 1: Replace app/(tabs)/_layout.tsx**

```tsx
import { Tabs } from 'expo-router';
import { GlassTabBar } from '@/components/GlassTabBar';
import { theme } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTitleStyle: { fontWeight: '600', color: theme.colors.textPrimary },
        headerTintColor: theme.colors.accent,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Walk&Paw',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'История' }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Статистика' }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Open the app on simulator**

```bash
npx expo start
```

Expected: the dark glass tab bar appears at the bottom. Navigating between tabs highlights the active icon with a blue dot and label.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat(nav): wire GlassTabBar and dark header into tabs layout"
```

---

## Task 5: Update StatCard and ModeButton

**Files:**
- Modify: `src/components/StatCard.tsx`
- Modify: `src/components/ModeButton.tsx`

StatCard and ModeButton use plain rgba glass (no BlurView) — performance-safe for the 4-card grid and the 3 mode buttons.

- [ ] **Step 1: Replace src/components/StatCard.tsx**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  value: string;
  unit: string;
  valueColor?: string;
}

export function StatCard({ value, unit, valueColor = theme.colors.textPrimary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  } as any,
  unit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Replace src/components/ModeButton.tsx**

```tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { WalkMode } from '@/stores/walkStore';
import { theme } from '../theme';

interface Props {
  id: WalkMode;
  label: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
}

export function ModeButton({ id, label, icon, isSelected, onPress }: Props) {
  return (
    <Pressable
      style={[styles.button, isSelected && styles.selected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  selected: {
    backgroundColor: 'rgba(79,142,247,0.22)',
    borderColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  icon: {
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    adjustsFontSizeToFit: true,
  } as any,
  labelSelected: {
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/StatCard.tsx src/components/ModeButton.tsx
git commit -m "feat(ui): apply glass theme to StatCard and ModeButton"
```

---

## Task 6: Update Home screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

Map fills the full container (`StyleSheet.absoluteFillObject`). Glass bottom panel (GlassCard) floats above the map. `paddingBottom` accounts for the tab bar.

- [ ] **Step 1: Replace app/(tabs)/index.tsx**

```tsx
import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, SafeAreaView } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useWalkStore, WALK_MODES } from '@/stores/walkStore';
import { ModeButton } from '@/components/ModeButton';
import { GlassCard } from '@/components/GlassCard';
import { theme } from '@/theme';

const START_LABEL: Record<string, string> = {
  fast:     '▶  Старт пробежки',
  slow:     '▶  Старт прогулки',
  parkGame: '▶  Старт игры в парке',
};

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { selectedMode, setMode } = useWalkStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600
      );
    })();
  }, []);

  const handleStart = async () => {
    if (selectedMode === 'parkGame') {
      Alert.alert('Скоро', 'Режим «Игра в парке» находится в разработке', [{ text: 'ОК' }]);
      return;
    }
    router.push('/walk');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: 55.7558,
          longitude: 37.6176,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.spacer} pointerEvents="none" />
        <GlassCard style={styles.bottomPanel} padding={0} borderRadius={theme.radius.xl}>
          <View style={styles.innerPadding}>
            <View style={styles.modeRow}>
              {WALK_MODES.map((m) => (
                <ModeButton
                  key={m.id}
                  id={m.id}
                  label={m.label}
                  icon={m.icon}
                  isSelected={selectedMode === m.id}
                  onPress={() => setMode(m.id)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
              <Text style={styles.startButtonText}>{START_LABEL[selectedMode]}</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  overlay: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  bottomPanel: {
    marginHorizontal: 12,
    marginBottom: theme.tabBarHeight - 16,
  },
  innerPadding: {
    padding: 14,
    gap: 10,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startButton: {
    backgroundColor: theme.colors.green,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: theme.colors.green,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Open simulator and verify**

```bash
npx expo start
```

Expected:
- Map fills the full screen including behind the glass panel
- Mode buttons show with blue glass border, selected one glows
- Start button has green glow shadow
- Tab bar shows through the bottom of the screen

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat(home): apply iOS 26 glass style — map full-screen, glass bottom panel"
```

---

## Task 7: Update Walk screen

**Files:**
- Modify: `app/walk.tsx`

Stats grid moves to a glass container at top. Map fills remaining space. Finish button has red glow.

- [ ] **Step 1: Replace app/walk.tsx**

```tsx
import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useWalkStore } from '@/stores/walkStore';
import { startTracking, stopTracking } from '@/services/locationService';
import { StatCard } from '@/components/StatCard';
import { HomeMarker } from '@/components/HomeMarker';
import { formatTime } from '@/utils/formatTime';
import { theme } from '@/theme';

const FINISH_LABEL: Record<string, string> = {
  fast:     '⏹  Завершить пробежку',
  slow:     '⏹  Завершить прогулку',
  parkGame: '⏹  Завершить игру в парке',
};

export default function WalkScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

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

  const lastCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (routeCoordinates.length === 0) return;
    const latest = routeCoordinates[routeCoordinates.length - 1];
    if (
      lastCoordRef.current?.latitude === latest.latitude &&
      lastCoordRef.current?.longitude === latest.longitude
    ) return;
    lastCoordRef.current = latest;
    mapRef.current?.animateToRegion(
      {
        latitude: latest.latitude,
        longitude: latest.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400
    );
  }, [routeCoordinates]);

  useEffect(() => {
    let didStart = false;
    const init = async () => {
      const ok = await startTracking();
      didStart = ok;
      if (!ok) {
        Alert.alert(
          'Нет доступа к геолокации',
          'Разрешите доступ в Настройках → Конфиденциальность → Геолокация',
          [
            { text: 'Открыть настройки', onPress: () => {} },
            { text: 'Назад', style: 'cancel', onPress: () => router.back() },
          ]
        );
      }
    };
    init();
    return () => { if (didStart) stopTracking(); };
  }, []);

  const handleFinish = useCallback(async () => {
    stopTracking();
    await finishWalk();
    router.back();
  }, [finishWalk, router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats 2×2 */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard value={String(stepCount)} unit="шаги" valueColor={theme.colors.green} />
          <StatCard value={formatTime(elapsedSeconds)} unit="время" />
        </View>
        <View style={styles.statsRow}>
          <StatCard value={(distanceMeters / 1000).toFixed(2)} unit="км" valueColor={theme.colors.accent} />
          <StatCard value={String(Math.round(calories))} unit="ккал" valueColor={theme.colors.orange} />
        </View>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        initialRegion={{
          latitude: startCoordinate?.latitude ?? 55.7558,
          longitude: startCoordinate?.longitude ?? 37.6176,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={theme.colors.accent}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}
        {startCoordinate && <HomeMarker coordinate={startCoordinate} />}
      </MapView>

      {/* Finish button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.finishButtonText}>{FINISH_LABEL[selectedMode]}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  statsGrid: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: theme.colors.bg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  map: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: theme.colors.bg,
  },
  finishButton: {
    backgroundColor: theme.colors.red,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: theme.colors.red,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Open simulator, start a walk, verify**

Expected:
- Dark background on stats grid and bottom bar
- Stats cards have blue glass border, correct accent colors
- Route polyline is `#4f8ef7` (accent blue)
- Finish button has red glow shadow

- [ ] **Step 3: Commit**

```bash
git add app/walk.tsx
git commit -m "feat(walk): apply iOS 26 glass style to walk tracking screen"
```

---

## Task 8: Update History screen

**Files:**
- Modify: `app/(tabs)/history.tsx`

Dark background, glass filter buttons, dark chart colors, glass day-group cards, glass session rows.

- [ ] **Step 1: Replace app/(tabs)/history.tsx**

```tsx
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import { useHistoryStore, HistoryFilter, DayGroup } from '@/stores/historyStore';
import { WalkSession } from '@/db/database';
import { WALK_MODES } from '@/stores/walkStore';
import { theme } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

const MODE_LABEL: Record<string, string> = Object.fromEntries(
  WALK_MODES.map((m) => [m.id, `${m.icon} ${m.label}`])
);

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} мин`;
  return `${Math.floor(m / 60)} ч ${m % 60} мин`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={onPress}>
      <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SessionRow({ session }: { session: WalkSession }) {
  const router = useRouter();
  const km = (session.distanceMeters / 1000).toFixed(2);
  return (
    <Pressable
      style={({ pressed }) => [styles.sessionRow, pressed && styles.sessionRowPressed]}
      onPress={() => router.push(`/session/${session.id}`)}
    >
      <View style={styles.sessionLeft}>
        <Text style={styles.sessionMode}>{MODE_LABEL[session.mode] ?? session.mode}</Text>
        <Text style={styles.sessionDuration}>{formatDuration(session.durationSeconds)}</Text>
      </View>
      <View style={styles.sessionStats}>
        <Text style={styles.sessionDistance}>{km} км</Text>
        {session.stepCount > 0 && (
          <Text style={styles.sessionSteps}>{session.stepCount} шагов</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { filter, setFilter, loadSessions, filteredSessions, sessionsByDay, isLoading } =
    useHistoryStore();

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const groups = sessionsByDay();
  const allFiltered = filteredSessions();

  const chartData = (() => {
    const days = filter === 'week' ? 7 : 30;
    const labels: string[] = [];
    const values: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      labels.push(i === 0 ? 'Сег' : String(d.getDate()));
      const group = groups.find((g) => g.dateKey === key);
      values.push(group ? group.totalDistanceMeters / 1000 : 0);
    }
    return { labels, values };
  })();

  const displayLabels =
    filter === 'week'
      ? chartData.labels
      : chartData.labels.map((l, i) => (i % 5 === 0 || i === chartData.labels.length - 1 ? l : ''));

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <FilterButton label="Неделя" active={filter === 'week'} onPress={() => setFilter('week')} />
        <FilterButton label="Месяц" active={filter === 'month'} onPress={() => setFilter('month')} />
      </View>

      {allFiltered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🚶</Text>
          <Text style={styles.emptyTitle}>Нет прогулок</Text>
          <Text style={styles.emptySub}>Нажмите «Старт прогулки» чтобы начать</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.dateKey}
          ListHeaderComponent={
            <View style={styles.chartWrapper}>
              <BarChart
                data={{
                  labels: displayLabels,
                  datasets: [{ data: chartData.values }],
                }}
                width={CHART_WIDTH}
                height={160}
                yAxisLabel=""
                yAxisSuffix=" км"
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: theme.colors.bg,
                  backgroundGradientTo: theme.colors.bg,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(79,142,247,${opacity})`,
                  labelColor: () => theme.colors.textSecondary,
                  barPercentage: 0.7,
                  propsForBackgroundLines: { strokeWidth: 0.5, stroke: theme.colors.glassBorder },
                }}
                style={{ borderRadius: theme.radius.sm }}
                showValuesOnTopOfBars={false}
                withInnerLines
                fromZero
              />
            </View>
          }
          renderItem={({ item: group }: { item: DayGroup }) => (
            <View style={styles.dayGroup}>
              <Text style={styles.dayHeader}>{formatDate(group.date)}</Text>
              {group.sessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: theme.tabBarHeight + 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  filterRow: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 2,
    gap: 2,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(79,142,247,0.2)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  filterBtnText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  filterBtnTextActive: { color: theme.colors.accent, fontWeight: '600' },
  chartWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 8,
    overflow: 'hidden',
  },
  dayGroup: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    overflow: 'hidden',
  },
  dayHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.glassBorder,
  },
  sessionRowPressed: { backgroundColor: 'rgba(79,142,247,0.08)' },
  sessionLeft: { flex: 1 },
  sessionMode: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  sessionDuration: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  sessionStats: { alignItems: 'flex-end', marginRight: 8 },
  sessionDistance: { fontSize: 17, fontWeight: '700', color: theme.colors.green },
  sessionSteps: { fontSize: 14, fontWeight: '600', color: theme.colors.accent, marginTop: 2 },
  chevron: { fontSize: 20, color: theme.colors.textMuted, fontWeight: '300' },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  emptySub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
```

- [ ] **Step 2: Open simulator on History tab, verify**

Expected:
- Dark background throughout
- Filter buttons: glass border, active = blue tint
- Bar chart bars are blue on dark background (no white chart background)
- Session rows: dark glass with blue border, distance in green, steps in accent blue
- Content doesn't hide behind tab bar

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/history.tsx
git commit -m "feat(history): apply iOS 26 glass style and dark chart colors"
```

---

## Task 9: Update Stats screen

**Files:**
- Modify: `app/(tabs)/stats.tsx`

Dark background, glass summary cards with accent colors per metric, glass section containers, dark chart colors, glass reminder rows.

- [ ] **Step 1: Add theme import to app/(tabs)/stats.tsx**

Add to the import block at the top of the file:
```tsx
import { theme } from '@/theme';
```

- [ ] **Step 2: In app/(tabs)/stats.tsx, update the StyleSheet at the bottom**

Find and replace the `StyleSheet.create({...})` block (lines 312–415):

```tsx
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingBottom: theme.tabBarHeight + 8 },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    margin: 16,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  section: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },
  swipeRowContainer: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.glassBorder,
  },
  reminderRowChildren: {
    backgroundColor: 'transparent',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  swipeActionColumn: {
    flex: 1,
    width: SWIPE_ACTION_WIDTH,
  },
  swipeActionInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderTimeBlock: { flex: 1 },
  reminderTime: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  reminderTimeDisabled: { color: theme.colors.textMuted },
  reminderSwitch: { marginRight: 4 },
  addBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 15,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  pickerWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  pickerIos: {
    width: SCREEN_WIDTH - 64,
    maxWidth: 400,
    alignSelf: 'center',
  },
  pickerAndroid: {
    width: '100%',
  },
});
```

- [ ] **Step 3: In app/(tabs)/stats.tsx, update pieData legendFontColor**

Find in the `pieData` map:
```tsx
legendFontColor: '#1C1C1E',
```

Replace with:
```tsx
legendFontColor: theme.colors.textPrimary,
```

- [ ] **Step 4: In app/(tabs)/stats.tsx, update chart configs**

Find the `LineChart` chartConfig:
```tsx
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
```

Replace with:
```tsx
chartConfig={{
  backgroundColor: 'transparent',
  backgroundGradientFrom: theme.colors.bg,
  backgroundGradientTo: theme.colors.bg,
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(79,142,247,${opacity})`,
  labelColor: () => theme.colors.textSecondary,
  propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.accent },
  propsForBackgroundLines: { strokeWidth: 0.5, stroke: theme.colors.glassBorder },
}}
```

- [ ] **Step 5: Open simulator on Statistics tab, verify**

Expected:
- Dark background
- 4 summary cards with glass border
- Pie chart: legend text is white (not dark)
- Line chart: dark background, blue line
- Reminder rows: dark background, blue time text
- Add reminder button: dashed blue border
- Content doesn't hide behind tab bar

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/stats.tsx
git commit -m "feat(stats): apply iOS 26 glass style and dark chart colors"
```



---

## Task 10: Update Session Detail screen

**Files:**
- Modify: `app/session/[id].tsx`

Dark background, glass times card, accent colors consistent with rest of app.

- [ ] **Step 1: In app/session/[id].tsx, add theme import**

Add to imports:
```tsx
import { theme } from '@/theme';
```

- [ ] **Step 2: In app/session/[id].tsx, replace the StyleSheet**

Find and replace the `StyleSheet.create({...})` block (lines 160–186):

```tsx
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: theme.colors.textSecondary },
  scroll: { flexGrow: 1 },
  map: { height: 280, width: '100%' },
  body: { padding: 16, gap: 12 },
  headerRow: { gap: 2 },
  modeLabel: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  dateLabel: { fontSize: 14, color: theme.colors.textSecondary },
  timesCard: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timesKey: { fontSize: 15, color: theme.colors.textSecondary },
  timesValue: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.glassBorder },
  statsRow: { flexDirection: 'row', gap: 10 },
});
```

- [ ] **Step 3: In app/session/[id].tsx, update StatCard valueColor for distance**

Find:
```tsx
<StatCard
  value={(session.distanceMeters / 1000).toFixed(2)}
  unit="км"
  valueColor="#007AFF"
/>
```

Replace with:
```tsx
<StatCard
  value={(session.distanceMeters / 1000).toFixed(2)}
  unit="км"
  valueColor={theme.colors.accent}
/>
```

- [ ] **Step 4: Update ActivityIndicator color**

Find:
```tsx
<ActivityIndicator size="large" color="#007AFF" />
```

Replace with:
```tsx
<ActivityIndicator size="large" color={theme.colors.accent} />
```

- [ ] **Step 5: Open simulator, tap a session row, verify**

Expected:
- Dark background
- Route map renders normally
- Mode + date header in white/secondary text
- Times card has glass border
- Stat cards at bottom match walk screen style

- [ ] **Step 6: Commit**

```bash
git add app/session/[id].tsx
git commit -m "feat(session): apply iOS 26 glass style to session detail screen"
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] Home: map visible through glass bottom panel; tab bar blurs map
- [ ] Walk: stats grid dark, correct accent colors per metric
- [ ] History: dark chart, glass session rows, filter pills styled
- [ ] Stats: dark charts (no white background), glass sections, white legend text
- [ ] Session: dark background, glass times card
- [ ] Grep for old colors — none should remain in UI files:
  ```bash
  grep -r "#F2F2F7\|#fff\|#E5E5EA\|#8E8E93\|#1C1C1E\|#007AFF" app/ src/components/
  ```
  Expected: zero matches (these colors were the old light theme)
- [ ] Open on Android — layout intact even if blur renders as flat overlay
