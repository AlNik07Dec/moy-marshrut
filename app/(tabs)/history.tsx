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
import { useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import { useHistoryStore, HistoryFilter, DayGroup } from '@/stores/historyStore';
import { WalkSession } from '@/db/database';
import { WALK_MODES } from '@/stores/walkStore';

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

function SessionRow({ session }: { session: WalkSession }) {
  const km = (session.distanceMeters / 1000).toFixed(2);
  return (
    <View style={styles.sessionRow}>
      <View>
        <Text style={styles.sessionMode}>{MODE_LABEL[session.mode] ?? session.mode}</Text>
        <Text style={styles.sessionDuration}>{formatDuration(session.durationSeconds)}</Text>
      </View>
      <View style={styles.sessionStats}>
        <Text style={styles.sessionDistance}>{km} км</Text>
        {session.stepCount > 0 && (
          <Text style={styles.sessionSteps}>{session.stepCount} шагов</Text>
        )}
      </View>
    </View>
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

  // Build chart data from last 7 or 30 days
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

    return { labels: filter === 'week' ? labels : labels.filter((_, i) => i % 5 === 0 || i === labels.length - 1).map((l) => l), values, allLabels: labels };
  })();

  const displayLabels =
    filter === 'week'
      ? chartData.allLabels
      : chartData.allLabels.map((l, i) => (i % 5 === 0 || i === chartData.allLabels.length - 1 ? l : ''));

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter toggle */}
      <View style={styles.filterRow}>
        <FilterButton
          label="Неделя"
          active={filter === 'week'}
          onPress={() => setFilter('week')}
        />
        <FilterButton
          label="Месяц"
          active={filter === 'month'}
          onPress={() => setFilter('month')}
        />
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
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                  labelColor: () => '#8E8E93',
                  barPercentage: 0.7,
                  propsForBackgroundLines: { strokeWidth: 0.5, stroke: '#E5E5EA' },
                }}
                style={{ borderRadius: 12 }}
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
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  filterRow: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterBtnActive: { backgroundColor: '#fff' },
  filterBtnText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  filterBtnTextActive: { color: '#1C1C1E', fontWeight: '600' },
  chartWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
  },
  dayGroup: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 14,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  sessionMode: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  sessionDuration: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  sessionStats: { alignItems: 'flex-end' },
  sessionDistance: { fontSize: 17, fontWeight: '700', color: '#34C759' },
  sessionSteps: { fontSize: 17, fontWeight: '700', color: '#007AFF', marginTop: 2 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingHorizontal: 32 },
});
