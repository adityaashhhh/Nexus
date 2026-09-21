import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radii } from '../theme/colors';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import { ApiService } from '../services/api';

export default function FriendsListScreen({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    // TODO: Calls GET /friends
    // Strictly returns ONLY users with status: 'accepted'
    const data = await ApiService.getFriends();
    const mutualOnly = data.filter((f) => f.status === 'accepted');
    setFriends(mutualOnly);
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Mutual Friends 💬💖</Text>
        <Text style={styles.subtitle}>
          1:1 Chat unlocked for verified mutual connections
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : friends.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: 30 }}>
          <Text style={{ fontSize: 32 }}>💌🌸</Text>
          <Text style={{ fontWeight: '800', marginTop: 8, color: Colors.textDark }}>
            No mutual friends yet
          </Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
            Send friend requests in the People tab or accept incoming requests in your Inbox to unlock 1:1 messaging!
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {friends.map((friend) => (
            <Card
              key={friend.id}
              style={styles.friendCard}
              onPress={() => navigation.navigate('Chat', { friend })}
            >
              <Avatar uri={friend.avatar} size={54} isVerified={friend.isVerified} />

              <View style={styles.infoCol}>
                <View style={styles.topRow}>
                  <Text style={styles.nameText}>{friend.name}</Text>
                  <Text style={styles.timeText}>{friend.lastMessageTime}</Text>
                </View>

                <Text style={styles.msgText} numberOfLines={1}>
                  {friend.lastMessage}
                </Text>
              </View>

              {friend.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{friend.unreadCount}</Text>
                </View>
              )}
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 95,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  list: {
    gap: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  infoCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '600',
  },
  msgText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 3,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
