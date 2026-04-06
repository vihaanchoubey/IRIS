/* IRIS Admin JS — Fixed tab switching + auth guard + theme system */

const STATES_LIST = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh"];

const ALLOWED_ROLES = ['super_admin', 'regional_officer'];

let allIndustries = [];
let loadedTabs = new Set();

// ── Theme System ───────────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('iris_admin_theme') || 'light';
  const adminBody = document.getElementById('admin-body');
  const themeBtn = document.getElementById('theme-toggle-admin');
  
  if (!adminBody || !themeBtn) return;
  
  // Apply saved theme
  if (savedTheme === 'dark') {
    adminBody.classList.add('dark-theme');
    themeBtn.classList.add('dark-mode');
    themeBtn.querySelector('.theme-icon').textContent = '☀️';
  } else {
    adminBody.classList.remove('dark-theme');
    themeBtn.classList.remove('dark-mode');
    themeBtn.querySelector('.theme-icon').textContent = '🌙';
  }
  
  // Add theme toggle listener
  themeBtn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const adminBody = document.getElementById('admin-body');
  const themeBtn = document.getElementById('theme-toggle-admin');
  const isDark = adminBody.classList.toggle('dark-theme');
  
  if (isDark) {
    localStorage.setItem('iris_admin_theme', 'dark');
    themeBtn.classList.add('dark-mode');
    themeBtn.querySelector('.theme-icon').textContent = '☀️';
  } else {
    localStorage.setItem('iris_admin_theme', 'light');
    themeBtn.classList.remove('dark-mode');
    themeBtn.querySelector('.theme-icon').textContent = '🌙';
  }
}

// ── Auth guard ─────────────────────────────────────────────────
function checkAuth() {
  const saved = localStorage.getItem('iris_user');
  const denied  = document.getElementById('access-denied');
  const content = document.getElementById('admin-content');
  if (!denied || !content) return;

  if (!saved) {
    denied.style.display = 'flex';
    content.style.display = 'none';
    return;
  }
  try {
    const user = JSON.parse(saved);
    if (!ALLOWED_ROLES.includes(user.role)) {
      denied.style.display = 'flex';
      content.style.display = 'none';
      return;
    }
    denied.style.display = 'none';
    content.style.display = 'block';
    initAdmin();
  } catch(e) {
    denied.style.display = 'flex';
    content.style.display = 'none';
  }
}

// ── Tab switching (no glitch — pure display toggle) ────────────
function initTabs() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tab = this.dataset.tab;

      // Update button states
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');

      // Update panel visibility
      document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById('panel-' + tab);
      if (panel) panel.style.display = '';

      // Load data only once per tab
      if (!loadedTabs.has(tab)) {
        loadedTabs.add(tab);
        loadPanelData(tab);
      }
    });
  });
}

function loadPanelData(tab) {
  switch(tab) {
    case 'offices':      loadOffices(); break;
    case 'industries':   loadIndustries(); break;
    case 'water-sources':loadWaterSources(); break;
    case 'locations':    loadLocations(); break;
    case 'units':        loadUnits(); loadLimits(); break;
    case 'teams':        loadTeams(); break;
    case 'users':        loadUsers(); break;
    case 'campaigns':    loadCampaigns(); break;
  }
}

function initAdmin() {
  initTheme();
  initTabs();
  populateStateSelects();
  // Load first tab
  loadedTabs.add('offices');
  loadOffices();
}

// ── Modals ─────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  populateStateSelects();
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

function populateStateSelects() {
  document.querySelectorAll('select[id$="-state"]').forEach(sel => {
    if (sel.options.length > 1) return; // already populated
    STATES_LIST.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      sel.appendChild(o);
    });
  });
  // Also filter selects
  const isf = document.getElementById('industry-state-filter');
  if (isf && isf.options.length <= 1) {
    STATES_LIST.forEach(s => { const o=document.createElement('option');o.value=s;o.textContent=s;isf.appendChild(o); });
  }
}

function esc(t) { const d=document.createElement('div');d.textContent=t||'';return d.innerHTML; }

// ── Regional Offices ──────────────────────────────────────────
async function loadOffices() {
  const data = await fetch('/api/regional-offices').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('offices-tbody');
  if (!tbody) return;
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="tbl-loading">No offices found</td></tr>'; return; }
  tbody.innerHTML = data.map(o => `
    <tr>
      <td style="font-weight:500;color:var(--text)">${esc(o.name)}</td>
      <td>${esc(o.state)}</td>
      <td>${esc(o.city||'–')}</td>
      <td>${esc(o.officer_name||'–')}</td>
      <td style="font-family:monospace;font-size:12px">${esc(o.phone||'–')}</td>
      <td><span class="status-badge ${o.is_active?'status-good':'status-poor'}">${o.is_active?'Active':'Inactive'}</span></td>
    </tr>`).join('');
}

async function saveOffice() {
  const p = {
    name: document.getElementById('of-name').value.trim(),
    state: document.getElementById('of-state').value,
    city: document.getElementById('of-city').value.trim(),
    officer_name: document.getElementById('of-officer').value.trim(),
    phone: document.getElementById('of-phone').value.trim(),
    email: document.getElementById('of-email').value.trim(),
  };
  if (!p.name || !p.state) { alert('Name and State are required.'); return; }
  await fetch('/api/regional-offices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('office-modal');
  loadedTabs.delete('offices'); loadOffices(); loadedTabs.add('offices');
}

// ── Industries ────────────────────────────────────────────────
async function loadIndustries() {
  const state = document.getElementById('industry-state-filter')?.value||'';
  const url = state?`/api/industries?state=${encodeURIComponent(state)}`:'/api/industries';
  allIndustries = await fetch(url).then(r=>r.json()).catch(()=>[]);
  filterIndustriesTable();
}

function filterIndustriesTable() {
  const cat = document.getElementById('industry-cat-filter')?.value||'';
  const rows = cat ? allIndustries.filter(i=>i.category===cat) : allIndustries;
  const tbody = document.getElementById('industries-tbody');
  if (!tbody) return;
  if (!rows.length) { tbody.innerHTML='<tr><td colspan="7" class="tbl-loading">No industries found</td></tr>'; return; }
  tbody.innerHTML = rows.map(i=>`
    <tr>
      <td style="font-weight:500;color:var(--text)">${esc(i.name)}</td>
      <td>${esc(i.industry_type||'–')}</td>
      <td>${esc(i.state||'–')}</td>
      <td>${esc(i.city||'–')}</td>
      <td><span class="cat-${(i.category||'').toLowerCase()}">${esc(i.category||'–')}</span></td>
      <td style="font-size:12px;font-family:monospace">${esc(i.consent_number||'–')}</td>
      <td><span class="status-badge ${i.is_active?'status-good':'status-poor'}">${i.is_active?'Active':'Inactive'}</span></td>
    </tr>`).join('');
}

async function saveIndustry() {
  const p = {
    name: document.getElementById('ind-name').value.trim(),
    industry_type: document.getElementById('ind-type').value.trim(),
    state: document.getElementById('ind-state').value,
    city: document.getElementById('ind-city').value.trim(),
    latitude: parseFloat(document.getElementById('ind-lat').value)||null,
    longitude: parseFloat(document.getElementById('ind-lon').value)||null,
    consent_number: document.getElementById('ind-consent').value.trim(),
    category: document.getElementById('ind-cat').value,
  };
  if (!p.name) { alert('Name is required.'); return; }
  await fetch('/api/industries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('industry-modal'); loadIndustries();
}

// ── Water Sources ─────────────────────────────────────────────
async function loadWaterSources() {
  const data = await fetch('/api/water-sources').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('wsources-tbody');
  if (!tbody) return;
  if (!data.length) { tbody.innerHTML='<tr><td colspan="5" class="tbl-loading">No sources</td></tr>'; return; }
  tbody.innerHTML = data.map(w=>`
    <tr>
      <td style="font-weight:500;color:var(--text)">${esc(w.name)}</td>
      <td><span class="status-badge status-moderate">${esc(w.source_type||'–')}</span></td>
      <td>${esc(w.state||'–')}</td>
      <td>${esc(w.city||'–')}</td>
      <td style="font-size:12px;font-family:monospace">${w.latitude?`${w.latitude.toFixed(4)}, ${w.longitude.toFixed(4)}`:'–'}</td>
    </tr>`).join('');
}

async function saveWaterSource() {
  const p = {
    name: document.getElementById('ws-name').value.trim(),
    source_type: document.getElementById('ws-type').value,
    state: document.getElementById('ws-state').value,
    city: document.getElementById('ws-city').value.trim(),
    latitude: parseFloat(document.getElementById('ws-lat').value)||null,
    longitude: parseFloat(document.getElementById('ws-lon').value)||null,
  };
  await fetch('/api/water-sources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('watersource-modal'); loadWaterSources();
}

// ── Monitoring Locations ──────────────────────────────────────
async function loadLocations() {
  const data = await fetch('/api/monitoring-locations').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('locations-tbody');
  if (!tbody) return;
  if (!data.length) { tbody.innerHTML='<tr><td colspan="6" class="tbl-loading">No locations yet</td></tr>'; return; }
  tbody.innerHTML = data.map(l=>`
    <tr>
      <td style="font-weight:500;color:var(--text)">${esc(l.name)}</td>
      <td><span class="status-badge status-moderate">${esc((l.location_type||'').replace(/_/g,' '))}</span></td>
      <td>${esc(l.state||'–')}</td>
      <td>${esc(l.city||'–')}</td>
      <td>${esc(l.industry_name||'–')}</td>
      <td style="font-size:12px;font-family:monospace">${l.latitude?`${l.latitude.toFixed(3)}, ${l.longitude.toFixed(3)}`:'–'}</td>
    </tr>`).join('');
}

async function saveLocation() {
  const p = {
    name: document.getElementById('loc-name').value.trim(),
    location_type: document.getElementById('loc-type').value,
    state: document.getElementById('loc-state').value,
    city: document.getElementById('loc-city').value.trim(),
    latitude: parseFloat(document.getElementById('loc-lat').value)||null,
    longitude: parseFloat(document.getElementById('loc-lon').value)||null,
  };
  await fetch('/api/monitoring-locations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('location-modal'); loadLocations();
}

// ── Units ─────────────────────────────────────────────────────
async function loadUnits() {
  const data = await fetch('/api/monitoring-units').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('units-tbody');
  if (!tbody) return;
  const catCls = {air:'status-moderate',water:'status-good',noise:'status-poor',emissions:'status-severe'};
  tbody.innerHTML = data.map(u=>`
    <tr>
      <td style="font-weight:500">${esc(u.parameter)}</td>
      <td style="font-family:monospace;font-size:13px;color:var(--accent-text)">${esc(u.unit_symbol)}</td>
      <td><span class="status-badge ${catCls[u.category]||'status-moderate'}">${esc(u.category)}</span></td>
    </tr>`).join('');
}

async function loadLimits() {
  const data = await fetch('/api/prescribed-limits').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('limits-tbody');
  if (!tbody) return;
  tbody.innerHTML = data.map(l=>`
    <tr>
      <td style="font-weight:500">${esc(l.parameter)}</td>
      <td style="font-family:monospace;font-weight:600;color:var(--accent-text)">${l.limit_value} <span style="font-size:11px;color:var(--text-3)">${esc(l.unit_symbol||'')}</span></td>
      <td><span class="status-badge ${l.limit_type==='max'?'status-poor':'status-good'}">${l.limit_type==='max'?'Max':'Min'}</span></td>
      <td style="font-size:12px;color:var(--text-3)">${esc(l.standard_name||'–')}</td>
    </tr>`).join('');
}

async function saveUnit() {
  const p = { parameter:document.getElementById('unit-param').value.trim(), unit_symbol:document.getElementById('unit-sym').value.trim(), unit_name:document.getElementById('unit-name').value.trim(), category:document.getElementById('unit-cat').value };
  await fetch('/api/monitoring-units',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('unit-modal'); loadUnits();
}

async function saveLimit() {
  const p = { parameter:document.getElementById('lim-param').value.trim(), limit_value:parseFloat(document.getElementById('lim-val').value), limit_type:document.getElementById('lim-type').value, category:document.getElementById('lim-cat').value, standard_name:document.getElementById('lim-standard').value.trim() };
  await fetch('/api/prescribed-limits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('limit-modal'); loadLimits();
}

// ── Teams ─────────────────────────────────────────────────────
async function loadTeams() {
  const data = await fetch('/api/monitoring-teams').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('teams-tbody');
  if (!tbody) return;
  tbody.innerHTML = data.map(t=>`
    <tr>
      <td style="font-weight:500">${esc(t.team_name)}</td>
      <td>${esc(t.state||'–')}</td>
      <td>${esc(t.office_name||'–')}</td>
      <td><span class="status-badge status-good">Active</span></td>
    </tr>`).join('');
}

async function saveTeam() {
  const p = { team_name:document.getElementById('team-name').value.trim(), state:document.getElementById('team-state').value };
  await fetch('/api/monitoring-teams',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('team-modal'); loadTeams();
}

// ── Users ─────────────────────────────────────────────────────
async function loadUsers() {
  const data = await fetch('/api/auth/users').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const roleBadge = r => {
    const cls = 'role-'+(r||'').replace(/_/g,'-');
    const label = (r||'citizen').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    return `<span class="${cls}">${label}</span>`;
  };
  tbody.innerHTML = data.map(u=>`
    <tr>
      <td style="font-weight:500;font-family:monospace;font-size:13px">${esc(u.username)}</td>
      <td>${esc(u.full_name||'–')}</td>
      <td>${roleBadge(u.role)}</td>
      <td>${esc(u.state||'–')}</td>
      <td style="font-size:12px">${esc(u.email||'–')}</td>
      <td><span class="status-badge ${u.is_active?'status-good':'status-poor'}">${u.is_active?'Active':'Inactive'}</span></td>
    </tr>`).join('');
}

async function saveUser() {
  const p = { username:document.getElementById('usr-username').value.trim(), password:document.getElementById('usr-password').value, full_name:document.getElementById('usr-fullname').value.trim(), email:document.getElementById('usr-email').value.trim(), role:document.getElementById('usr-role').value, state:document.getElementById('usr-state').value };
  if (!p.username||!p.password) { alert('Username and password required.'); return; }
  const r = await fetch('/api/auth/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  const d = await r.json();
  if (d.error) { alert(d.error); return; }
  closeModal('user-modal'); loadUsers();
}

// ── Campaigns ─────────────────────────────────────────────────
async function loadCampaigns() {
  const data = await fetch('/api/campaigns').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('campaigns-tbody');
  if (!tbody) return;
  const stCls = s=>({active:'camp-active',planned:'camp-planned',completed:'camp-completed'}[s]||'camp-planned');
  tbody.innerHTML = data.map(c=>`
    <tr>
      <td style="font-weight:500">${esc(c.campaign_name)}</td>
      <td><span class="status-badge status-moderate">${esc(c.campaign_type||'–')}</span></td>
      <td>${esc(c.state||'–')}</td>
      <td style="font-size:12px">${esc(c.start_date||'–')}</td>
      <td style="font-size:12px">${esc(c.end_date||'–')}</td>
      <td><span class="${stCls(c.status)}">${esc(c.status)}</span></td>
    </tr>`).join('');
}

async function saveCampaign() {
  const p = { campaign_name:document.getElementById('camp-name').value.trim(), campaign_type:document.getElementById('camp-type').value, state:document.getElementById('camp-state').value, start_date:document.getElementById('camp-start').value, end_date:document.getElementById('camp-end').value, description:document.getElementById('camp-desc').value.trim() };
  if (!p.campaign_name) { alert('Campaign name required.'); return; }
  await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('campaign-modal'); loadCampaigns();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', checkAuth);
