// ── IRIS Smart Nav — User dropdown after login ────────────────────
(function() {
  const ROLE_LABELS = {
    super_admin:'Super Admin', regional_officer:'Regional Officer',
    monitoring_team:'Monitoring Team', industry_user:'Industry User', citizen:'Citizen'
  };
  const ROLE_ICONS = {
    super_admin:'🛡️', regional_officer:'🏛️',
    monitoring_team:'🔬', industry_user:'🏭', citizen:'👤'
  };
  const ROLE_ACCESS = {
    super_admin: [
      {icon:'⚙️',label:'Admin Panel',href:'/admin'},
      {icon:'📊',label:'View Reports',href:'/admin/reports'},
      {icon:'🔔',label:'Report Environmental Concern',href:'#',onclick:'showReportForm()'},
      {icon:'💬',label:'Send Feedback',href:'#',onclick:'showFeedbackForm()'},
    ],
    regional_officer: [
      {icon:'�',label:'View Reports',href:'/admin/reports'},
      {icon:'🔔',label:'Report Environmental Concern',href:'#',onclick:'showReportForm()'},
      {icon:'💬',label:'Send Feedback',href:'#',onclick:'showFeedbackForm()'},
    ],
    monitoring_team: [
      {icon:'',label:'Report Environmental Concern',href:'#',onclick:'showReportForm()'},
      {icon:'💬',label:'Send Feedback',href:'#',onclick:'showFeedbackForm()'},
    ],
    industry_user: [
      {icon:'📋',label:'Submit Monthly Report',href:'/submit-report'},
      {icon:'🔔',label:'Report Environmental Concern',href:'#',onclick:'showReportForm()'},
      {icon:'💬',label:'Send Feedback',href:'#',onclick:'showFeedbackForm()'},
    ],
    citizen: [
      {icon:'',label:'Report Environmental Concern',href:'#',onclick:'showReportForm()'},
      {icon:'💬',label:'Send Feedback',href:'#',onclick:'showFeedbackForm()'},
    ],
  };

  function getUser() {
    try { return JSON.parse(localStorage.getItem('iris_user')); } catch(e) { return null; }
  }

  const THEME_STORAGE_KEY = 'iris_theme';
  function getStoredTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  }
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('theme-dark', isDark);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  function initNav() {
    applyTheme(getStoredTheme());
    const user = getUser();
    const authZone = document.getElementById('nav-auth-zone');
    if (!authZone) return;

    if (!user) {
      // Show login + signup buttons
      authZone.innerHTML = `
        <a href="/login" class="nav-auth-btn nav-login-btn">Login</a>
        <a href="/signup" class="nav-auth-btn nav-signup-btn">Sign Up</a>
      `;
    } else {
      // Show user role dropdown
      const initials = (user.full_name || user.username || '?')
        .split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const role = user.role || 'citizen';
      const access = ROLE_ACCESS[role] || ROLE_ACCESS.citizen;

      authZone.innerHTML = `
        <div class="nav-user-btn" id="nav-user-btn" tabindex="0">
          <div class="nav-user-avatar">${initials}</div>
          <div class="nav-user-info">
            <div class="nav-user-name">${user.full_name || user.username}</div>
            <div class="nav-user-role">${ROLE_ICONS[role]||'👤'} ${ROLE_LABELS[role]||role}</div>
          </div>
          <svg class="nav-caret" viewBox="0 0 16 16" width="12" fill="currentColor">
            <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
          </svg>
        </div>
        <div class="nav-dropdown" id="nav-dropdown">
          <div class="nav-dropdown-header">
            <div class="nav-dropdown-avatar">${initials}</div>
            <div>
              <div class="nav-dropdown-name">${user.full_name || user.username}</div>
              <div class="nav-dropdown-role">${ROLE_LABELS[role]||role}</div>
            </div>
          </div>
          <div class="nav-dropdown-divider"></div>
          <div class="nav-dropdown-section">My Access</div>
          ${access.map(a=>{
            if(a.onclick){
              return `<button class="nav-dropdown-item" onclick="${a.onclick}; return false;" style="border:none;background:none;cursor:pointer;text-align:left;width:100%;padding:8px 12px;">
                <span class="nav-dropdown-item-icon">${a.icon}</span>
                ${a.label}
              </button>`;
            }else{
              return `<a href="${a.href}" class="nav-dropdown-item">
                <span class="nav-dropdown-item-icon">${a.icon}</span>
                ${a.label}
              </a>`;
            }
          }).join('')}
          <div class="nav-dropdown-divider"></div>
          <div class="nav-dropdown-section">Display</div>
          <div class="nav-theme-toggle">
            <div class="nav-theme-toggle-label">Dark mode</div>
            <div id="theme-switch" class="theme-switch" role="switch" aria-checked="false" tabindex="0" title="Toggle light/dark theme"></div>
          </div>
          <div class="nav-dropdown-divider"></div>
          <button class="nav-dropdown-signout" id="nav-signout">
            <span>↩</span> Sign Out
          </button>
        </div>
      `;

      // Toggle dropdown
      const btn = document.getElementById('nav-user-btn');
      const dd  = document.getElementById('nav-dropdown');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dd.classList.toggle('open');
        btn.classList.toggle('active');
      });
      document.addEventListener('click', () => {
        dd.classList.remove('open');
        btn.classList.remove('active');
      });

      // Sign out
      document.getElementById('nav-signout').addEventListener('click', () => {
        localStorage.removeItem('iris_user');
        window.location.href = '/login';
      });

      // Theme toggle
      const themeSwitch = document.getElementById('theme-switch');
      const setSwitchState = (theme) => {
        if (!themeSwitch) return;
        const isDark = theme === 'dark';
        themeSwitch.classList.toggle('active', isDark);
        themeSwitch.setAttribute('aria-checked', isDark ? 'true' : 'false');
      };
      setSwitchState(getStoredTheme());

      const toggleTheme = () => {
        const next = getStoredTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setSwitchState(next);
      };
      if (themeSwitch) {
        themeSwitch.addEventListener('click', toggleTheme);
        themeSwitch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTheme();
          }
        });
      }
    }
  }

  window.showReportForm = function() {
    // Close dropdown first
    const dd = document.getElementById('nav-dropdown');
    if (dd) dd.classList.remove('open');
    
    const btn = document.getElementById('nav-user-btn');
    if (btn) btn.classList.remove('active');
    
    // Trigger report modal (needs to be implemented on each page)
    if (window.openReportModal) {
      openReportModal();
    } else {
      alert('Report form not available on this page');
    }
  };

  window.showFeedbackForm = function() {
    // Close dropdown first
    const dd = document.getElementById('nav-dropdown');
    if (dd) dd.classList.remove('open');
    
    const btn = document.getElementById('nav-user-btn');
    if (btn) btn.classList.remove('active');
    
    // Trigger feedback modal (needs to be implemented on each page)
    if (window.openFeedbackModal) {
      openFeedbackModal();
    } else {
      alert('Feedback form not available on this page');
    }
  };

  document.addEventListener('DOMContentLoaded', initNav);
})();
