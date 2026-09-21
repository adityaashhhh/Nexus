import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { Colors, Shadows } from '../theme/colors';

export default function Avatar({
  uri,
  size = 56,
  isVerified = false,
  showBorder = true,
  style,
}) {
  const badgeSize = Math.max(16, Math.floor(size * 0.32));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={{ uri: uri || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
          showBorder && styles.border,
        ]}
      />
      {isVerified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: -2,
              right: -2,
            },
          ]}
        >
          <Text style={[styles.verifiedText, { fontSize: badgeSize * 0.55 }]}>✔</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.softPinkBg,
  },
  border: {
    borderWidth: 2.5,
    borderColor: Colors.blushPink,
  },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...Shadows.soft,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
