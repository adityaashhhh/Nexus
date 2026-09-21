import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import Button from '../components/Button';
import RadiusSlider from '../components/RadiusSlider';
import { ApiService } from '../services/api';

export default function PeopleNearbyScreen({ navigation }) {
  const [radiusKm, setRadiusKm] = useState(5);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [radiusKm]);

  const fetchUsers = async () => {
    setLoading(true);
    // TODO: Calls GET /users/nearby?radius={radiusKm}
    const data = await ApiService.getNearbyUsers(radiusKm);
    setUsers(data);
    setLoading(false);
  };

  const handleSendRequest = async (userId) => {
    // Optimistic UI Update
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, relationshipStatus: 'pending_sent' } : u
      )
    );

    // TODO: Calls POST /friend-requests
    await ApiService.sendFriendRequest(userId);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Meet Verified People 👥💖</Text>
        <Text style={styles.subtitle}>
          Ranked by shared cafe interests & vector similarity
        </Text>
      </View>

      {/* Radius Range Slider */}
      <RadiusSlider
        value={radiusKm}
        onValueChange={setRadiusKm}
        label="People Proximity Range"
      />

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : users.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: 30 }}>
          <Text style={{ fontSize: 30 }}>🌸👋</Text>
          <Text style={{ fontWeight: '800', marginTop: 8 }}>No people found in {radiusKm}km</Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
            Try increasing your radius slider!
          </Text>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {users.map((user) => {
            const isRequested = user.relationshipStatus === 'pending_sent';
            const isAccepted = user.relationshipStatus === 'accepted';

            return (
              <Card
                key={user.id}
                style={styles.userCard}
                onPress={() => navigation.navigate('Profile', { user })}
              >
                <View style={styles.cardHeaderRow}>
                  <Avatar
                    uri={user.avatar}
                    size={58}
                    isVerified={user.isVerified}
                  />

                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.distanceTag}>📍 {user.distanceKm}km away</Text>
                    </View>

                    <Text style={styles.currentCafeText}>
                      ☕ At {user.currentCafe}
                    </Text>
                    
                    <Text style={styles.bioText} numberOfLines={2}>
                      {user.bio}
                    </Text>
                  </View>
                </View>

                {/* Shared Interest Vector Chips */}
                <View style={styles.chipsRow}>
                  {user.sharedInterests.map((interest) => (
                    <Chip
                      key={interest}
                      label={`✨ ${interest}`}
                      size="sm"
                      style={{ backgroundColor: Colors.creamBg }}
                    />
                  ))}
                </View>

                {/* Primary Action Button (GATED: No chat entry point until mutual acceptance) */}
                <View style={styles.actionRow}>
                  {isAccepted ? (
                    <Button
                      title="✔ Mutual Friends (Chat in Inbox)"
                      size="sm"
                      variant="mint"
                      onPress={() => navigation.navigate('Friends')}
                      style={{ flex: 1 }}
                    />
                  ) : isRequested ? (
                    <Button
                      title="⏳ Requested"
                      size="sm"
                      variant="ghost"
                      disabled={true}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Button
                      title="💖 Send Friend Request"
                      size="sm"
                      variant="primary"
                      onPress={() => handleSendRequest(user.id)}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </Card>
            );
          })}
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
    marginBottom: 14,
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
  listContainer: {
    gap: 14,
    marginTop: 4,
  },
  userCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  distanceTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  currentCafeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  bioText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.softPinkBg,
    paddingTop: 10,
  },
});
