import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, StatusBar } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalkStore, WALK_MODES } from '@/stores/walkStore';
import { ModeButton } from '@/components/ModeButton';
import { GlassCard } from '@/components/GlassCard';
import { theme } from '@/theme';

const START_LABEL: Record<string, string> = {
  fast: '▶  Старт пробежки',
  slow: '▶  Старт прогулки',
  parkGame: '▶  Старт игры в парке',
};

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { selectedMode, setMode } = useWalkStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600
      );
    })();
  }, []);

  const handleStart = async () => {
    if (selectedMode === 'parkGame') {
      Alert.alert('Скоро', 'Режим «Игра в парке» находится в разработке', [{ text: 'ОК' }]);
      return;
    }
    router.push('/walk');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        showsMyLocationButton
        initialRegion={{
          latitude: 55.7558,
          longitude: 37.6176,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <GlassCard style={styles.headerCard} padding={12} borderRadius={theme.radius.pill}>
          <View style={styles.headerContent}>
            <View style={styles.gpsDot} />
            <Text style={styles.headerTitle}>Walk&Paw</Text>
          </View>
        </GlassCard>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: theme.tabBarHeight + 8 }]}>
        <GlassCard style={styles.bottomCard} padding={16}>
          <View style={styles.modeRow}>
            {WALK_MODES.map((m) => (
              <ModeButton
                key={m.id}
                id={m.id}
                label={m.label}
                icon={m.icon}
                isSelected={selectedMode === m.id}
                onPress={() => setMode(m.id)}
              />
            ))}
          </View>

          <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={styles.startButtonOuter}>
            <LinearGradient
              colors={['#3dda70', '#34C759']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButton}
            >
              <Text style={styles.startButtonText}>{START_LABEL[selectedMode]}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerCard: {
    alignSelf: 'flex-start',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.green,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bottomCard: {},
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  startButtonOuter: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    shadowColor: theme.colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  startButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: theme.radius.md,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
