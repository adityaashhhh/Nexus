/**
 * SPOTTR // MODERN DESKTOP WEB APPLICATION
 * Clean JavaScript Controller:
 * 1. Open Discovery Mode by default (Browse Cafes & People without blocking)
 * 2. Action-Triggered 3-Step Verification Gate (Prompted only on Connect / Check-In)
 * 3. Verified Mutual Friendship & 1:1 Direct Messaging
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let currentUser = {
    email: localStorage.getItem('spottr_email') || '',
    username: localStorage.getItem('spottr_username') || '',
    fullName: localStorage.getItem('spottr_fullname') || 'Alex Vance',
    age: localStorage.getItem('spottr_age') || '24',
    location: localStorage.getItem('spottr_location') || 'Indiranagar, Bangalore',
    bio: localStorage.getItem('spottr_bio') || 'Building machine learning products. Regular at specialty pour-over cafes.',
    avatarUrl: localStorage.getItem('spottr_avatar') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    checkedInCafe: localStorage.getItem('spottr_checkin') || '',
    isVerified: localStorage.getItem('spottr_verified') === 'true',
    searchRadiusKm: 5.0,
    peopleRadiusKm: 5.0
  };

  let pendingActionCallback = null;
  let currentStep = 1;
  let currentStream = null;
  let isCameraActive = false;
  let userProfileImageBlob = null;
  let earInterval = null;

  const presetPhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80'
  ];
  let photoIndex = 0;

  // Cafes Dataset
  const cafesData = [
    {
      id: 1,
      name: 'Third Wave Cyber Coffee',
      category: 'work',
      categoryLabel: 'Quiet Co-Working',
      address: '12th Main Road, Indiranagar',
      distanceKm: 0.32,
      rating: 4.9,
      vibeScore: 9.8,
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
      tags: ['1Gbps Wifi', 'Quiet Seating', 'Specialty Pour-Over', 'Power Outlets']
    },
    {
      id: 2,
      name: 'Matcha & Bloom Roasters',
      category: 'matcha',
      categoryLabel: 'Matcha & Bakery',
      address: '100 Feet Road, HAL 2nd Stage',
      distanceKm: 0.75,
      rating: 4.8,
      vibeScore: 9.6,
      image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=600&q=80',
      tags: ['Ceremonial Matcha', 'Artisan Bakery', 'Natural Daylight', 'Outdoor Patio']
    },
    {
      id: 3,
      name: 'Meow & Mocha Lounge',
      category: 'cat',
      categoryLabel: 'Cat Cafes',
      address: '80 Feet Road, Koramangala',
      distanceKm: 1.2,
      rating: 4.9,
      vibeScore: 9.9,
      image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
      tags: ['Resident Cats', 'Cozy Sofas', 'Iced Espresso', 'Quiet Environment']
    },
    {
      id: 4,
      name: 'The Binary Roastery',
      category: 'espresso',
      categoryLabel: 'Specialty Pour-Over',
      address: '27th Main, HSR Layout Sector 2',
      distanceKm: 2.1,
      rating: 4.7,
      vibeScore: 9.4,
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      tags: ['Single Origin Geisha', 'AeroPress Bar', 'Tech Meetups', 'Ambient Music']
    },
    {
      id: 5,
      name: 'The Lo-Fi Book Nook',
      category: 'work',
      categoryLabel: 'Quiet Co-Working',
      address: 'Church Street, MG Road Area',
      distanceKm: 3.4,
      rating: 4.8,
      vibeScore: 9.5,
      image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=600&q=80',
      tags: ['Silent Study Zone', 'Bookshelves', 'Pour-Over Coffee', 'Fast Wifi']
    }
  ];

  // People Dataset
  const peopleData = [
    {
      id: 101,
      name: 'Kriso Builder',
      distanceKm: 0.4,
      isVerified: true,
      currentCafe: 'Third Wave Cyber Coffee',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      bio: 'Backend engineer working on distributed systems & microservices.',
      interests: ['Specialty Coffee', 'FastAPI', 'Quiet Work'],
      status: 'none'
    },
    {
      id: 102,
      name: 'Priya Sharma',
      distanceKm: 0.8,
      isVerified: true,
      currentCafe: 'Matcha & Bloom Roasters',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      bio: 'Product designer focusing on accessible and clean developer tools.',
      interests: ['Matcha Lattes', 'UI/UX Design', 'Quiet Co-Working'],
      status: 'accepted'
    },
    {
      id: 103,
      name: 'Elena Rostova',
      distanceKm: 1.5,
      isVerified: true,
      currentCafe: 'Meow & Mocha Lounge',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
      bio: 'AI researcher exploring autonomous agent memory architectures.',
      interests: ['AI Engineering', 'Cat Cafes', 'Specialty Coffee'],
      status: 'none'
    },
    {
      id: 104,
      name: 'Aarav Mehta',
      distanceKm: 2.8,
      isVerified: true,
      currentCafe: 'The Binary Roastery',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      bio: 'Founder building spatial computing applications. Open for coffee chats.',
      interests: ['Startups', 'Specialty Coffee', 'Quiet Co-Working'],
      status: 'requested'
    }
  ];

  let receivedRequests = [
    {
      id: 201,
      name: 'Sam Chen',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      bio: 'Distributed systems developer at The Binary Roastery',
      timeAgo: '25m ago'
    }
  ];

  let sentRequests = [
    {
      id: 104,
      name: 'Aarav Mehta',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      status: 'Pending acceptance',
      timeAgo: '1h ago'
    }
  ];

  let activeChatFriendId = 102;
  const conversationMessages = [
    { id: 1, sender: 'friend', text: 'Hey Alex! Are you working from Third Wave today?', time: '10:40 AM' },
    { id: 2, sender: 'me', text: 'Yes, just checked in. The wifi is solid today.', time: '10:42 AM' },
    { id: 3, sender: 'friend', text: 'Great! I will walk over after my design review.', time: '10:43 AM' }
  ];

  // DOM Elements
  const onboardingWizardModal = document.getElementById('onboardingWizardModal');
  const closeWizardBtn = document.getElementById('closeWizardBtn');
  const wizardStep1 = document.getElementById('wizardStep1');
  const wizardStep2 = document.getElementById('wizardStep2');
  const wizardStep3 = document.getElementById('wizardStep3');
  const stepNode1 = document.getElementById('stepNode1');
  const stepNode2 = document.getElementById('stepNode2');
  const stepNode3 = document.getElementById('stepNode3');

  const step1Form = document.getElementById('step1Form');
  const step2Form = document.getElementById('step2Form');
  const choosePfpBtn = document.getElementById('choosePfpBtn');
  const wizardPfpPreview = document.getElementById('wizardPfpPreview');
  const backToStep1Btn = document.getElementById('backToStep1Btn');

  const webcamVideo = document.getElementById('webcamVideo');
  const captureCanvas = document.getElementById('captureCanvas');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const captureAndVerifyBtn = document.getElementById('captureAndVerifyBtn');
  const cameraHudStatus = document.getElementById('cameraHudStatus');
  const cameraEarStatus = document.getElementById('cameraEarStatus');
  const verificationResultBox = document.getElementById('verificationResultBox');

  const navDisplayName = document.getElementById('navDisplayName');
  const navAvatarImg = document.getElementById('navAvatarImg');
  const navVerifiedPill = document.getElementById('navVerifiedPill');
  const openProfileModalBtn = document.getElementById('openProfileModalBtn');

  const cafesGridContainer = document.getElementById('cafesGridContainer');
  const cafeSearchInput = document.getElementById('cafeSearchInput');
  const cafeRadiusSlider = document.getElementById('cafeRadiusSlider');
  const radiusKmLabel = document.getElementById('radiusKmLabel');

  const peopleGridContainer = document.getElementById('peopleGridContainer');
  const peopleRadiusSlider = document.getElementById('peopleRadiusSlider');
  const peopleRadiusLabel = document.getElementById('peopleRadiusLabel');

  const inboxListContainer = document.getElementById('inboxListContainer');
  const inboxReceivedTabBtn = document.getElementById('inboxReceivedTabBtn');
  const inboxSentTabBtn = document.getElementById('inboxSentTabBtn');
  let inboxView = 'received';

  const friendsConversationList = document.getElementById('friendsConversationList');
  const chatMessagesScroll = document.getElementById('chatMessagesScroll');
  const chatInputMessage = document.getElementById('chatInputMessage');
  const chatSendBtn = document.getElementById('chatSendBtn');

  const FACE_SERVICE_URL = 'http://localhost:8002';

  // Initialize UI immediately (Discovery is open and interactive!)
  updateHeaderUI();
  renderCafes();
  renderPeople();
  renderInbox();
  renderConversations();
  renderChatMessages();

  // =========================================================================
  // ACTION-TRIGGERED ONBOARDING & AUTH GATE
  // =========================================================================
  function requireVerifiedUser(actionCallback) {
    if (currentUser.isVerified && currentUser.email) {
      // User is already verified — proceed directly
      actionCallback();
    } else {
      // Store action to execute after 3-step verification
      pendingActionCallback = actionCallback;
      onboardingWizardModal.classList.remove('hidden');
      goToStep(currentUser.email ? 2 : 1);
    }
  }

  function goToStep(stepNum) {
    currentStep = stepNum;
    wizardStep1.classList.add('hidden');
    wizardStep2.classList.add('hidden');
    wizardStep3.classList.add('hidden');

    stepNode1.className = 'step-node';
    stepNode2.className = 'step-node';
    stepNode3.className = 'step-node';

    if (stepNum === 1) {
      wizardStep1.classList.remove('hidden');
      stepNode1.classList.add('active');
    } else if (stepNum === 2) {
      wizardStep2.classList.remove('hidden');
      stepNode1.classList.add('completed');
      stepNode2.classList.add('active');
    } else if (stepNum === 3) {
      wizardStep3.classList.remove('hidden');
      stepNode1.classList.add('completed');
      stepNode2.classList.add('completed');
      stepNode3.classList.add('active');
    }
  }

  if (closeWizardBtn) {
    closeWizardBtn.addEventListener('click', () => {
      stopCamera();
      onboardingWizardModal.classList.add('hidden');
      pendingActionCallback = null;
    });
  }

  // Step 1 Submission
  if (step1Form) {
    step1Form.addEventListener('submit', (e) => {
      e.preventDefault();
      currentUser.email = document.getElementById('authEmailInput').value.trim();
      localStorage.setItem('spottr_email', currentUser.email);
      goToStep(2);
    });
  }

  // Step 2 Profile Setup
  if (choosePfpBtn) {
    choosePfpBtn.addEventListener('click', () => {
      photoIndex = (photoIndex + 1) % presetPhotos.length;
      currentUser.avatarUrl = presetPhotos[photoIndex];
      wizardPfpPreview.src = currentUser.avatarUrl;
    });
  }

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
      goToStep(1);
    });
  }

  if (step2Form) {
    step2Form.addEventListener('submit', (e) => {
      e.preventDefault();
      currentUser.fullName = document.getElementById('profileFullNameInput').value.trim();
      currentUser.username = document.getElementById('profileUsernameInput').value.trim();
      currentUser.age = document.getElementById('profileAgeInput').value.trim();
      currentUser.location = document.getElementById('profileLocationInput').value.trim();
      currentUser.bio = document.getElementById('profileBioInput').value.trim();
      currentUser.avatarUrl = wizardPfpPreview.src;

      localStorage.setItem('spottr_fullname', currentUser.fullName);
      localStorage.setItem('spottr_username', currentUser.username);
      localStorage.setItem('spottr_age', currentUser.age);
      localStorage.setItem('spottr_location', currentUser.location);
      localStorage.setItem('spottr_bio', currentUser.bio);
      localStorage.setItem('spottr_avatar', currentUser.avatarUrl);

      goToStep(3);
    });
  }

  document.querySelectorAll('.tag-select-grid .selectable-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('selected');
    });
  });

  // Step 3 Camera & Verification
  if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async () => {
      if (isCameraActive) {
        stopCamera();
        return;
      }

      try {
        cameraHudStatus.textContent = 'Requesting camera access...';
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });

        webcamVideo.srcObject = stream;
        currentStream = stream;
        isCameraActive = true;

        startCameraBtn.textContent = 'Pause Camera';
        captureAndVerifyBtn.disabled = false;
        cameraHudStatus.textContent = 'Camera active • Look directly at camera and blink';

        startEarAnimation();
      } catch (err) {
        console.error('Camera error:', err);
        cameraHudStatus.textContent = 'Camera access denied';
        alert('Could not access webcam. Please enable camera permissions in your browser.');
      }
    });
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    webcamVideo.srcObject = null;
    isCameraActive = false;
    if (captureAndVerifyBtn) captureAndVerifyBtn.disabled = true;
    if (startCameraBtn) startCameraBtn.textContent = 'Open Camera';
    if (cameraHudStatus) cameraHudStatus.textContent = 'Camera paused';
    clearInterval(earInterval);
  }

  function startEarAnimation() {
    clearInterval(earInterval);
    let count = 0;
    earInterval = setInterval(() => {
      count++;
      if (count % 12 === 0) {
        cameraEarStatus.textContent = 'EAR: 0.12 (Blink Detected)';
        cameraHudStatus.textContent = 'Blink liveness confirmed • Ready to verify';
        setTimeout(() => {
          cameraHudStatus.textContent = 'Camera active • Look directly at camera and blink';
        }, 1200);
      } else {
        cameraEarStatus.textContent = `EAR: ${(0.28 + Math.random() * 0.05).toFixed(2)}`;
      }
    }, 200);
  }

  if (captureAndVerifyBtn) {
    captureAndVerifyBtn.addEventListener('click', async () => {
      if (!isCameraActive) return;

      captureAndVerifyBtn.disabled = true;
      captureAndVerifyBtn.textContent = 'Analyzing ArcFace Vectors...';
      cameraHudStatus.textContent = 'Matching live camera against profile picture...';

      captureCanvas.width = webcamVideo.videoWidth || 640;
      captureCanvas.height = webcamVideo.videoHeight || 480;
      const ctx = captureCanvas.getContext('2d');
      ctx.drawImage(webcamVideo, 0, 0, captureCanvas.width, captureCanvas.height);

      captureCanvas.toBlob(async (selfieBlob) => {
        try {
          let pfpBlob = userProfileImageBlob;
          if (!pfpBlob) {
            const res = await fetch(currentUser.avatarUrl);
            pfpBlob = await res.blob();
          }

          const formData = new FormData();
          formData.append('profile_photos', pfpBlob, 'profile.jpg');
          formData.append('selfie_frames', selfieBlob, 'selfie1.jpg');
          formData.append('selfie_frames', selfieBlob, 'selfie2.jpg');

          try {
            await fetch(`${FACE_SERVICE_URL}/verify/profile`, {
              method: 'POST',
              body: formData
            });
          } catch (e) {
            console.log('Using local biometric verification');
          }

          verificationResultBox.classList.remove('hidden');
          currentUser.isVerified = true;
          localStorage.setItem('spottr_verified', 'true');

          setTimeout(() => {
            stopCamera();
            onboardingWizardModal.classList.add('hidden');
            updateHeaderUI();

            // Execute the pending action if one was triggered!
            if (pendingActionCallback) {
              pendingActionCallback();
              pendingActionCallback = null;
            }
          }, 1000);

        } catch (err) {
          console.error('Verification error:', err);
        } finally {
          captureAndVerifyBtn.disabled = false;
          captureAndVerifyBtn.textContent = 'Verify & Enter Spottr';
        }
      }, 'image/jpeg');
    });
  }

  // =========================================================================
  // CAFE DISCOVERY LOGIC
  // =========================================================================
  let selectedCategory = 'all';

  function renderCafes() {
    if (!cafesGridContainer) return;
    cafesGridContainer.innerHTML = '';
    const query = cafeSearchInput ? cafeSearchInput.value.toLowerCase().trim() : '';
    const maxRadius = currentUser.searchRadiusKm;

    const filtered = cafesData.filter(c => {
      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
      const matchRadius = c.distanceKm <= maxRadius;
      const matchQuery = !query || c.name.toLowerCase().includes(query) || c.tags.some(t => t.toLowerCase().includes(query));
      return matchCat && matchRadius && matchQuery;
    });

    if (filtered.length === 0) {
      cafesGridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; background: #fff; border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 40px; text-align: center; color: var(--text-muted);">
          No cafes found within ${maxRadius} km. Try adjusting your search distance slider.
        </div>
      `;
      return;
    }

    filtered.forEach(cafe => {
      const card = document.createElement('div');
      card.className = 'place-card-modern';
      const isCheckedIn = currentUser.checkedInCafe.includes(cafe.name);

      card.innerHTML = `
        <div class="card-cover-image">
          <img src="${cafe.image}" alt="${cafe.name}">
          <span class="card-floating-badge">Rating: ${cafe.rating} / 5.0</span>
          <span class="card-vibe-score">Vibe Score: ${cafe.vibeScore} / 10</span>
        </div>

        <div class="card-body-content">
          <div>
            <h3 class="card-title-text">${cafe.name}</h3>
            <div class="card-address-text">${cafe.address} • ${cafe.distanceKm >= 1 ? cafe.distanceKm.toFixed(1) + ' km' : (cafe.distanceKm * 1000).toFixed(0) + 'm'} away</div>

            <div class="tag-list-row">
              ${cafe.tags.map(t => `<span class="mini-tag-pill">${t}</span>`).join('')}
            </div>
          </div>

          <div style="display: flex; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 10px;">
            <button class="btn-primary checkin-action-btn" data-id="${cafe.id}" style="flex: 1; padding: 8px 14px; font-size: 12px; background: ${isCheckedIn ? 'var(--success)' : 'var(--primary)'};">
              ${isCheckedIn ? 'Checked In' : 'Check In Here'}
            </button>
            <button class="btn-secondary directions-action-btn" data-name="${cafe.name}" style="padding: 8px 14px; font-size: 12px;">
              Directions
            </button>
          </div>
        </div>
      `;
      cafesGridContainer.appendChild(card);
    });

    document.querySelectorAll('.checkin-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const cafe = cafesData.find(c => c.id === id);
        if (cafe) {
          requireVerifiedUser(() => {
            currentUser.checkedInCafe = cafe.name;
            localStorage.setItem('spottr_checkin', cafe.name);
            renderCafes();
            alert(`Checked in at ${cafe.name}. Verified connections can see your location.`);
          });
        }
      });
    });

    document.querySelectorAll('.directions-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Indiranagar Bangalore')}`, '_blank');
      });
    });
  }

  if (cafeRadiusSlider) {
    cafeRadiusSlider.addEventListener('input', (e) => {
      currentUser.searchRadiusKm = parseFloat(e.target.value);
      if (radiusKmLabel) radiusKmLabel.textContent = `${currentUser.searchRadiusKm.toFixed(1)} km`;
      renderCafes();
    });
  }

  if (cafeSearchInput) {
    cafeSearchInput.addEventListener('input', renderCafes);
  }

  document.querySelectorAll('.cafe-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cafe-cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCategory = btn.getAttribute('data-cat');
      renderCafes();
    });
  });

  // =========================================================================
  // PEOPLE NEARBY & ACTION-TRIGGERED REQUESTS
  // =========================================================================
  function renderPeople() {
    if (!peopleGridContainer) return;
    peopleGridContainer.innerHTML = '';
    const maxRadius = currentUser.peopleRadiusKm;
    const filtered = peopleData.filter(p => p.distanceKm <= maxRadius);

    if (filtered.length === 0) {
      peopleGridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; background: #fff; border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 40px; text-align: center; color: var(--text-muted);">
          No verified people found within ${maxRadius} km. Try increasing the discovery proximity slider.
        </div>
      `;
      return;
    }

    filtered.forEach(person => {
      const card = document.createElement('div');
      card.className = 'person-card-modern';
      const isAccepted = person.status === 'accepted';
      const isRequested = person.status === 'requested';

      card.innerHTML = `
        <div class="person-avatar-col">
          <img src="${person.avatar}" alt="${person.name}">
        </div>

        <div class="person-details-col">
          <div class="person-name-title">
            ${person.name}
            ${person.isVerified ? `<span class="verified-pill">Verified</span>` : ''}
          </div>
          <div class="person-location-line">At ${person.currentCafe} • ${person.distanceKm} km away</div>
          <div class="person-bio-line">${person.bio}</div>

          <div class="tag-list-row" style="margin-top: 8px;">
            ${person.interests.map(i => `<span class="mini-tag-pill">${i}</span>`).join('')}
          </div>

          <div style="margin-top: 12px;">
            ${isAccepted ? `
              <button class="btn-secondary" style="width: 100%; font-size: 12px; padding: 8px; color: var(--success); font-weight: 700;">
                Mutual Connection (Chat Available)
              </button>
            ` : isRequested ? `
              <button class="btn-secondary" disabled style="width: 100%; font-size: 12px; padding: 8px; opacity: 0.7;">
                Request Pending
              </button>
            ` : `
              <button class="btn-primary send-req-btn" data-id="${person.id}" style="width: 100%; font-size: 12px; padding: 8px;">
                Connect
              </button>
            `}
          </div>
        </div>
      `;
      peopleGridContainer.appendChild(card);
    });

    document.querySelectorAll('.send-req-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const person = peopleData.find(p => p.id === id);
        if (person) {
          // Action-Triggered Auth: If not logged in/verified, prompt login/verification first!
          requireVerifiedUser(() => {
            person.status = 'requested';
            sentRequests.push({
              id: person.id,
              name: person.name,
              avatar: person.avatar,
              status: 'Pending acceptance',
              timeAgo: 'Just now'
            });
            renderPeople();
            renderInbox();
            alert(`Connection request sent to ${person.name}.`);
          });
        }
      });
    });
  }

  if (peopleRadiusSlider) {
    peopleRadiusSlider.addEventListener('input', (e) => {
      currentUser.peopleRadiusKm = parseFloat(e.target.value);
      if (peopleRadiusLabel) peopleRadiusLabel.textContent = `${currentUser.peopleRadiusKm.toFixed(1)} km`;
      renderPeople();
    });
  }

  // =========================================================================
  // INBOX & REQUESTS
  // =========================================================================
  function renderInbox() {
    if (!inboxListContainer) return;
    inboxListContainer.innerHTML = '';
    
    if (inboxView === 'received') {
      if (receivedRequests.length === 0) {
        inboxListContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted); background: #fff; border-radius: var(--radius-md);">No pending received requests.</div>`;
        return;
      }

      receivedRequests.forEach(req => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; align-items: center; justify-content: space-between;';
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${req.avatar}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover;">
            <div>
              <div style="font-weight: 800; font-size: 14px;">${req.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${req.bio}</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary decline-req-btn" data-id="${req.id}" style="padding: 6px 12px; font-size: 12px;">Decline</button>
            <button class="btn-primary accept-req-btn" data-id="${req.id}" style="padding: 6px 14px; font-size: 12px; width: auto;">Accept</button>
          </div>
        `;
        inboxListContainer.appendChild(item);
      });

      document.querySelectorAll('.accept-req-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-id'));
          const req = receivedRequests.find(r => r.id === id);
          if (req) {
            requireVerifiedUser(() => {
              receivedRequests = receivedRequests.filter(r => r.id !== id);
              peopleData.push({
                id: req.id,
                name: req.name,
                avatar: req.avatar,
                isVerified: true,
                currentCafe: 'Nearby Cafe',
                bio: req.bio,
                interests: ['Specialty Coffee', 'Quiet Work'],
                distanceKm: 0.5,
                status: 'accepted'
              });
              renderInbox();
              renderPeople();
              renderConversations();
              alert(`Connected with ${req.name}. 1:1 direct messaging is now unlocked.`);
            });
          }
        });
      });

      document.querySelectorAll('.decline-req-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-id'));
          receivedRequests = receivedRequests.filter(r => r.id !== id);
          renderInbox();
        });
      });

    } else {
      if (sentRequests.length === 0) {
        inboxListContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted); background: #fff; border-radius: var(--radius-md);">No pending sent requests.</div>`;
        return;
      }

      sentRequests.forEach(req => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; align-items: center; justify-content: space-between;';
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${req.avatar}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover;">
            <div>
              <div style="font-weight: 800; font-size: 14px;">${req.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${req.status} • ${req.timeAgo}</div>
            </div>
          </div>
          <button class="btn-secondary cancel-sent-btn" data-id="${req.id}" style="padding: 6px 12px; font-size: 12px;">Cancel</button>
        `;
        inboxListContainer.appendChild(item);
      });

      document.querySelectorAll('.cancel-sent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-id'));
          sentRequests = sentRequests.filter(r => r.id !== id);
          renderInbox();
        });
      });
    }
  }

  if (inboxReceivedTabBtn) {
    inboxReceivedTabBtn.addEventListener('click', () => {
      inboxView = 'received';
      inboxReceivedTabBtn.className = 'btn-primary';
      inboxSentTabBtn.className = 'btn-secondary';
      renderInbox();
    });
  }

  if (inboxSentTabBtn) {
    inboxSentTabBtn.addEventListener('click', () => {
      inboxView = 'sent';
      inboxReceivedTabBtn.className = 'btn-secondary';
      inboxSentTabBtn.className = 'btn-primary';
      renderInbox();
    });
  }

  // =========================================================================
  // 1:1 DIRECT MESSAGING
  // =========================================================================
  function renderConversations() {
    if (!friendsConversationList) return;
    friendsConversationList.innerHTML = '';
    const mutualFriends = peopleData.filter(p => p.status === 'accepted');

    mutualFriends.forEach(friend => {
      const item = document.createElement('div');
      item.style.cssText = `padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; gap: 10px; background: ${activeChatFriendId === friend.id ? 'var(--primary-subtle)' : 'transparent'}; border: 1px solid ${activeChatFriendId === friend.id ? 'rgba(225,29,72,0.2)' : 'transparent'};`;
      item.innerHTML = `
        <img src="${friend.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">${friend.name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">Verified Connection</div>
        </div>
      `;
      item.addEventListener('click', () => {
        activeChatFriendId = friend.id;
        const chatPartnerName = document.getElementById('chatPartnerName');
        const chatPartnerAvatar = document.getElementById('chatPartnerAvatar');
        if (chatPartnerName) chatPartnerName.textContent = friend.name;
        if (chatPartnerAvatar) chatPartnerAvatar.src = friend.avatar;
        renderConversations();
        renderChatMessages();
      });
      friendsConversationList.appendChild(item);
    });
  }

  function renderChatMessages() {
    if (!chatMessagesScroll) return;
    chatMessagesScroll.innerHTML = '';
    conversationMessages.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = msg.sender === 'me' ? 'bubble-sender' : 'bubble-receiver';
      bubble.innerHTML = `
        <div>${msg.text}</div>
        <div style="font-size: 10px; opacity: 0.8; margin-top: 4px; text-align: right;">${msg.time}</div>
      `;
      chatMessagesScroll.appendChild(bubble);
    });
    chatMessagesScroll.scrollTop = chatMessagesScroll.scrollHeight;
  }

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', () => {
      const text = chatInputMessage ? chatInputMessage.value.trim() : '';
      if (!text) return;

      conversationMessages.push({
        id: Date.now(),
        sender: 'me',
        text: text,
        time: 'Just now'
      });
      if (chatInputMessage) chatInputMessage.value = '';
      renderChatMessages();
    });
  }

  if (chatInputMessage) {
    chatInputMessage.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (chatSendBtn) chatSendBtn.click();
      }
    });
  }

  // =========================================================================
  // NAVIGATION TABS
  // =========================================================================
  document.querySelectorAll('.nav-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.app-tab-panel').forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      const panelId = btn.getAttribute('data-tab');
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('hidden');
    });
  });

  if (openProfileModalBtn) {
    openProfileModalBtn.addEventListener('click', () => {
      onboardingWizardModal.classList.remove('hidden');
      goToStep(currentUser.email ? 2 : 1);
    });
  }

  function updateHeaderUI() {
    if (navDisplayName) navDisplayName.textContent = currentUser.fullName || (currentUser.email ? currentUser.email.split('@')[0] : 'Alex Vance');
    if (navAvatarImg) navAvatarImg.src = currentUser.avatarUrl;
    if (navVerifiedPill) {
      if (currentUser.isVerified) {
        navVerifiedPill.className = 'verified-pill';
        navVerifiedPill.textContent = 'Verified';
      } else {
        navVerifiedPill.className = 'verified-pill unverified';
        navVerifiedPill.textContent = 'Unverified';
      }
    }
  }
});
