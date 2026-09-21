import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '../theme/colors';

export default function Chip({
  label,
  selected = false,
  onPress = null,
  size = 'md', // 'sm' | 'md'
  icon = null,
  style,
  textStyle,
}) {
  const Component = onPress ? TouchableOpacity : TouchableOpacity;

  return (
    <Component
      activeOpacity={0.75}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.base,
        styles[size],
        selected ? styles.selected : styles.unselected,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.text,
          styles[`text_${size}`],
          selected ? styles.textSelected : styles.textUnselected,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Component>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.pill,
    gap: 4,
  },
  sm: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  md: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  unselected: {
    backgroundColor: Colors.softPinkBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selected: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  text: {
    fontWeight: '700',
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 13,
  },
  textUnselected: {
    color: Colors.textDark,
  },
  textSelected: {
    color: '#FFFFFF',
  },
});
