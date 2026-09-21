import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Colors, Radii, Shadows } from '../theme/colors';

export default function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'mint' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  icon = null,
  style,
  textStyle,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          styles[size],
          styles[variant],
          disabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} size="small" />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.textBase,
                styles[`text_${size}`],
                styles[`text_${variant}`],
                disabled && styles.textDisabled,
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Sizes
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  md: {
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  // Variants
  primary: {
    backgroundColor: Colors.primary,
    ...Shadows.button,
  },
  secondary: {
    backgroundColor: Colors.softPinkBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  mint: {
    backgroundColor: Colors.mint,
    borderWidth: 1,
    borderColor: Colors.mintDark,
  },
  danger: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  disabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Text
  textBase: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  text_sm: {
    fontSize: 12,
  },
  text_md: {
    fontSize: 14,
  },
  text_lg: {
    fontSize: 16,
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: Colors.primary,
  },
  text_ghost: {
    color: Colors.textMuted,
  },
  text_mint: {
    color: '#155E38',
  },
  text_danger: {
    color: '#DC2626',
  },
  textDisabled: {
    color: '#9CA3AF',
  },
});
