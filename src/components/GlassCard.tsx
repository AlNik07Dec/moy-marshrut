import React from 'react';
import { BlurView } from 'expo-blur';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  intensity?: number;
  borderRadius?: number;
}

export function GlassCard({
  children,
  style,
  padding = 14,
  intensity = 80,
  borderRadius = theme.radius.lg,
}: Props) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      style={[styles.blur, { borderRadius }, style]}
    >
      <View style={[styles.overlay, { padding, borderRadius }]}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.glassDark,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
});
