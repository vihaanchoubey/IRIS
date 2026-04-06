// IRIS — shared utilities

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh"
];

function getAQIStatus(aqi) {
  if (aqi <= 50)  return { label:'Good',        cls:'good',       color:'#1a7f37' };
  if (aqi <= 100) return { label:'Satisfactory',cls:'satisfactory',color:'#9a6700' };
  if (aqi <= 150) return { label:'Moderate',    cls:'moderate',   color:'#d4a574' };
  if (aqi <= 250) return { label:'Poor',        cls:'poor',       color:'#bc4c00' };
  if (aqi <= 350) return { label:'Very Poor',   cls:'very-poor',  color:'#cf222e' };
  return               { label:'Severe',       cls:'severe',     color:'#a50d0d' };
}

function populateStateSelect(selectId) {
  const sel = document.getElementById(selectId); if (!sel) return;
  STATES.forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s;
    if (s === 'Delhi') o.selected = true;
    sel.appendChild(o);
  });
}

async function fetchData(url) {
  try { const r = await fetch(url); return await r.json(); }
  catch(e) { console.error('Fetch error:', url, e); return null; }
}

function formatNum(n, dec=1) {
  if (n == null || isNaN(n)) return '–';
  return Number(n).toFixed(dec);
}

function formatAbbrevNum(n) {
  if (n == null || isNaN(n)) return '–';
  const num = Number(n);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num.toFixed(1);
  }
}

function initTicker() {
  const el = document.querySelector('.ticker-time'); if (!el) return;
  const upd = () => { el.textContent = new Date().toLocaleTimeString(); };
  upd(); setInterval(upd, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initTicker();
  // highlight active nav link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === path || (path === '/' && href === '/'));
  });
});
