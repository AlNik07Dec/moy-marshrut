import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  value: string;
  unit: string;
  valueColor?: string;
}

export function StatCard({ value, unit, valueColor = '#1C1C1E' }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  } as any,
  unit: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
});
