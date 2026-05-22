const Auth = (() => {
  const TOKEN_KEY = 'tf_token';
  const USER_KEY = 'tf_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.href = 'dashboard.html';
    }
  }

  async function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  function populateSidebarUser() {
    const user = getUser();
    if (!user) return;
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.name || 'Tailor';
    if (roleEl) roleEl.textContent = user.business_name || 'Tailor Hub';
    if (avatarEl) {
      const initials = (user.name || 'TF')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarEl.textContent = initials;
    }
  }

  return { getToken, getUser, setSession, clearSession, isLoggedIn, requireAuth, redirectIfLoggedIn, logout, populateSidebarUser };
})();
