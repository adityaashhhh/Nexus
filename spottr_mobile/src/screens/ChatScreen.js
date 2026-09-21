import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Radii, Shadows } from '../theme/colors';
import Avatar from '../components/Avatar';
import { ApiService } from '../services/api';

export default function ChatScreen({ route, navigation }) {
  const friend = route?.params?.friend || {
    id: 102,
    name: 'Priya 🌸',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    isVerified: true,
  };

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    // TODO: Calls GET /messages/:friendId
    const data = await ApiService.getMessages(friend.id);
    setMessages(data);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: inputText.trim(),
      time: 'Just now',
    };

    setMessages([...messages, newMsg]);
    setInputText('');

    // TODO: Calls POST /messages/:friendId
    await ApiService.sendMessage(friend.id, newMsg.text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        <Avatar uri={friend.avatar} size={42} isVerified={friend.isVerified} />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{friend.name}</Text>
          <Text style={styles.headerStatus}>✨ Mutual Friend</Text>
        </View>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.encryptedBanner}>
          <Text style={styles.encryptedText}>
            🔒 1:1 Verified Chat Active • Anti-Impersonation Guaranteed
          </Text>
        </View>

        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleRow,
                isMe ? styles.bubbleRowMe : styles.bubbleRowFriend,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isMe ? styles.bubbleMe : styles.bubbleFriend,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isMe ? styles.bubbleTextMe : styles.bubbleTextFriend,
                  ]}
                >
                  {msg.text}
                </Text>
                <Text
                  style={[
                    styles.timeText,
                    isMe ? styles.timeTextMe : styles.timeTextFriend,
                  ]}
                >
                  {msg.time}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Rounded Pastel Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Send a sweet message... ☕✨"
          placeholderTextColor={Colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          style={styles.sendButton}
        >
          <Text style={styles.sendIcon}>💖</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textDark,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  headerStatus: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 18,
    gap: 12,
  },
  encryptedBanner: {
    backgroundColor: Colors.softPinkBg,
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  encryptedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  bubbleRow: {
    flexDirection: 'row',
    width: '100%',
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleRowFriend: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radii.lg,
    ...Shadows.soft,
  },
  // Sender Bubble (Pastel Accent Color)
  bubbleMe: {
    backgroundColor: Colors.pastelPink,
    borderBottomRightRadius: 4,
  },
  // Receiver Bubble (Cream / White)
  bubbleFriend: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextMe: {
    color: Colors.textDark,
    fontWeight: '600',
  },
  bubbleTextFriend: {
    color: Colors.textDark,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: Colors.primary,
  },
  timeTextFriend: {
    color: Colors.textLight,
  },
  // Rounded Input Bar
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.softPinkBg,
    borderRadius: Radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 13,
    color: Colors.textDark,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  sendIcon: {
    fontSize: 18,
  },
});
