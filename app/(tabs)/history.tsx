import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Dimensions,
  StatusBar,
  Platform,
  Share,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

import { BarChart } from 'react-native-chart-kit';
import { useHistoryStore, HistoryFilter, DayGroup } from '@/stores/historyStore';
import { WalkSession } from '@/db/database';
import { WALK_MODES } from '@/stores/walkStore';
import { theme } from '@/theme';
import { HomeMarker } from '@/components/HomeMarker';

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

function parseCoords(json: string): { latitude: number; longitude: number }[] {
  try { return JSON.parse(json); } catch { return []; }
}

function computeRegion(coords: { latitude: number; longitude: number }[]) {
  if (coords.length === 0) {
    return { latitude: 55.7558, longitude: 37.6176, latitudeDelta: 0.01, longitudeDelta: 0.01 };
  }
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude); maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude); maxLng = Math.max(maxLng, c.longitude);
  }
  const pad = 0.003;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + pad * 2, pad * 2),
    longitudeDelta: Math.max(maxLng - minLng + pad * 2, pad * 2),
  };
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={onPress}>
      <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SessionRow({
  session,
  onShare,
  sharingId,
}: {
  session: WalkSession;
  onShare: (s: WalkSession) => void;
  sharingId: number | null;
}) {
  const router = useRouter();
  const km = (session.distanceMeters / 1000).toFixed(2);
  const isCurrentlySharing = sharingId === session.id;

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
      <Pressable
        style={styles.shareBtn}
        hitSlop={8}
        disabled={sharingId !== null}
        onPress={() => onShare(session)}
      >
        {isCurrentlySharing ? (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        ) : (
          <Ionicons
            name="share-outline"
            size={20}
            color={sharingId !== null ? theme.colors.textMuted : theme.colors.accent}
          />
        )}
      </Pressable>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { filter, setFilter, loadSessions, filteredSessions, sessionsByDay, isLoading } =
    useHistoryStore();

  const [sharingSession, setSharingSession] = useState<WalkSession | null>(null);
  const shareMapRef = useRef<MapView>(null);

  useFocusEffect(useCallback(() => {
    StatusBar.setBarStyle('light-content');
  }, []));

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const groups = sessionsByDay();
  const allFiltered = filteredSessions();

  function handleShare(session: WalkSession) {
    if (sharingSession !== null) return;
    setSharingSession(session);
  }

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

    return { values, allLabels: labels };
  })();

  const displayLabels =
    filter === 'week'
      ? chartData.allLabels
      : chartData.allLabels.map((l, i) =>
          i % 5 === 0 || i === chartData.allLabels.length - 1 ? l : ''
        );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter toggle */}
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
                  backgroundColor: theme.colors.bgDeep,
                  backgroundGradientFrom: theme.colors.bg,
                  backgroundGradientTo: theme.colors.bgDeep,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(79,142,247,${opacity})`,
                  labelColor: () => theme.colors.textSecondary,
                  barPercentage: 0.7,
                  propsForBackgroundLines: {
                    strokeWidth: 0.5,
                    stroke: theme.colors.glassBorder,
                  },
                }}
                style={{ borderRadius: theme.radius.md }}
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
                <SessionRow
                  key={s.id}
                  session={s}
                  onShare={handleShare}
                  sharingId={sharingSession?.id ?? null}
                />
              ))}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: theme.tabBarHeight + 16 }}
        />
      )}

      {/* Скрытая карта для снимка маршрута */}
      {sharingSession !== null && (() => {
        const session = sharingSession;
        const coords = parseCoords(session.routeCoordinates);
        return (
          <View style={styles.hiddenMap} pointerEvents="none">
            <MapView
              ref={shareMapRef}
              provider={PROVIDER_DEFAULT}
              style={StyleSheet.absoluteFill}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              initialRegion={computeRegion(coords)}
              onMapReady={async () => {
                await new Promise((r) => setTimeout(r, 700));
                try {
                  const uri = await shareMapRef.current!.takeSnapshot({
                    width: 800,
                    height: 600,
                    format: 'png',
                    quality: 0.9,
                    result: 'file',
                  });
                  const km = (session.distanceMeters / 1000).toFixed(1);
                  const mins = formatDuration(session.durationSeconds);
                  const text = `Прогулка с собакой: ${km} км, ${mins}`;
                  if (Platform.OS === 'ios') {
                    await Share.share({ message: text, url: uri });
                  } else {
                    await Sharing.shareAsync(uri, { dialogTitle: text, mimeType: 'image/png' });
                  }
                } catch {
                  // пользователь закрыл шит или снимок не удался
                } finally {
                  setSharingSession(null);
                }
              }}
            >
              {coords.length > 1 && (
                <Polyline
                  coordinates={coords}
                  strokeColor={theme.colors.accent}
                  strokeWidth={4}
                  lineJoin="round"
                  lineCap="round"
                />
              )}
              {coords.length > 0 && <HomeMarker coordinate={coords[0]} />}
            </MapView>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  filterRow: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: theme.colors.glassDark,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 3,
    gap: 3,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm - 2,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(79,142,247,0.20)',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  filterBtnText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
  filterBtnTextActive: { color: theme.colors.accent, fontWeight: '600' },
  chartWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.glassDark,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 8,
    overflow: 'hidden',
  },
  dayGroup: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: theme.colors.glassDark,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    overflow: 'hidden',
  },
  dayHeader: {
    fontSize: 12,
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
  sessionRowPressed: { backgroundColor: theme.colors.glass },
  sessionLeft: { flex: 1 },
  sessionMode: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  sessionDuration: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  sessionStats: { alignItems: 'flex-end', marginRight: 8 },
  sessionDistance: { fontSize: 17, fontWeight: '700', color: theme.colors.green },
  sessionSteps: { fontSize: 17, fontWeight: '700', color: theme.colors.accent, marginTop: 2 },
  shareBtn: { paddingHorizontal: 6, paddingVertical: 4, marginLeft: 4, minWidth: 32, alignItems: 'center' },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  emptySub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  hiddenMap: { position: 'absolute', left: -1000, top: -1000, width: 400, height: 300 },
});
