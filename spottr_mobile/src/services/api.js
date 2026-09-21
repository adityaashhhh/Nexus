/**
 * Spottr API Client & Backend Service Layer
 * Connects to the FastAPI backend (or provides graceful local fallback mocks).
 */

const BASE_URL = 'http://localhost:8000';
const FACE_SERVICE_URL = 'http://localhost:8002';

export const ApiService = {
  /**
   * POST /auth/signup
   * TODO: Connects to FastAPI endpoint `POST /auth/register`
   * Request body: { email, password, username, bio, interests }
   */
  async signup(userData) {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          username: userData.username,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.log('[API] Using local signup mock:', e.message);
    }

    // Fallback Mock Response
    return {
      id: 1,
      username: userData.username,
      email: userData.email,
      bio: userData.bio,
      verification_status: 'UNVERIFIED',
      access_token: 'mock_jwt_token_' + Date.now(),
    };
  },

  /**
   * POST /auth/verify-face
   * TODO: Sends captured selfie frames + signup profile photo to the Face Verification service
   * Performs ArcFace 512-D cosine similarity and MediaPipe 3D Eye Aspect Ratio blink liveness check.
   */
  async verifyFace(photoBlobOrUri, selfieBlobOrUri) {
    try {
      const formData = new FormData();
      formData.append('profile_photos', {
        uri: photoBlobOrUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
      formData.append('selfie_frames', {
        uri: selfieBlobOrUri,
        type: 'image/jpeg',
        name: 'frame1.jpg',
      });

      const response = await fetch(`${FACE_SERVICE_URL}/verify/profile`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.log('[API] Using local face verification simulation:', e.message);
    }

    // Fallback Mock Response
    return {
      verified: true,
      liveness_passed: true,
      max_similarity_score: 0.884,
      threshold: 0.23,
    };
  },

  /**
   * GET /places/nearby?radius={radius}&latitude={lat}&longitude={lon}
   * TODO: Fetches nearby cafes ranked by distance and DistilBERT NLP vibe score.
   */
  async getNearbyPlaces(radiusKm = 5, lat = 12.9716, lon = 77.5946) {
    try {
      const radiusMeters = radiusKm * 1000;
      const response = await fetch(
        `${BASE_URL}/places/nearby?latitude=${lat}&longitude=${lon}&radius_meters=${radiusMeters}`
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.log('[API] Using local places mock:', e.message);
    }

    // Fallback Mock Places Dataset
    return [
      {
        id: 1,
        name: 'Third Wave Cyber Coffee ☕',
        category: 'work',
        categoryLabel: 'Quiet Co-Work 💻',
        distance_meters: 320,
        average_rating: 4.9,
        vibe_score: 9.8,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=500&q=80',
        tags: ['#1GbpsWifi', '#QuietNook', '#MatchaLatte', '#PowerSockets'],
        peopleCount: 4,
      },
      {
        id: 2,
        name: 'Matcha & Bloom Bakery 🍵🌸',
        category: 'matcha',
        categoryLabel: 'Matcha & Pastry 🍵',
        distance_meters: 750,
        average_rating: 4.8,
        vibe_score: 9.6,
        image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=500&q=80',
        tags: ['#CeremonialMatcha', '#FluffyPancakes', '#PastelVibes', '#PinkDecor'],
        peopleCount: 2,
      },
      {
        id: 3,
        name: 'Meow & Mocha Cat Cafe 🐱☕',
        category: 'cat',
        categoryLabel: 'Cat Cafes 🐱',
        distance_meters: 1200,
        average_rating: 4.9,
        vibe_score: 9.9,
        image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=500&q=80',
        tags: ['#FriendlyCats', '#CatCuddles', '#IcedLatte', '#CutePlushies'],
        peopleCount: 5,
      },
      {
        id: 4,
        name: 'Pink Lotus Rooftop Cafe 🌸🍹',
        category: 'aesthetic',
        categoryLabel: 'Aesthetic 🌸',
        distance_meters: 2100,
        average_rating: 4.7,
        vibe_score: 9.4,
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=500&q=80',
        tags: ['#SunsetView', '#FlowerWalls', '#StrawberryTart', '#OutdoorSeating'],
        peopleCount: 3,
      },
      {
        id: 5,
        name: 'The Lo-Fi Book Nook 📚🎧',
        category: 'work',
        categoryLabel: 'Quiet Co-Work 💻',
        distance_meters: 3400,
        average_rating: 4.8,
        vibe_score: 9.5,
        image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=500&q=80',
        tags: ['#SilentZone', '#Bookshelves', '#PourOver', '#CozySofas'],
        peopleCount: 1,
      },
    ];
  },

  /**
   * GET /users/nearby?radius={radius}
   * TODO: Fetches nearby verified users based on interest-vector similarity.
   */
  async getNearbyUsers(radiusKm = 5) {
    try {
      const response = await fetch(`${BASE_URL}/users/nearby?radius=${radiusKm}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.log('[API] Using local nearby users mock');
    }

    return [
      {
        id: 101,
        name: 'Kriso ☕',
        distanceKm: 0.4,
        isVerified: true,
        currentCafe: 'Third Wave Cyber Coffee',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        bio: 'Building backend microservices & drinking double espressos.',
        sharedInterests: ['Specialty Coffee', 'Coding', 'Quiet Work'],
        relationshipStatus: 'none', // 'none' | 'pending_sent' | 'pending_received' | 'accepted'
      },
      {
        id: 102,
        name: 'Priya 🌸',
        distanceKm: 0.8,
        isVerified: true,
        currentCafe: 'Matcha & Bloom Bakery',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        bio: 'UI designer & matcha lover. Searching for cute cafes with natural light!',
        sharedInterests: ['Matcha Latte', 'Aesthetic Cafes', 'Design'],
        relationshipStatus: 'accepted', // Mutually accepted friend
      },
      {
        id: 103,
        name: 'Elena ✨',
        distanceKm: 1.5,
        isVerified: true,
        currentCafe: 'Meow & Mocha Cat Cafe',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
        bio: 'AI researcher hanging out with cats and reading papers.',
        sharedInterests: ['Cat Cafes', 'Lo-Fi Music', 'AI Research'],
        relationshipStatus: 'pending_received', // In inbox
      },
      {
        id: 104,
        name: 'Aarav 🚀',
        distanceKm: 2.8,
        isVerified: true,
        currentCafe: 'The Lo-Fi Book Nook',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
        bio: 'Founder working on spatial audio apps. Up for a coffee chat!',
        sharedInterests: ['Startups', 'Specialty Coffee', 'Co-Working'],
        relationshipStatus: 'pending_sent', // Requested state
      },
      {
        id: 105,
        name: 'Maya 🍓',
        distanceKm: 4.2,
        isVerified: true,
        currentCafe: 'Strawberry Dream Dessert Bar',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        bio: 'Food photographer & pastry enthusiast. Come say hi!',
        sharedInterests: ['Croissants', 'Pastel Vibes', 'Photography'],
        relationshipStatus: 'accepted', // Mutually accepted friend
      },
    ];
  },

  /**
   * POST /friend-requests
   * TODO: Send friend request to a user
   */
  async sendFriendRequest(userId) {
    try {
      const response = await fetch(`${BASE_URL}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: userId }),
      });
      if (response.ok) return await response.json();
    } catch (e) {
      console.log('[API] Send friend request mock');
    }
    return { success: true, status: 'pending_sent' };
  },

  /**
   * POST /friend-requests/:id/accept
   * TODO: Accept incoming friend request
   */
  async acceptFriendRequest(requestId) {
    try {
      const response = await fetch(`${BASE_URL}/friend-requests/${requestId}/accept`, {
        method: 'POST',
      });
      if (response.ok) return await response.json();
    } catch (e) {
      console.log('[API] Accept friend request mock');
    }
    return { success: true, status: 'accepted' };
  },

  /**
   * GET /friends
   * TODO: Returns ONLY mutually accepted friends
   */
  async getFriends() {
    try {
      const response = await fetch(`${BASE_URL}/friends`);
      if (response.ok) return await response.json();
    } catch (e) {
      console.log('[API] Get friends mock');
    }

    return [
      {
        id: 102,
        name: 'Priya 🌸',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        isVerified: true,
        lastMessage: 'Are you still at the matcha cafe? 🍵',
        lastMessageTime: '10m ago',
        unreadCount: 1,
        status: 'accepted',
      },
      {
        id: 105,
        name: 'Maya 🍓',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        isVerified: true,
        lastMessage: 'The strawberry croissants just came out of the oven! 🥐',
        lastMessageTime: '1h ago',
        unreadCount: 0,
        status: 'accepted',
      },
    ];
  },

  /**
   * GET /messages/:friendId & POST /messages/:friendId
   * TODO: 1:1 Chat messages for mutually accepted friends
   */
  async getMessages(friendId) {
    return [
      { id: 1, sender: 'friend', text: 'Hey there! Saw you checked into Third Wave! ☕', time: '10:42 AM' },
      { id: 2, sender: 'me', text: 'Yes! Working on my cute app project right now 💻✨', time: '10:44 AM' },
      { id: 3, sender: 'friend', text: 'Are you trying the iced matcha latte today? 🍵', time: '10:45 AM' },
    ];
  },

  async sendMessage(friendId, text) {
    return {
      id: Date.now(),
      sender: 'me',
      text,
      time: 'Just now',
    };
  },
};
