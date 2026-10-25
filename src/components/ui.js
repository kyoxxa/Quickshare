import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

export const colors = { bg: '#0B1020', card: '#151C33', accent: '#6C8CFF', text: '#F2F5FF', muted: '#8A94B8', ok: '#3DDC97' };

export function Button({ title, onPress, disabled, variant = 'primary' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.ghost,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.buttonText, variant === 'ghost' && { color: colors.accent }]}>{title}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value = 0 }) {
  const pct = Math.round(value * 100);
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ now: pct }}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', marginVertical: 6 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  track: { height: 8, backgroundColor: colors.card, borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  fill: { height: '100%', backgroundColor: colors.ok },
});
