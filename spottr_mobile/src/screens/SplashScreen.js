import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../theme/colors';

export default function SplashScreen({ navigation }) {
  const swingAnim = useRef(new Animated.Value(-1)).current; // Pendulum swing
  const fadeTagline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Pendulum Swing Animation with Spring Physics (< 2.5s)
    Animated.spring(swingAnim, {
      toValue: 0,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      // 2. Tagline Fades In
      Animated.timing(fadeTagline, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // 3. Navigate to Sign Up / Main App after 2.2s total
        setTimeout(() => {
          navigation.replace('SignUp');
        }, 800);
      });
    });
  }, []);

  const rotateInterpolate = swingAnim.interpolate({
    inputRange: [-1, -0.5, 0],
    outputRange: ['-35deg', '15deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.centerBox}>
        {/* Animated Pendulum Logo */}
        <Animated.View
          style={[
            styles.logoWrapper,
            { transform: [{ rotate: rotateInterpolate }] },
          ]}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>💖</Text>
          </View>
        </Animated.View>

        <Text style={styles.brandTitle}>Spottr</Text>

        {/* Tagline Fade In */}
        <Animated.Text style={[styles.tagline, { opacity: fadeTagline }]}>
          Find cozy cafes & meet real, verified cuties ☕✨
        </Animated.Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AI LOCATION DISCOVERY // v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softPinkBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerBox: {
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 16,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 42,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.textDark,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.blushPink,
    letterSpacing: 1.5,
  },
});
