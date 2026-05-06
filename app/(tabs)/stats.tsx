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
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
// @ts-ignore
import { PieChart, LineChart } from 'react-native-chart-kit';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useHistoryStore } from '@/stores/historyStore';
import { useNotificationStore, Reminder } from '@/stores/notificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const MAX_REMINDERS = 5;

const PIE_COLORS = {
  fast: '#e94560',
  slow: '#4f8ef7',
  parkGame: '#4CAF50',
};

const MODE_LABELS = {
  fast: '????????',
  slow: '????????',
  parkGame: '???? ? ?????',
};

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}? ${m}???` : `${m}???`;
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

type PickerMode = { type: 'add' } | { type: 'edit'; id: string };

export default function StatsScreen() {
  const { loadSessions, weekStats } = useHistoryStore();
  const { reminders, addReminder, removeReminder, toggleReminder, setReminderTime } =
    useNotificationStore();

  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const stats = weekStats();
  const hasData = stats.totalWalks > 0;
  const hasDistanceData = stats.dailyKm.some((v) => v > 0);

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

  const currentReminder =
    pickerMode?.type === 'edit'
      ? reminders.find((r) => r.id === pickerMode.id)
      : null;

  const pickerDate = new Date();
  if (currentReminder) {
    pickerDate.setHours(currentReminder.hour, currentReminder.minute, 0, 0);
  } else {
    pickerDate.setHours(18, 0, 0, 0);
  }

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setPickerMode(null);
    if (!selected) return;
    const h = selected.getHours();
    const m = selected.getMinutes();

    if (pickerMode?.type === 'add') {
      addReminder(h, m);
      setPickerMode(null);
    } else if (pickerMode?.type === 'edit' && pickerMode.id) {
      setReminderTime(pickerMode.id, h, m);
      if (Platform.OS === 'ios') setPickerMode(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalKm.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>??</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalWalks}</Text>
          <Text style={styles.summaryLabel}>????????</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatHours(stats.totalSeconds)}</Text>
          <Text style={styles.summaryLabel}>?????</Text>
        </View>
      </View>

      {/* Pie chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>?? ???????</Text>
        {hasData ? (
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
            <Text style={styles.emptyText}>??? ???????? ?? ??? ??????</Text>
          </View>
        )}
      </View>

      {/* Line chart */}
      {hasDistanceData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>????????? ?? ??????</Text>
          <LineChart
            data={{
              labels: stats.dayLabels,
              datasets: [{ data: stats.dailyKm }],
            }}
            width={CHART_WIDTH}
            height={160}
            yAxisSuffix=" ??"
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

      {/* Reminders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>???????????</Text>

        {reminders.map((reminder: Reminder) => (
          <View key={reminder.id} style={styles.reminderRow}>
            <Pressable
              style={styles.reminderTimeBlock}
              onPress={() => setPickerMode({ type: 'edit', id: reminder.id })}
            >
              <Text style={[styles.reminderTime, !reminder.enabled && styles.reminderTimeDisabled]}>
                {padTwo(reminder.hour)}:{padTwo(reminder.minute)}
              </Text>
            </Pressable>
            <Switch
              value={reminder.enabled}
              onValueChange={(v) => { toggleReminder(reminder.id, v); }}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
              style={styles.reminderSwitch}
            />
            <TouchableOpacity
              onPress={() => removeReminder(reminder.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>?</Text>
            </TouchableOpacity>
          </View>
        ))}

        {reminders.length < MAX_REMINDERS && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setPickerMode({ type: 'add' })}
          >
            <Text style={styles.addBtnText}>+ ???????? ???????????</Text>
          </TouchableOpacity>
        )}
      </View>

      {pickerMode !== null && (
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  reminderTimeBlock: { flex: 1 },
  reminderTime: {
    fontSize: 26,
    fontWeight: '700',
    color: '#007AFF',
  },
  reminderTimeDisabled: { color: '#C7C7CC' },
  reminderSwitch: { marginRight: 12 },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  addBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
});
