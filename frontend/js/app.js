// ========== APP INITIALIZATION ==========

function showView(viewName) {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.add('hidden');

  if (viewName === 'dashboard') {
    document.getElementById('dashboard-view').classList.remove('hidden');
    initDashboard();
  } else {
    document.getElementById('auth-view').classList.remove('hidden');
  }
}

function initDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  document.getElementById('nav-user-name').textContent = user.name || 'User';
  document.getElementById('nav-user-role').textContent = user.role || 'user';

  // Style admin badge differently
  const badge = document.getElementById('nav-user-role');
  if (user.role === 'admin') {
    badge.style.background = 'rgba(245,158,11,0.15)';
    badge.style.color = '#fbbf24';
    badge.style.borderColor = 'rgba(245,158,11,0.3)';
  }

  loadProducts();
}

// ===== STARTUP =====

(function init() {
  const token = localStorage.getItem('token');
  if (token) {
    // Verify token is still valid
    AuthAPI.getMe()
      .then((data) => {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        showView('dashboard');
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showView('auth');
      });
  } else {
    showView('auth');
  }
})();
