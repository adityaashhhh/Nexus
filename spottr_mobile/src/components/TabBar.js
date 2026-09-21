import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radii, Shadows } from '../theme/colors';

export default function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let icon = '☕';
          let label = 'Discover';
          if (route.name === 'Home') {
            icon = '☕';
            label = 'Cafes';
          } else if (route.name === 'People') {
            icon = '👥';
            label = 'People';
          } else if (route.name === 'Requests') {
            icon = '💌';
            label = 'Requests';
          } else if (route.name === 'Friends') {
            icon = '💬';
            label = 'Chats';
          } else if (route.name === 'Profile') {
            icon = '🎀';
            label = 'Profile';
          }

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              style={[styles.tabBtn, isFocused && styles.tabBtnFocused]}
            >
              <Text style={[styles.tabIcon, isFocused && styles.tabIconFocused]}>{icon}</Text>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.card,
    width: '100%',
    justifyContent: 'space-around',
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnFocused: {
    backgroundColor: Colors.softPinkBg,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabLabelFocused: {
    color: Colors.primary,
  },
});
