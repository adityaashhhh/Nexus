import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Radii } from '../theme/colors';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import Button from '../components/Button';

export default function ProfileScreen({ route, navigation }) {
  // If route params has user, we're viewing someone else's profile; otherwise our own
  const targetUser = route?.params?.user;
  const isOwnProfile = !targetUser;

  const profileData = targetUser || {
    id: 1,
    name: 'Hana Tanaka 🌸',
    username: 'hana_cute',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    isVerified: true,
    bio: 'Building cute apps & sipping iced matcha lattes at aesthetic cafes 🌸',
    currentCafe: 'Third Wave Cyber Coffee',
    interests: ['#MatchaLatte', '#QuietWork', '#CatCafes', '#SpecialtyCoffee'],
    mutualFriendsCount: 4,
    relationshipStatus: 'accepted',
  };

  const isMutualFriend = profileData.relationshipStatus === 'accepted';
  const isPending = profileData.relationshipStatus === 'pending_sent';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Top Header */}
      <View style={styles.header}>
        {!isOwnProfile && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'My Spottr Passport 🎀' : `${profileData.name.split(' ')[0]}'s Profile`}
        </Text>
      </View>

      {/* Main Profile Card */}
      <Card style={styles.profileCard}>
        <Avatar uri={profileData.avatar} size={90} isVerified={profileData.isVerified} />

        {/* Name & Verified Badge */}
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>{profileData.name}</Text>
          {profileData.isVerified && (
            <View style={styles.verifiedShield}>
              <Text style={styles.verifiedShieldText}>✔ VERIFIED</Text>
            </View>
          )}
        </View>

        <Text style={styles.usernameText}>@{profileData.username || 'user'}</Text>

        <Text style={styles.bioText}>{profileData.bio}</Text>

        {/* Checked-In Cafe Box */}
        {profileData.currentCafe && (
          <View style={styles.checkinBox}>
            <Text style={styles.checkinLabel}>Current Checked-in Location:</Text>
            <Text style={styles.checkinValue}>☕ {profileData.currentCafe}</Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Cafes Visited</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.mutualFriendsCount || 4}</Text>
            <Text style={styles.statLabel}>Mutual Friends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>9.8</Text>
            <Text style={styles.statLabel}>Vibe Level</Text>
          </View>
        </View>
      </Card>

      {/* Favorite Interests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Cafe Vibes 💖</Text>
        <View style={styles.chipsRow}>
          {(profileData.interests || ['#MatchaLatte', '#CatCafes', '#QuietWork']).map((tag) => (
            <Chip key={tag} label={tag} style={{ backgroundColor: Colors.white }} />
          ))}
        </View>
      </View>

      {/* Action Buttons (Strict Messaging Gating) */}
      <View style={styles.actionSection}>
        {isOwnProfile ? (
          <Button
            title="Edit Spottr Passport ✏️"
            variant="secondary"
            onPress={() => alert('Profile edit mode')}
          />
        ) : isMutualFriend ? (
          <Button
            title="💬 Message (Mutual Friend)"
            variant="primary"
            onPress={() => navigation.navigate('Chat', { friend: profileData })}
          />
        ) : isPending ? (
          <Button
            title="⏳ Friend Request Sent"
            variant="ghost"
            disabled={true}
          />
        ) : (
          <Button
            title="💖 Send Friend Request"
            variant="primary"
            onPress={() => alert('Friend request sent!')}
          />
        )}
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textDark,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textDark,
  },
  profileCard: {
    alignItems: 'center',
    padding: 22,
    marginBottom: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
  },
  verifiedShield: {
    backgroundColor: Colors.softPinkBg,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  verifiedShieldText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.primary,
  },
  usernameText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '700',
    marginTop: 2,
  },
  bioText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  checkinBox: {
    backgroundColor: Colors.softPinkBg,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkinLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  checkinValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 16,
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textDark,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionSection: {
    marginTop: 8,
  },
});
