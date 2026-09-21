# Spottr 🎀 — Cute Cafe Discovery & Verified Social Mobile App

A modern, approachable React Native (Expo) mobile application designed with a soft, warm pastel aesthetic (blush pink, cream, lavender, mint) for discovering nearby cafes, making verified friends, and performing anti-impersonation face verification.

---

## 🎨 Visual Style Guide
* **Color Palette**: Blush Pink (`#FF4D6D`, `#FF758F`, `#FFF0F3`), Cream (`#FFFDF9`), Lavender (`#E8E0F8`, `#9D8DF1`), Mint (`#D8F3DC`, `#52B788`), Deep Berry text (`#2B0914`).
* **Geometry**: Soft rounded corners (`16-24px` radius) on all cards, inputs, and buttons.
* **Micro-interactions**: Spring-physics scale on tap, gentle pulse animations.
* **Bottom Navigation**: Floating pill-shaped active-state indicator.

---

## 📱 Screen Breakdown

1. **Onboarding / Splash (`src/screens/SplashScreen.js`)**
   - Pendulum spring physics logo swing (<2.5s) followed by tagline fade-in.
2. **Sign Up Flow (`src/screens/SignUpScreen.js`)**
   - Multi-step progress dots:
     - **Step 1**: Credentials (Email/Phone + Password).
     - **Step 2**: Basic Profile (Name, Username, Bio, Selectable soft-chip tags).
     - **Step 3**: "Verify it's really you" camera capture with circular face-guide overlay and live ArcFace + blink liveness check.
3. **Home / Discover (`src/screens/HomeScreen.js`)**
   - Nearby places within an adjustable radius slider (default 5km).
   - Place cards with photo, name, distance, star rating, and AI "vibe score" gradient badge.
   - Map vs Card List toggle.
4. **People Nearby / Match (`src/screens/PeopleNearbyScreen.js`)**
   - Vector-interest matched nearby verified users.
   - Profile photo with verified badge, shared interest chips, and "Send Friend Request" pill.
   - **Gated**: No chat entry point until mutual acceptance.
5. **Friend Requests Inbox (`src/screens/FriendRequestsScreen.js`)**
   - **Received**: Accept (soft green pill) / Decline (ghost button).
   - **Sent**: Pending status & cancel option.
6. **Friends / Messages List (`src/screens/FriendsListScreen.js`)**
   - Strictly shows **ONLY mutually accepted friends**.
   - Tapping opens 1:1 chat screen.
7. **Chat Screen (`src/screens/ChatScreen.js`)**
   - Soft bubble chat: sender in pastel pink, receiver in cream/white.
   - Rounded input bar with soft send button.
8. **Profile Screen (`src/screens/ProfileScreen.js`)**
   - Verified badge next to name, photo, bio, interests, mutual friends count, and relationship gating.

---

## 🔌 Backend API Contracts (FastAPI)
All endpoints are stubbed in `src/services/api.js`:
* `POST /auth/signup` — User registration.
* `POST /auth/verify-face` — Biometric ArcFace + MediaPipe liveness verification.
* `GET /places/nearby?radius=` — Spatial cafe query with NLP vibe scores.
* `GET /users/nearby?radius=` — Interest-vector similarity user discovery.
* `POST /friend-requests` — Send request.
* `POST /friend-requests/:id/accept` — Accept request.
* `GET /friends` — Returns mutually accepted connections.
* `GET /messages/:friendId` & `POST /messages/:friendId` — 1:1 direct messaging.

---

## 🚀 Running the Expo App

```bash
cd spottr_mobile
npm install
npx expo start
```
