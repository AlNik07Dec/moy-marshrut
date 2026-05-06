// app/(tabs)/stats.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PieChart, LineChart } from 'react-native-chart-kit';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useHistoryStore } from '@/stores/historyStore';
import { useNotificationStore } from '@/stores/notificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

const PIE_COLORS = {
  fast: '#e94560',
  slow: '#4f8ef7',
  parkGame: '#4CAF50',
};

const MODE_LABELS = {
  fast: 'Пробежка',
  slow: 'Прогулка',
  parkGame: 'Игра в парке',
};

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`;
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

export default function StatsScreen() {
  const { loadSessions, weekStats } = useHistoryStore();
  const { enabled, hour, minute, setEnabled, setTime } = useNotificationStore();
  const [showPicker, setShowPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const stats = weekStats();
  const hasData = stats.totalWalks > 0;
  const hasDistanceData = stats.dailyKm.some((v) => v > 0);

  // Pie chart data — only include modes with count > 0
  const pieData = (
    Object.entries(stats.byMode) as [keyof typeof PIE_COLORS, number][]
  )
    .filter(([, count]) => count > 0)
    .map(([mode, count]) => ({
      name: MODE_LABELS[mode],
      population: count,
      color: PIE_COLORS[mode],
      legendFontColor: '#1C1C1E',
      legendFontSize: 13,
    }));

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selected) {
      setTime(selected.getHours(), selected.getMinutes());
    }
  };

  const pickerDate = new Date();
  pickerDate.setHours(hour, minute, 0, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalKm.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>км</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalWalks}</Text>
          <Text style={styles.summaryLabel}>прогулок</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatHours(stats.totalSeconds)}</Text>
          <Text style={styles.summaryLabel}>время</Text>
        </View>
      </View>

      {/* Pie chart — by mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>По режимам</Text>
        {hasData ? (
          // @ts-ignore
          <PieChart
            data={pieData}
            width={CHART_WIDTH}
            height={160}
            chartConfig={{
              color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              labelColor: () => '#1C1C1E',
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            absolute={false}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>Нет прогулок за эту неделю</Text>
          </View>
        )}
      </View>

      {/* Line chart — distance per day */}
      {hasDistanceData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Дистанция за неделю</Text>
          {/* @ts-ignore */}
          <LineChart
            data={{
              labels: stats.dayLabels,
              datasets: [{ data: stats.dailyKm }],
            }}
            width={CHART_WIDTH}
            height={160}
            yAxisSuffix=" км"
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
            bezier
            style={{ borderRadius: 12 }}
            fromZero
          />
        </View>
      )}

      {/* Notification settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Напоминания</Text>
        <View style={styles.notifCard}>
          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.notifLabel}>Напоминать о прогулке</Text>
              <Pressable onPress={() => enabled && setShowPicker(true)}>
                <Text style={[styles.notifTime, !enabled && styles.notifTimeDisabled]}>
                  {padTwo(hour)}:{padTwo(minute)}
                </Text>
              </Pressable>
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => { setEnabled(v); }}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>
          {enabled && (
            <Text style={styles.notifHint}>
              Каждый день в {padTwo(hour)}:{padTwo(minute)} — нажми на время, чтобы изменить
            </Text>
          )}
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { paddingBottom: 40 },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    margin: 16,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  summaryLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  section: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptyChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: '#8E8E93' },
  notifCard: { gap: 8 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifInfo: { flex: 1 },
  notifLabel: { fontSize: 15, color: '#1C1C1E' },
  notifTime: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 2,
  },
  notifTimeDisabled: { color: '#C7C7CC' },
  notifHint: { fontSize: 12, color: '#8E8E93' },
});
