import React, { useCallback, useRef, useState } from 'react';
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
  Alert,
  StatusBar,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
// @ts-ignore
import { PieChart, LineChart } from 'react-native-chart-kit';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useHistoryStore, HistoryFilter } from '@/stores/historyStore';
import { useNotificationStore, Reminder } from '@/stores/notificationStore';
import { theme } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const MAX_REMINDERS = 5;
const SWIPE_ACTION_WIDTH = 72;

const S = {
  km: 'км',
  walks: 'прогулок',
  timeNoun: 'время',
  kcal: 'ккал',
  modeFast: 'Пробежка',
  modeSlow: 'Прогулка',
  modePark: 'Игра в парке',
  byModes: 'По режимам',
  reminders: 'Напоминания',
  addReminder: '+ Добавить напоминание',
  scheduleErrorTitle: 'Не удалось настроить уведомление',
  scheduleErrorBody: 'Попробуйте ещё раз или проверьте разрешения в настройках.',
  ok: 'OK',
};

const PIE_COLORS = {
  fast: '#e94560',
  slow: '#4f8ef7',
  parkGame: '#4CAF50',
};

const MODE_LABELS: Record<keyof typeof PIE_COLORS, string> = {
  fast: S.modeFast,
  slow: S.modeSlow,
  parkGame: S.modePark,
};

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`;
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

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

type PickerMode = { type: 'add' } | { type: 'edit'; id: string };
type SwipeableInstance = React.ElementRef<typeof Swipeable>;

export default function StatsScreen() {
  const [filter, setFilter] = useState<HistoryFilter>('week');
  const { loadSessions, periodStats } = useHistoryStore();
  const { reminders, addReminder, removeReminder, toggleReminder, setReminderTime } =
    useNotificationStore();

  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const swipeRefs = useRef<Map<string, SwipeableInstance | null>>(new Map());

  const closeOtherSwipes = useCallback((exceptId: string) => {
    swipeRefs.current.forEach((row, id) => {
      if (id !== exceptId) row?.close();
    });
  }, []);

  useFocusEffect(useCallback(() => {
    StatusBar.setBarStyle('light-content');
  }, []));

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const stats = periodStats(filter);
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
      legendFontColor: theme.colors.textPrimary,
      legendFontSize: 13,
    }));

  const currentReminder =
    pickerMode?.type === 'edit' ? reminders.find((r) => r.id === pickerMode.id) : null;

  const pickerDate = new Date();
  if (currentReminder) {
    pickerDate.setHours(currentReminder.hour, currentReminder.minute, 0, 0);
  } else {
    pickerDate.setHours(18, 0, 0, 0);
  }

  const onTimeChange = async (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setPickerMode(null);
    if (!selected) return;
    const h = selected.getHours();
    const m = selected.getMinutes();
    const mode = pickerMode;
    try {
      if (mode?.type === 'add') {
        await addReminder(h, m);
        setPickerMode(null);
      } else if (mode?.type === 'edit' && mode.id) {
        await setReminderTime(mode.id, h, m);
        if (Platform.OS === 'ios') setPickerMode(null);
      }
    } catch {
      Alert.alert(S.scheduleErrorTitle, S.scheduleErrorBody, [{ text: S.ok }]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Filter toggle */}
      <View style={styles.filterRow}>
        <FilterButton label="Неделя" active={filter === 'week'} onPress={() => setFilter('week')} />
        <FilterButton label="Месяц" active={filter === 'month'} onPress={() => setFilter('month')} />
      </View>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: theme.colors.accent }]}>
            {stats.totalKm.toFixed(1)}
          </Text>
          <Text style={styles.summaryLabel}>{S.km}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: theme.colors.green }]}>
            {stats.totalWalks}
          </Text>
          <Text style={styles.summaryLabel}>{S.walks}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatHours(stats.totalSeconds)}</Text>
          <Text style={styles.summaryLabel}>{S.timeNoun}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: theme.colors.orange }]}>
            {stats.totalCalories}
          </Text>
          <Text style={styles.summaryLabel}>{S.kcal}</Text>
        </View>
      </View>

      {/* Pie chart section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{S.byModes}</Text>
        {hasData ? (
          <PieChart
            data={pieData}
            width={CHART_WIDTH}
            height={160}
            chartConfig={{
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: () => theme.colors.textPrimary,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            absolute={false}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>
              {filter === 'week' ? 'Нет прогулок за эту неделю' : 'Нет прогулок за этот месяц'}
            </Text>
          </View>
        )}
      </View>

      {/* Line chart section */}
      {hasDistanceData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {filter === 'week' ? 'Дистанция за неделю' : 'Дистанция за месяц'}
          </Text>
          <LineChart
            data={{
              labels: stats.dayLabels,
              datasets: [{ data: stats.dailyKm }],
            }}
            width={CHART_WIDTH}
            height={160}
            yAxisSuffix={` ${S.km}`}
            chartConfig={{
              backgroundColor: theme.colors.bgDeep,
              backgroundGradientFrom: theme.colors.bg,
              backgroundGradientTo: theme.colors.bgDeep,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(79,142,247,${opacity})`,
              labelColor: () => theme.colors.textSecondary,
              propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.accent },
              propsForBackgroundLines: { strokeWidth: 0.5, stroke: theme.colors.glassBorder },
            }}
            withDots={filter === 'week'}
            bezier
            style={{ borderRadius: theme.radius.md }}
            fromZero
          />
        </View>
      )}

      {/* Reminders section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{S.reminders}</Text>

        {reminders.map((reminder: Reminder) => (
          <Swipeable
            key={reminder.id}
            ref={(inst) => {
              if (inst) swipeRefs.current.set(reminder.id, inst);
              else swipeRefs.current.delete(reminder.id);
            }}
            friction={2}
            leftThreshold={36}
            rightThreshold={36}
            activeOffsetX={[-12, 12]}
            overshootLeft={false}
            overshootRight={false}
            onSwipeableWillOpen={() => closeOtherSwipes(reminder.id)}
            containerStyle={styles.swipeRowContainer}
            childrenContainerStyle={styles.reminderRowChildren}
            renderLeftActions={() => (
              <View style={styles.swipeActionColumn}>
                <RectButton
                  style={[styles.swipeActionInner, { backgroundColor: theme.colors.orange }]}
                  onPress={() => {
                    swipeRefs.current.get(reminder.id)?.close();
                    setPickerMode({ type: 'edit', id: reminder.id });
                  }}
                >
                  <Ionicons name="pencil" size={22} color="#fff" />
                </RectButton>
              </View>
            )}
            renderRightActions={() => (
              <View style={styles.swipeActionColumn}>
                <RectButton
                  style={[styles.swipeActionInner, { backgroundColor: theme.colors.red }]}
                  onPress={() => {
                    swipeRefs.current.get(reminder.id)?.close();
                    removeReminder(reminder.id);
                  }}
                >
                  <Ionicons name="trash" size={22} color="#fff" />
                </RectButton>
              </View>
            )}
          >
            <View style={styles.reminderRow}>
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
                onValueChange={(v) => toggleReminder(reminder.id, v)}
                trackColor={{ false: theme.colors.glassBorder, true: theme.colors.green }}
                thumbColor="#fff"
                style={styles.reminderSwitch}
              />
            </View>
          </Swipeable>
        ))}

        {reminders.length < MAX_REMINDERS && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setPickerMode({ type: 'add' })}>
            <Text style={styles.addBtnText}>{S.addReminder}</Text>
          </TouchableOpacity>
        )}

        {pickerMode !== null && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={pickerDate}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              style={Platform.OS === 'ios' ? styles.pickerIos : styles.pickerAndroid}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingBottom: theme.tabBarHeight + 24 },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
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
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.glassDark,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  summaryLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  section: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: theme.colors.glassDark,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
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
    borderColor: theme.colors.glassBorder,
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
