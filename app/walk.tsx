import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
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

const SUMMARY_TITLE: Record<string, string> = {
  fast: '🏁 Пробежка завершена',
  slow: '🏁 Прогулка завершена',
  parkGame: '🎾 Игра в парке завершена',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} мин`;
  return `${Math.floor(m / 60)} ч ${m % 60} мин`;
}

export default function WalkScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const [showSummary, setShowSummary] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

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
    if (routeCoordinates.length === 0 || !mapRef.current) return;
    const latest = routeCoordinates[routeCoordinates.length - 1];
    if (
      lastCoordRef.current?.latitude === latest.latitude &&
      lastCoordRef.current?.longitude === latest.longitude
    ) return;
    lastCoordRef.current = latest;
    mapRef.current.getCamera().then((camera) => {
      mapRef.current?.animateCamera({ ...camera, center: latest }, { duration: 400 });
    });
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
    try {
      await finishWalk();
      setShowSummary(true);
    } catch {
      router.back();
    }
  }, [finishWalk, router]);

  const handleSummaryShare = useCallback(async () => {
    if (isSharing || !mapRef.current) return;
    setIsSharing(true);
    try {
      const uri = await mapRef.current.takeSnapshot({
        width: 800,
        height: 600,
        format: 'png',
        quality: 0.9,
        result: 'file',
      });
      const km = (distanceMeters / 1000).toFixed(1);
      const text = `Прогулка с собакой: ${km} км, ${formatDuration(elapsedSeconds)}`;
      if (Platform.OS === 'ios') {
        await Share.share({ message: text, url: uri });
      } else {
        await Sharing.shareAsync(uri, { dialogTitle: text, mimeType: 'image/png' });
      }
    } catch {
      // пользователь закрыл шит
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, distanceMeters, elapsedSeconds]);

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

      {/* Post-walk summary overlay */}
      {showSummary && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.summaryContainer, { paddingBottom: insets.bottom + 16 }]}>
            <GlassCard padding={20}>
              <Text style={styles.summaryTitle}>{SUMMARY_TITLE[selectedMode]}</Text>
              <View style={styles.summaryStats}>
                <StatCard value={formatTime(elapsedSeconds)} unit="время" />
                <StatCard
                  value={(distanceMeters / 1000).toFixed(2)}
                  unit="км"
                  valueColor={theme.colors.accent}
                />
                <StatCard
                  value={String(Math.round(calories))}
                  unit="ккал"
                  valueColor={theme.colors.orange}
                />
              </View>
              <View style={styles.summaryButtons}>
                <TouchableOpacity
                  style={styles.summaryShareBtn}
                  onPress={handleSummaryShare}
                  disabled={isSharing}
                  activeOpacity={0.8}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                  ) : (
                    <Ionicons name="share-outline" size={18} color={theme.colors.accent} />
                  )}
                  <Text style={styles.summaryShareText}>Поделиться</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.summaryDoneOuter}
                  onPress={() => router.back()}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[theme.colors.accent, '#2a6fd4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.summaryDoneBtn}
                  >
                    <Text style={styles.summaryDoneText}>Готово</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </View>
      )}
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
  summaryContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  summaryShareText: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  summaryDoneOuter: {
    flex: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  summaryDoneBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.md,
  },
  summaryDoneText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
