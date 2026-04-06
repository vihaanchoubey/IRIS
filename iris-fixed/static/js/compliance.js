/* IRIS Compliance JS */

const STATES_LIST = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh"];

let currentAlertId = null;
let loadedCtabs = new Set();

function esc(t) { const d=document.createElement('div');d.textContent=t||'';return d.innerHTML; }

function openModal(id) { document.getElementById(id).classList.add('open'); populateStateSelects(); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); });

function populateStateSelects() {
  ['f-state','rpt-state'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && sel.options.length <= 1) {
      STATES_LIST.forEach(s => { const o=document.createElement('option');o.value=s;o.textContent=s;sel.appendChild(o); });
    }
  });
}

// ── Tab switching ─────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('[data-ctab]').forEach(btn => {
    btn.addEventListener('click', function() {
      const tab = this.dataset.ctab;
      document.querySelectorAll('[data-ctab]').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById('cpanel-' + tab);
      if (panel) panel.style.display = '';
      if (!loadedCtabs.has(tab)) { loadedCtabs.add(tab); loadPanel(tab); }
    });
  });
}

function loadPanel(tab) {
  switch(tab) {
    case 'alerts':   loadAlerts(); break;
    case 'submit':   loadIndustriesDropdown(); break;
    case 'reports':  loadReports(); break;
    case 'campaigns':loadCampaigns(); break;
    case 'logs':     loadLogs(); break;
  }
}

// ── Dashboard metrics ─────────────────────────────────────────
async function loadDashboard() {
  const d = await fetch('/api/compliance/dashboard').then(r=>r.json()).catch(()=>({}));
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val??'–'; };
  set('m-active', d.active_alerts);
  set('m-crit',   d.critical);
  set('m-esc',    d.escalated);
  set('m-res',    d.resolved_7d);
  set('m-nc',     d.non_compliant);

  // Top states bars
  const el = document.getElementById('top-states-bars');
  if (!el) return;
  const max = d.top_states?.[0]?.alerts || 1;
  el.innerHTML = (d.top_states||[]).map(s => {
    const pct = Math.round((s.alerts/max)*100);
    const col = pct>80?'var(--red)':pct>50?'var(--orange)':'var(--yellow)';
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="min-width:140px;font-size:13px;color:var(--text-2);font-weight:500">${esc(s.state)}</div>
      <div style="flex:1;height:7px;background:var(--surface-alt);border-radius:4px;overflow:hidden;border:1px solid var(--border-soft)">
        <div style="width:${pct}%;height:100%;border-radius:4px;background:${col}"></div>
      </div>
      <div style="min-width:28px;text-align:right;font-size:12px;color:var(--text-3)">${s.alerts}</div>
    </div>`;
  }).join('') || '<div style="color:var(--text-3);font-size:13px">No active alerts</div>';
}

// ── Alerts table ──────────────────────────────────────────────
async function loadAlerts() {
  const status   = document.getElementById('f-status')?.value || 'active';
  const severity = document.getElementById('f-severity')?.value || '';
  const state    = document.getElementById('f-state')?.value || '';
  let url = `/api/alerts?status=${status}`;
  if (severity) url += `&severity=${encodeURIComponent(severity)}`;
  if (state)    url += `&state=${encodeURIComponent(state)}`;
  const data = await fetch(url).then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('alerts-tbody');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="tbl-loading">No alerts found</td></tr>';
    return;
  }
  const sevCls = s=>({critical:'sev-critical',high:'sev-high',medium:'sev-medium',low:'sev-low'})[s]||'sev-low';
  const staCls = s=>({active:'status-badge status-poor',investigating:'status-badge status-moderate',resolved:'status-badge status-good'})[s]||'status-badge';
  tbody.innerHTML = data.map(a => {
    const excess = a.prescribed_limit ? Math.round((a.measured_value/a.prescribed_limit-1)*100) : 0;
    const excCol = excess>100?'var(--red)':excess>50?'var(--orange)':'var(--yellow)';
    return `<tr>
      <td><span class="${sevCls(a.severity)}">${esc(a.severity)}</span></td>
      <td>${esc(a.state||'–')}</td>
      <td style="font-weight:500">${esc(a.parameter||'–')}</td>
      <td style="font-family:monospace;font-weight:600;color:var(--red)">${a.measured_value??'–'}</td>
      <td style="font-family:monospace;color:var(--text-2)">${a.prescribed_limit??'–'}</td>
      <td><span style="font-weight:600;color:${excCol}">+${excess}%</span></td>
      <td>
        <span class="${staCls(a.status)}">${esc(a.status)}</span>
        ${a.escalated?'<span style="font-size:10px;margin-left:4px;color:var(--orange)">⬆</span>':''}
      </td>
      <td><button class="act-btn" onclick="openAlertModal(${a.id},'${esc(a.message||'')}')">Update</button></td>
    </tr>`;
  }).join('');
}

function openAlertModal(id, msg) {
  currentAlertId = id;
  const el = document.getElementById('alert-modal-msg');
  if (el) el.textContent = msg;
  const sel = document.getElementById('alert-status-sel');
  if (sel) sel.value = 'investigating';
  const chk = document.getElementById('alert-escalate');
  if (chk) chk.checked = false;
  openModal('alert-modal');
}

async function saveAlertUpdate() {
  if (!currentAlertId) return;
  const payload = {
    status: document.getElementById('alert-status-sel').value,
    escalated: document.getElementById('alert-escalate').checked ? 1 : 0,
  };
  await fetch(`/api/alerts/${currentAlertId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  closeModal('alert-modal');
  loadAlerts(); loadDashboard();
}

// ── Submit reading ────────────────────────────────────────────
async function loadIndustriesDropdown() {
  const sel = document.getElementById('log-industry');
  if (!sel || sel.options.length > 1) return;
  const data = await fetch('/api/industries').then(r=>r.json()).catch(()=>[]);
  data.forEach(i => { const o=document.createElement('option');o.value=i.id;o.textContent=`${i.name} (${i.state})`;sel.appendChild(o); });
}

async function submitLog() {
  const payload = {
    industry_id: parseInt(document.getElementById('log-industry').value)||null,
    monitoring_type: document.getElementById('log-mtype').value,
    parameter: document.getElementById('log-param').value.trim(),
    value: parseFloat(document.getElementById('log-value').value),
    unit: document.getElementById('log-unit').value.trim(),
    reading_timestamp: document.getElementById('log-date').value||new Date().toISOString().slice(0,10),
    remarks: document.getElementById('log-remarks').value.trim(),
  };
  const fb = document.getElementById('log-feedback');
  if (!payload.parameter || isNaN(payload.value)) {
    fb.textContent = '⚠ Parameter and value are required.';
    fb.style.color = 'var(--red)'; return;
  }
  const r = await fetch('/api/monitoring-logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const d = await r.json();
  if (d.success) {
    fb.textContent = '✓ Reading submitted. Checking against prescribed limits…';
    fb.style.color = 'var(--green)';
    setTimeout(() => { loadDashboard(); }, 1000);
  } else {
    fb.textContent = d.error || 'Submission failed.';
    fb.style.color = 'var(--red)';
  }
}

// ── Reports ───────────────────────────────────────────────────
async function loadReports() {
  const data = await fetch('/api/reports').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('reports-tbody');
  if (!tbody) return;
  const staCls = s=>({published:'status-badge status-good',draft:'status-badge status-moderate'})[s]||'status-badge';
  tbody.innerHTML = data.length ? data.map(r=>`
    <tr>
      <td><span class="status-badge status-moderate">${esc(r.report_type)}</span></td>
      <td>${esc(r.state||'All')}</td>
      <td style="font-size:12px">${esc(r.period_start||'–')} → ${esc(r.period_end||'–')}</td>
      <td>${esc(r.generated_by_name||'System')}</td>
      <td><span class="${staCls(r.status)}">${esc(r.status)}</span></td>
      <td style="font-size:12px;color:var(--text-3)">${r.created_at?r.created_at.slice(0,10):'–'}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="tbl-loading">No reports yet</td></tr>';
}

async function saveReport() {
  const p = { report_type:document.getElementById('rpt-type').value, state:document.getElementById('rpt-state').value, period_start:document.getElementById('rpt-start').value, period_end:document.getElementById('rpt-end').value, summary:document.getElementById('rpt-summary').value.trim(), status:'published' };
  await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  closeModal('report-modal'); loadReports();
}

// ── Campaigns ─────────────────────────────────────────────────
async function loadCampaigns() {
  const data = await fetch('/api/campaigns').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('camp-tbody');
  if (!tbody) return;
  const stCls = s=>({active:'camp-active',planned:'camp-planned',completed:'camp-completed'}[s]||'camp-planned');
  tbody.innerHTML = data.length ? data.map(c=>`
    <tr>
      <td style="font-weight:500">${esc(c.campaign_name)}</td>
      <td><span class="status-badge status-moderate">${esc(c.campaign_type||'–')}</span></td>
      <td>${esc(c.state||'–')}</td>
      <td style="font-size:12px">${esc(c.start_date||'–')}</td>
      <td style="font-size:12px">${esc(c.end_date||'–')}</td>
      <td>${esc(c.team_name||'–')}</td>
      <td><span class="${stCls(c.status)}">${esc(c.status)}</span></td>
    </tr>`).join('') : '<tr><td colspan="7" class="tbl-loading">No campaigns</td></tr>';
}

// ── Logs ──────────────────────────────────────────────────────
async function loadLogs() {
  const data = await fetch('/api/monitoring-logs').then(r=>r.json()).catch(()=>[]);
  const tbody = document.getElementById('logs-tbody');
  if (!tbody) return;
  tbody.innerHTML = data.length ? data.map(l=>`
    <tr>
      <td style="font-weight:500">${esc(l.industry_name||'–')}</td>
      <td><span class="status-badge status-moderate">${esc(l.monitoring_type||'–')}</span></td>
      <td>${esc(l.parameter||'–')}</td>
      <td style="font-family:monospace;font-weight:600">${l.value??'–'}</td>
      <td style="font-size:12px;color:var(--text-3)">${esc(l.unit||'–')}</td>
      <td><span class="status-badge status-good">${esc(l.status||'–')}</span></td>
      <td style="font-size:12px;color:var(--text-3)">${l.created_at?l.created_at.slice(0,10):'–'}</td>
    </tr>`).join('') : '<tr><td colspan="7" class="tbl-loading">No logs yet</td></tr>';
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateStateSelects();
  initTabs();
  loadDashboard();
  loadAlerts();
  loadedCtabs.add('alerts');
  document.getElementById('log-date').value = new Date().toISOString().slice(0,10);
  setInterval(loadDashboard, 60000);
});
