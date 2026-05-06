import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { fetchSessionById, WalkSession } from '@/db/database';
import { StatCard } from '@/components/StatCard';
import { HomeMarker } from '@/components/HomeMarker';
import { WALK_MODES } from '@/stores/walkStore';
import { formatTime } from '@/utils/formatTime';

const MODE_LABEL: Record<string, string> = Object.fromEntries(
  WALK_MODES.map((m) => [m.id, `${m.icon} ${m.label}`])
);

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WalkSession | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    fetchSessionById(Number(id)).then(setSession);
  }, [id]);

  if (session === undefined) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (session === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.notFound}>Прогулка не найдена</Text>
      </SafeAreaView>
    );
  }

  const coords: { latitude: number; longitude: number }[] = (() => {
    try {
      return JSON.parse(session.routeCoordinates);
    } catch {
      return [];
    }
  })();

  const hasRoute = coords.length > 1;
  const centerCoord = coords.length > 0
    ? coords[0]
    : session.startLat != null && session.startLng != null
      ? { latitude: session.startLat, longitude: session.startLng }
      : { latitude: 55.7558, longitude: 37.6176 };

  const endTime = session.startTime != null
    ? session.startTime + session.durationSeconds * 1000
    : session.date;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Map */}
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          initialRegion={{
            latitude: centerCoord.latitude,
            longitude: centerCoord.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
        >
          {hasRoute && (
            <Polyline
              coordinates={coords}
              strokeColor="#007AFF"
              strokeWidth={4}
              lineJoin="round"
              lineCap="round"
            />
          )}
          {coords.length > 0 && <HomeMarker coordinate={coords[0]} />}
        </MapView>

        <View style={styles.body}>
          {/* Mode + date */}
          <View style={styles.headerRow}>
            <Text style={styles.modeLabel}>
              {MODE_LABEL[session.mode] ?? session.mode}
            </Text>
            <Text style={styles.dateLabel}>
              {formatDateFull(session.startTime ?? session.date)}
            </Text>
          </View>

          {/* Start / end time */}
          <View style={styles.timesCard}>
            <View style={styles.timesRow}>
              <Text style={styles.timesKey}>Начало</Text>
              <Text style={styles.timesValue}>
                {session.startTime != null ? formatDateTime(session.startTime) : '—'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timesRow}>
              <Text style={styles.timesKey}>Конец</Text>
              <Text style={styles.timesValue}>{formatDateTime(endTime)}</Text>
            </View>
          </View>

          {/* Stat cards */}
          <View style={styles.statsRow}>
            <StatCard value={formatTime(session.durationSeconds)} unit="время" />
            <StatCard
              value={(session.distanceMeters / 1000).toFixed(2)}
              unit="км"
              valueColor="#007AFF"
            />
            {session.stepCount > 0 && (
              <StatCard
                value={session.stepCount.toLocaleString('ru-RU')}
                unit="шаги"
                valueColor="#34C759"
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: '#8E8E93' },
  scroll: { flexGrow: 1 },
  map: { height: 280, width: '100%' },
  body: { padding: 16, gap: 12 },
  headerRow: { gap: 2 },
  modeLabel: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  dateLabel: { fontSize: 14, color: '#8E8E93' },
  timesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timesKey: { fontSize: 15, color: '#8E8E93' },
  timesValue: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA' },
  statsRow: { flexDirection: 'row', gap: 10 },
});
