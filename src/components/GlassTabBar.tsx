import React from 'react';
import { BlurView } from 'expo-blur';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';

const TAB_META: Record<string, { active: string; inactive: string; label: string }> = {
  index:   { active: 'map',       inactive: 'map-outline',       label: 'Карта' },
  history: { active: 'time',      inactive: 'time-outline',      label: 'История' },
  stats:   { active: 'bar-chart', inactive: 'bar-chart-outline', label: 'Статистика' },
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <BlurView intensity={80} tint="dark" style={styles.blur}>
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            active: 'ellipse',
            inactive: 'ellipse-outline',
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            } as any);
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {isFocused && <View style={styles.dot} />}
              <Ionicons
                name={(isFocused ? meta.active : meta.inactive) as any}
                size={22}
                color={isFocused ? theme.colors.accent : theme.colors.textMuted}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  overlay: {
    backgroundColor: theme.colors.glassDark,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  labelActive: {
    color: theme.colors.accent,
  },
});
