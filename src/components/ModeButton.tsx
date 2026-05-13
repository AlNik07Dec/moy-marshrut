import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { WalkMode } from '@/stores/walkStore';
import { theme } from '../theme';

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
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.glass,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selected: {
    backgroundColor: 'rgba(79,142,247,0.20)',
    borderColor: theme.colors.glassBorder,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    adjustsFontSizeToFit: true,
  } as any,
  labelSelected: {
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
