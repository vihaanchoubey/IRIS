// IRIS — Chart helpers (neutral palette, Inter font)

const CGRID = 'rgba(0,0,0,.05)';
const CTICK = '#848d97';
const CFONT = "'Inter',system-ui,sans-serif";
const CMONO = "'Roboto Mono',monospace";

function fmtLabel(ts) {
  if (!ts) return '';
  const d = (ts+'').replace('T',' ').split(' ')[0];
  const [,m,day] = d.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+parseInt(day);
}

const tooltipDefaults = {
  backgroundColor:'#fff',
  borderColor:'#d0d7de',
  borderWidth:1,
  titleColor:'#1f2328',
  bodyColor:'#636c76',
  titleFont:{ family:CFONT, size:12, weight:'600' },
  bodyFont: { family:CMONO, size:12 },
  padding:10, cornerRadius:8,
};

function scaleDefaults() {
  return {
    x:{ grid:{color:CGRID,drawBorder:false}, ticks:{color:CTICK,font:{family:CFONT,size:11},maxRotation:0,autoSkip:true,maxTicksLimit:7} },
    y:{ grid:{color:CGRID,drawBorder:false}, ticks:{color:CTICK,font:{family:CFONT,size:11}}, beginAtZero:true }
  };
}

function createBarChart(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  return new Chart(ctx, {
    type:'bar',
    data:{
      labels,
      datasets: datasets.map(d => ({
        label: d.label||'',
        data:  d.data,
        backgroundColor: d.color || 'rgba(9,105,218,.65)',
        borderRadius: 4,
        borderSkipped: false,
      }))
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:500 },
      plugins:{ legend:{ display: datasets.length > 1, labels:{color:CTICK,font:{family:CFONT,size:11},boxWidth:10} }, tooltip:tooltipDefaults },
      scales: scaleDefaults()
    }
  });
}

function createLineChart(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  return new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets: datasets.map(d => ({
        label: d.label||'',
        data:  d.data,
        borderColor:     d.color || '#0969da',
        backgroundColor: d.bg    || 'rgba(9,105,218,.06)',
        borderWidth: 1.5,
        pointRadius: 3,
        pointBackgroundColor: d.color||'#0969da',
        pointBorderColor:'#fff', pointBorderWidth:1.5,
        fill:true, tension:0.3
      }))
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:500 },
      plugins:{ legend:{ display: datasets.length > 1, labels:{color:CTICK,font:{family:CFONT,size:11},boxWidth:10} }, tooltip:tooltipDefaults },
      scales: scaleDefaults()
    }
  });
}
