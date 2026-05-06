import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { WalkMode } from '@/stores/walkStore';

interface Props {
  id: WalkMode;
  label: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
}

export function ModeButton({ id, label, icon, isSelected, onPress }: Props) {
  return (
    <Pressable
      style={[styles.button, isSelected && styles.selected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selected: {
    backgroundColor: '#E8F0FE',
    borderColor: '#007AFF',
  },
  icon: {
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3C3C43',
    adjustsFontSizeToFit: true,
  } as any,
  labelSelected: {
    fontWeight: '700',
    color: '#007AFF',
  },
});
