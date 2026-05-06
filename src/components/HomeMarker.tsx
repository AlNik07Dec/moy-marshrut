import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Coordinate } from '@/stores/walkStore';

interface Props {
  coordinate: Coordinate;
}

export function HomeMarker({ coordinate }: Props) {
  return (
    <Marker
      coordinate={coordinate}
      title="Старт"
      description="Начальная точка маршрута"
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.container}>
        <Ionicons name="home" size={20} color="#fff" />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
