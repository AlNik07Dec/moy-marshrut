import React, { useCallback } from 'react';
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
                <SessionRow key={s.id} session={s} />
              ))}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: theme.tabBarHeight + 16 }}
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
  chevron: { fontSize: 20, color: theme.colors.textMuted, fontWeight: '300' },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  emptySub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
