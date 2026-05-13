import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  value: string;
  unit: string;
  valueColor?: string;
}

export function StatCard({ value, unit, valueColor = theme.colors.textPrimary }: Props) {
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
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  } as any,
  unit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
