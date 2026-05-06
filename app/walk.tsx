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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WalkScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const {
    routeCoordinates,
    startCoordinate,
    elapsedSeconds,
    distanceMeters,
    stepCount,
    selectedMode,
    finishWalk,
  } = useWalkStore();

  // Follow user on map as coordinates come in
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
            {
              text: 'Открыть настройки',
              onPress: () => {
                // Linking to settings handled by expo-location
              },
            },
            { text: 'Назад', style: 'cancel', onPress: () => router.back() },
          ]
        );
      }
    };

    init();

    return () => {
      if (didStart) stopTracking();
    };
  }, []);

  const handleFinish = useCallback(async () => {
    stopTracking();
    await finishWalk();
    router.back();
  }, [finishWalk, router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard value={String(stepCount)} unit="шаги" valueColor="#34C759" />
        <StatCard value={formatTime(elapsedSeconds)} unit="время" />
        <StatCard value={(distanceMeters / 1000).toFixed(2)} unit="км" valueColor="#007AFF" />
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
        {/* Blue route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Home marker at start point */}
        {startCoordinate && <HomeMarker coordinate={startCoordinate} />}
      </MapView>

      {/* Finish button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.finishButtonText}>⏹  Завершить прогулку</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  finishButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
