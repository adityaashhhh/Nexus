import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radii } from '../theme/colors';

export default function RadiusSlider({
  value = 5,
  min = 1,
  max = 20,
  step = 1,
  onValueChange,
  label = 'Search Radius',
}) {
  const steps = [1, 3, 5, 10, 15, 20];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>📍 {label}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{value} km</Text>
        </View>
      </View>

      {/* Cute Discrete Step Buttons for Smooth Mobile Interaction */}
      <View style={styles.stepsRow}>
        {steps.map((s) => {
          const isSelected = value === s;
          return (
            <TouchableOpacity
              key={s}
              activeOpacity={0.75}
              onPress={() => onValueChange && onValueChange(s)}
              style={[styles.stepBtn, isSelected && styles.stepBtnSelected]}
            >
              <Text style={[styles.stepText, isSelected && styles.stepTextSelected]}>
                {s}km
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  badge: {
    backgroundColor: Colors.softPinkBg,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  stepBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: Colors.softPinkBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  stepTextSelected: {
    color: '#FFFFFF',
  },
});
