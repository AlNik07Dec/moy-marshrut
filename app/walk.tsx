import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalkStore } from '@/stores/walkStore';
import { startTracking, stopTracking } from '@/services/locationService';
import { StatCard } from '@/components/StatCard';
import { GlassCard } from '@/components/GlassCard';
import { HomeMarker } from '@/components/HomeMarker';
import { formatTime } from '@/utils/formatTime';
import { theme } from '@/theme';

const FINISH_LABEL: Record<string, string> = {
  fast: '⏹  Завершить пробежку',
  slow: '⏹  Завершить прогулку',
  parkGame: '⏹  Завершить игру в парке',
};

export default function WalkScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      {/* Stats grid 2×2 */}
      <GlassCard style={styles.statsCard} padding={12}>
        <View style={styles.statsRow}>
          <StatCard value={String(stepCount)} unit="шаги" valueColor={theme.colors.green} />
          <StatCard value={formatTime(elapsedSeconds)} unit="время" />
        </View>
        <View style={[styles.statsRow, { marginTop: 8 }]}>
          <StatCard value={(distanceMeters / 1000).toFixed(2)} unit="км" valueColor={theme.colors.accent} />
          <StatCard value={String(Math.round(calories))} unit="ккал" valueColor={theme.colors.orange} />
        </View>
      </GlassCard>

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
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity onPress={handleFinish} activeOpacity={0.85} style={styles.finishButtonOuter}>
          <LinearGradient
            colors={['#ff5c52', theme.colors.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.finishButton}
          >
            <Text style={styles.finishButtonText}>{FINISH_LABEL[selectedMode]}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
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
    backgroundColor: theme.colors.bg,
  },
  finishButtonOuter: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    shadowColor: theme.colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  finishButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: theme.radius.md,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
