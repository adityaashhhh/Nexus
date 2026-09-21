import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Radii } from '../theme/colors';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import { ApiService } from '../services/api';

export default function FriendRequestsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'

  const [receivedRequests, setReceivedRequests] = useState([
    {
      id: 201,
      name: 'Elena ✨',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
      isVerified: true,
      mutualInterests: 'Shared: #CatCafes, #LoFiBooks',
      timeAgo: '20m ago',
    },
    {
      id: 202,
      name: 'Sam Chen ☕',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      isVerified: true,
      mutualInterests: 'Shared: #SpecialtyCoffee, #Coding',
      timeAgo: '2h ago',
    },
  ]);

  const [sentRequests, setSentRequests] = useState([
    {
      id: 301,
      name: 'Aarav 🚀',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      isVerified: true,
      status: 'Pending response...',
      timeAgo: '1d ago',
    },
  ]);

  const handleAccept = async (reqId) => {
    // Optimistic UI Update
    setReceivedRequests(receivedRequests.filter((r) => r.id !== reqId));
    // TODO: Calls POST /friend-requests/:id/accept
    await ApiService.acceptFriendRequest(reqId);
    alert('💖 Mutual friend accepted! You can now chat in your Inbox.');
  };

  const handleDecline = (reqId) => {
    setReceivedRequests(receivedRequests.filter((r) => r.id !== reqId));
  };

  const handleCancelSent = (reqId) => {
    setSentRequests(sentRequests.filter((r) => r.id !== reqId));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friend Requests 💌</Text>
        <Text style={styles.subtitle}>Manage incoming & sent connection requests</Text>
      </View>

      {/* Tabs Selector */}
      <View style={styles.tabsWrapper}>
        <TouchableOpacity
          onPress={() => setActiveTab('received')}
          style={[styles.tabPill, activeTab === 'received' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Received ({receivedRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('sent')}
          style={[styles.tabPill, activeTab === 'sent' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            Sent ({sentRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* RECEIVED TAB */}
      {activeTab === 'received' && (
        <View style={styles.list}>
          {receivedRequests.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 30 }}>
              <Text style={{ fontSize: 28 }}>💌🌸</Text>
              <Text style={{ fontWeight: '800', marginTop: 6 }}>No pending received requests</Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                Check into nearby cafes to meet more people!
              </Text>
            </Card>
          ) : (
            receivedRequests.map((req) => (
              <Card key={req.id} style={styles.reqCard}>
                <View style={styles.cardTopRow}>
                  <Avatar uri={req.avatar} size={50} isVerified={req.isVerified} />
                  <View style={styles.infoCol}>
                    <Text style={styles.nameText}>{req.name}</Text>
                    <Text style={styles.mutualText}>{req.mutualInterests}</Text>
                    <Text style={styles.timeText}>{req.timeAgo}</Text>
                  </View>
                </View>

                {/* Accept (soft green) / Decline (ghost) */}
                <View style={styles.btnRow}>
                  <Button
                    title="Decline"
                    variant="ghost"
                    size="sm"
                    onPress={() => handleDecline(req.id)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Accept 💖"
                    variant="mint"
                    size="sm"
                    onPress={() => handleAccept(req.id)}
                    style={{ flex: 1.5 }}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {/* SENT TAB */}
      {activeTab === 'sent' && (
        <View style={styles.list}>
          {sentRequests.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 30 }}>
              <Text style={{ fontSize: 28 }}>🚀🌸</Text>
              <Text style={{ fontWeight: '800', marginTop: 6 }}>No pending sent requests</Text>
            </Card>
          ) : (
            sentRequests.map((req) => (
              <Card key={req.id} style={styles.reqCard}>
                <View style={styles.cardTopRow}>
                  <Avatar uri={req.avatar} size={50} isVerified={req.isVerified} />
                  <View style={styles.infoCol}>
                    <Text style={styles.nameText}>{req.name}</Text>
                    <Text style={styles.mutualText}>⏳ {req.status}</Text>
                    <Text style={styles.timeText}>{req.timeAgo}</Text>
                  </View>
                </View>

                <View style={styles.btnRow}>
                  <Button
                    title="Cancel Request"
                    variant="ghost"
                    size="sm"
                    onPress={() => handleCancelSent(req.id)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))
          )}
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
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.softPinkBg,
    borderRadius: Radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radii.pill,
  },
  tabPillActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  list: {
    gap: 12,
  },
  reqCard: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  mutualText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.softPinkBg,
    paddingTop: 10,
  },
});
