// ========== AUTH LOGIC ==========

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const indicator = document.getElementById('tab-indicator');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    indicator.classList.remove('right');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    indicator.classList.add('right');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Signing in...';

  try {
    const data = await AuthAPI.login({
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value,
    });

    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));

    showToast(`Welcome back, ${data.data.user.name}!`, 'success');
    showView('dashboard');
  } catch (error) {
    showToast(error.message || 'Login failed', 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Creating account...';

  try {
    const data = await AuthAPI.register({
      name: document.getElementById('register-name').value.trim(),
      email: document.getElementById('register-email').value.trim(),
      password: document.getElementById('register-password').value,
      role: document.getElementById('register-role').value,
    });

    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));

    showToast(`Account created! Welcome, ${data.data.user.name}!`, 'success');
    showView('dashboard');
  } catch (error) {
    showToast(error.message || 'Registration failed', 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Create Account';
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'info');
  showView('auth');
}
