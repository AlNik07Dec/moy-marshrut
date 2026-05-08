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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
// @ts-ignore
import { PieChart, LineChart } from 'react-native-chart-kit';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useHistoryStore } from '@/stores/historyStore';
import { useNotificationStore, Reminder } from '@/stores/notificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const MAX_REMINDERS = 5;
const SWIPE_ACTION_WIDTH = 72;
const SWIPE_DELETE_COLOR = '#FF3B30';
const SWIPE_EDIT_COLOR = '#FF9500';

/** Russian strings via Unicode escapes (ASCII source file). */
const S = {
  km: '\u043a\u043c',
  walks: '\u043f\u0440\u043e\u0433\u0443\u043b\u043e\u043a',
  timeNoun: '\u0432\u0440\u0435\u043c\u044f',
  modeFast: '\u041f\u0440\u043e\u0431\u0435\u0436\u043a\u0430',
  modeSlow: '\u041f\u0440\u043e\u0433\u0443\u043b\u043a\u0430',
  modePark: '\u0418\u0433\u0440\u0430 \u0432 \u043f\u0430\u0440\u043a\u0435',
  byModes: '\u041f\u043e \u0440\u0435\u0436\u0438\u043c\u0430\u043c',
  noWalksWeek:
    '\u041d\u0435\u0442 \u043f\u0440\u043e\u0433\u0443\u043b\u043e\u043a \u0437\u0430 \u044d\u0442\u0443 \u043d\u0435\u0434\u0435\u043b\u044e',
  distanceWeek:
    '\u0414\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u044f \u0437\u0430 \u043d\u0435\u0434\u0435\u043b\u044e',
  reminders: '\u041d\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u044f',
  addReminder:
    '\u002b \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043d\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u0435',
  scheduleErrorTitle: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0438\u0442\u044c \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435',
  scheduleErrorBody:
    '\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0438\u043b\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445.',
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
  const ch = '\u0447';
  const min = '\u043c\u0438\u043d';
  return h > 0 ? `${h}${ch} ${m}${min}` : `${m}${min}`;
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

type PickerMode = { type: 'add' } | { type: 'edit'; id: string };

type SwipeableInstance = React.ElementRef<typeof Swipeable>;

export default function StatsScreen() {
  const { loadSessions, weekStats } = useHistoryStore();
  const { reminders, addReminder, removeReminder, toggleReminder, setReminderTime } =
    useNotificationStore();

  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const swipeRefs = useRef<Map<string, SwipeableInstance | null>>(new Map());

  const closeOtherSwipes = useCallback((exceptId: string) => {
    swipeRefs.current.forEach((row, id) => {
      if (id !== exceptId) row?.close();
    });
  }, []);

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
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalKm.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>{S.km}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalWalks}</Text>
          <Text style={styles.summaryLabel}>{S.walks}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatHours(stats.totalSeconds)}</Text>
          <Text style={styles.summaryLabel}>{S.timeNoun}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{S.byModes}</Text>
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
            <Text style={styles.emptyText}>{S.noWalksWeek}</Text>
          </View>
        )}
      </View>

      {hasDistanceData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.distanceWeek}</Text>
          <LineChart
            data={{
              labels: stats.dayLabels,
              datasets: [{ data: stats.dailyKm }],
            }}
            width={CHART_WIDTH}
            height={160}
            yAxisSuffix={` ${S.km}`}
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
                  style={[styles.swipeActionInner, { backgroundColor: SWIPE_EDIT_COLOR }]}
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
                  style={[styles.swipeActionInner, { backgroundColor: SWIPE_DELETE_COLOR }]}
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
                onValueChange={(v) => {
                  toggleReminder(reminder.id, v);
                }}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
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
  swipeRowContainer: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  reminderRowChildren: {
    backgroundColor: '#fff',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#fff',
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
    color: '#007AFF',
  },
  reminderTimeDisabled: { color: '#C7C7CC' },
  reminderSwitch: { marginRight: 4 },
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
