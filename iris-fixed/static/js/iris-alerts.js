// ── IRIS Auto Alerts — Severity Banner System ─────────────────────
(function() {
  const THRESHOLDS = {
    AQI_SEVERE: 350, AQI_VERY_POOR: 201,
    PH_LOW: 6.5, PH_HIGH: 8.5,
    TDS_HIGH: 500, ARSENIC_HIGH: 0.01, FLUORIDE_HIGH: 1.5,
    DB_RESIDENTIAL: 55, DB_COMMERCIAL: 65, DB_INDUSTRIAL: 75,
    CO2_HIGH: 80
  };

  let alertQueue = [];
  let alertIdx = 0;
  let rotateTimer = null;
  let bar = null;

  // ── Build the bar DOM ─────────────────────────────────────────────
  function buildBar() {
    bar = document.createElement('div');
    bar.id = 'iris-alert-bar';
    bar.innerHTML = `
      <div class="iab-inner">
        <div class="iab-left">
          <span class="iab-icon" id="iab-icon">🚨</span>
          <div class="iab-text-wrap">
            <span class="iab-label" id="iab-label">Alert</span>
            <span class="iab-msg" id="iab-msg"></span>
          </div>
        </div>
        <div class="iab-right">
          <div class="iab-dots" id="iab-dots"></div>
          <div class="iab-counter" id="iab-counter"></div>
          <button class="iab-prev" id="iab-prev" title="Previous">‹</button>
          <button class="iab-next" id="iab-next" title="Next">›</button>
          <button class="iab-close" id="iab-close" title="Dismiss">✕</button>
        </div>
      </div>
      <div class="iab-progress" id="iab-progress"><div class="iab-progress-fill" id="iab-progress-fill"></div></div>
    `;
    document.body.appendChild(bar);

    document.getElementById('iab-close').onclick = () => {
      bar.classList.remove('iab-visible');
      clearInterval(rotateTimer);
    };
    document.getElementById('iab-prev').onclick = () => { alertIdx = (alertIdx - 1 + alertQueue.length) % alertQueue.length; renderAlert(); resetTimer(); };
    document.getElementById('iab-next').onclick = () => { alertIdx = (alertIdx + 1) % alertQueue.length; renderAlert(); resetTimer(); };
  }

  // ── Render current alert ──────────────────────────────────────────
  function renderAlert() {
    if (!alertQueue.length || !bar) return;
    const a = alertQueue[alertIdx % alertQueue.length];

    // severity colours
    const themes = {
      critical: { bg:'#7f1d1d', border:'#dc2626', icon:'🔴', label:'CRITICAL' },
      high:     { bg:'#78350f', border:'#f59e0b', icon:'🟠', label:'HIGH ALERT' },
      medium:   { bg:'#1e3a5f', border:'#3b82f6', icon:'🔵', label:'ADVISORY' },
    };
    const t = themes[a.severity] || themes.medium;

    bar.style.setProperty('--iab-bg', t.bg);
    bar.style.setProperty('--iab-border', t.border);
    document.getElementById('iab-icon').textContent = t.icon;
    document.getElementById('iab-label').textContent = t.label;
    document.getElementById('iab-msg').textContent = a.message;
    document.getElementById('iab-counter').textContent = alertQueue.length > 1 ? `${alertIdx + 1} / ${alertQueue.length}` : '';

    // dots
    const dotsEl = document.getElementById('iab-dots');
    if (alertQueue.length > 1) {
      dotsEl.innerHTML = alertQueue.map((_, i) =>
        `<span class="iab-dot${i === alertIdx % alertQueue.length ? ' active' : ''}" data-i="${i}"></span>`
      ).join('');
      dotsEl.querySelectorAll('.iab-dot').forEach(d =>
        d.addEventListener('click', () => { alertIdx = +d.dataset.i; renderAlert(); resetTimer(); })
      );
    } else {
      dotsEl.innerHTML = '';
    }

    // progress bar animation restart
    const fill = document.getElementById('iab-progress-fill');
    fill.style.transition = 'none';
    fill.style.width = '0%';
    setTimeout(() => {
      fill.style.transition = 'width 5s linear';
      fill.style.width = '100%';
    }, 50);
  }

  function resetTimer() {
    clearInterval(rotateTimer);
    if (alertQueue.length > 1) {
      rotateTimer = setInterval(() => {
        alertIdx = (alertIdx + 1) % alertQueue.length;
        renderAlert();
      }, 5000);
    }
  }

  // ── Check conditions ──────────────────────────────────────────────
  async function checkConditions() {
    alertQueue = [];
    alertIdx = 0;
    
    // Determine if there are critical alerts for flashing animation
    const hasCritical = () => alertQueue.some(a => a.severity === 'critical');

    const fmt = (n, d=1) => n != null && !isNaN(n) ? Number(n).toFixed(d) : '–';

    try {
      // Use the dedicated anomalies endpoint
      const anomRes = await fetch('/api/anomalies').then(r => r.json()).catch(() => null);
      if (anomRes && anomRes.anomalies) {
        anomRes.anomalies.forEach(a => {
          alertQueue.push({ severity: a.severity, message: a.message, type: a.type });
        });
      } else {
        // Fallback: check raw data
        const [aqi, water, noise] = await Promise.all([
          fetch('/api/aqi').then(r=>r.json()).catch(()=>[]),
          fetch('/api/water').then(r=>r.json()).catch(()=>[]),
          fetch('/api/noise').then(r=>r.json()).catch(()=>[]),
        ]);
        aqi.forEach(row => {
          if ((row.aqi||0) >= THRESHOLDS.AQI_SEVERE)
            alertQueue.push({ severity: row.aqi>=350?'critical':'high', message: `${row.state}: AQI ${row.aqi} — Severe/Hazardous. Avoid all outdoor activity.`, type:'AQI' });
          else if ((row.aqi||0) >= THRESHOLDS.AQI_VERY_POOR)
            alertQueue.push({ severity:'medium', message: `${row.state}: AQI ${row.aqi} — Very Poor air quality. Limit outdoor exposure.`, type:'AQI' });
        });
        water.forEach(row => {
          if (row.ph < THRESHOLDS.PH_LOW || row.ph > THRESHOLDS.PH_HIGH)
            alertQueue.push({ severity:'high', message: `${row.state}: Water pH ${fmt(row.ph,1)} — Outside safe range (6.5–8.5).`, type:'Water' });
          if ((row.arsenic||0) > THRESHOLDS.ARSENIC_HIGH)
            alertQueue.push({ severity: row.arsenic>0.05?'critical':'high', message: `${row.state}: Arsenic ${row.arsenic} mg/L — exceeds WHO limit (0.01 mg/L).`, type:'Water' });
          if ((row.fluoride||0) > THRESHOLDS.FLUORIDE_HIGH)
            alertQueue.push({ severity:'high', message: `${row.state}: Fluoride ${fmt(row.fluoride,2)} mg/L — exceeds BIS limit (1.5 mg/L).`, type:'Water' });
        });
      }

      // Deduplicate
      const seen = new Set();
      alertQueue = alertQueue.filter(a => {
        const k = a.message.slice(0,40);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });

      // Sort critical first
      const order = {critical:0,high:1,medium:2};
      alertQueue.sort((a,b) => (order[a.severity]||3)-(order[b.severity]||3));

      // Limit to 10-12 most critical alerts
      alertQueue = alertQueue.slice(0, 12);

      if (!bar) buildBar();

      if (alertQueue.length > 0) {
        renderAlert();
        bar.classList.add('iab-visible');
        document.body.classList.add('alert-visible');
        // Add flashing class if critical alerts exist
        if (hasCritical()) {
          bar.classList.add('iab-flashing');
        } else {
          bar.classList.remove('iab-flashing');
        }
        resetTimer();
      } else {
        bar.classList.remove('iab-visible');
        bar.classList.remove('iab-flashing');
        document.body.classList.remove('alert-visible');
      }
    } catch(e) { console.warn('[IRIS Alerts]', e); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkConditions, 1200);
    setInterval(checkConditions, 300000); // re-check every 5 min
  });
})();
