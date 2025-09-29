window.auth = {
  isAuthenticated: function() {
    try {
      const authData = localStorage.getItem('gg:auth');
      return authData && JSON.parse(authData).ok === true;
    } catch (e) { return false; }
  },
  protectPage: function() {
    if (!this.isAuthenticated()) {
      sessionStorage.setItem('gg:intended', window.location.pathname);
      window.location.replace('/gold/index.html?reason=auth_required');
    }
  },
  handleLogin: function(user, pass) {
    if (user === 'test' && pass === '1234') {
      localStorage.setItem('gg:auth', JSON.stringify({ ok: true, user: user }));
      const intendedUrl = sessionStorage.getItem('gg:intended');
      sessionStorage.removeItem('gg:intended');
      window.location.replace(intendedUrl || '/gold/pages/dashboard.html');
    } else {
      alert('Credenciales incorrectas');
    }
  },
  handleLogout: function() {
    localStorage.removeItem('gg:auth');
    window.location.replace('/gold/index.html?reason=logout_success');
  },
  initialize: function() {
    document.querySelectorAll('a[data-protected="true"]').forEach(link => {
      link.addEventListener('click', event => {
        if (!this.isAuthenticated()) {
          event.preventDefault();
          sessionStorage.setItem('gg:intended', new URL(link.href).pathname);
          window.location.replace('/gold/index.html?reason=auth_required');
        }
      });
    });
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      if (this.isAuthenticated()) {
        logoutButton.style.display = 'inline-block';
        logoutButton.addEventListener('click', this.handleLogout);
      } else {
        logoutButton.style.display = 'none';
      }
    }
  }
};
window.auth.initialize();