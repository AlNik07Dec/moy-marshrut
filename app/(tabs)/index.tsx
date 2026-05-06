import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useWalkStore, WALK_MODES } from '@/stores/walkStore';
import { ModeButton } from '@/components/ModeButton';

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { selectedMode, setMode } = useWalkStore();

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
      Alert.alert(
        'Скоро',
        'Режим «Игра в парке» находится в разработке',
        [{ text: 'ОК' }]
      );
      return;
    }
    router.push('/walk');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
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

      <View style={styles.startButtonWrapper}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startButtonText}>▶  Старт прогулки</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  startButtonWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  startButton: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
});
