// IRIS — Map helpers

let indiaMap, stateMap, riverMap;

const STATE_COORDS = {
  "Delhi":[28.7041,77.1025],"Maharashtra":[19.7515,75.7139],"Karnataka":[15.3173,75.7139],
  "Tamil Nadu":[11.1271,78.6569],"Gujarat":[22.2587,71.1924],"Rajasthan":[27.0238,74.2179],
  "Uttar Pradesh":[26.8467,80.9462],"Madhya Pradesh":[22.9734,78.6569],"West Bengal":[22.9868,87.8550],
  "Bihar":[25.0961,85.3131],"Andhra Pradesh":[15.9129,79.7400],"Telangana":[17.1232,79.2089],
  "Odisha":[20.9517,85.0985],"Kerala":[10.8505,76.2711],"Punjab":[31.1471,75.3412],
  "Haryana":[29.0588,76.0856],"Jharkhand":[23.6102,85.2799],"Assam":[26.2006,92.9376],
  "Chhattisgarh":[21.2787,81.8661],"Uttarakhand":[30.0668,79.0193],"Himachal Pradesh":[31.1048,77.1734],
  "Goa":[15.2993,74.1240],"Tripura":[23.9408,91.9882],"Meghalaya":[25.4670,91.3662],
  "Manipur":[24.6637,93.9063],"Nagaland":[26.1584,94.5624],"Arunachal Pradesh":[28.2180,94.7278],
  "Mizoram":[23.1645,92.9376],"Sikkim":[27.5330,88.5122],"Jammu and Kashmir":[33.7782,76.5762],
  "Ladakh":[34.2268,77.5619],"Puducherry":[11.9416,79.8083],"Chandigarh":[30.7333,76.7794]
};

// Major Indian cities with coordinates
const MAJOR_CITIES = {
  "Delhi": [28.7041, 77.1025],
  "Mumbai": [19.0760, 72.8777],
  "Bangalore": [12.9716, 77.5946],
  "Hyderabad": [17.3850, 78.4867],
  "Chennai": [13.0827, 80.2707],
  "Kolkata": [22.5726, 88.3639],
  "Pune": [18.5204, 73.8567],
  "Ahmedabad": [23.0225, 72.5714],
  "Jaipur": [26.9124, 75.7873],
  "Lucknow": [26.8467, 80.9462],
  "Chandigarh": [30.7333, 76.7794],
  "Surat": [21.1702, 72.8311],
  "Indore": [22.7196, 75.8577],
  "Kochi": [9.9312, 76.2673],
  "Nagpur": [21.1458, 79.0882],
  "Coimbatore": [11.0026, 76.9124],
  "Vadodara": [22.3072, 73.1812],
  "Ghaziabad": [28.6692, 77.4538],
  "Ludhiana": [30.9010, 75.8573],
  "Patna": [25.5941, 85.1376],
  "Visakhapatnam": [17.6869, 83.2185],
  "Bhopal": [23.1815, 79.9864],
  "Guwahati": [26.1445, 91.7362],
  "Thiruvananthapuram": [8.5241, 76.9366],
  "Nashik": [19.9975, 73.7898]
};

// River polyline data - corrected geographic coordinates for Indian rivers
const RIVER_POLYLINES = {
  "Ganges": [
    {
      name: "Upper Ganges",
      coords: [[31.7, 77.5], [31.2, 77.3], [30.8, 77.1], [30.3, 77.0], [29.8, 76.8]],
      state: "Himachal Pradesh"
    },
    {
      name: "Ganges in Haryana",
      coords: [[29.8, 76.8], [29.5, 77.2], [29.2, 77.5]],
      state: "Haryana"
    },
    {
      name: "Ganges at Delhi",
      coords: [[29.2, 77.5], [28.8, 77.3], [28.5, 77.2]],
      state: "Delhi"
    },
    {
      name: "Ganges in UP",
      coords: [[28.5, 77.2], [28.0, 78.0], [27.0, 78.5], [26.5, 79.5], [26.0, 80.3], [25.5, 81.5]],
      state: "Uttar Pradesh"
    },
    {
      name: "Ganges in Jharkhand",
      coords: [[25.5, 81.5], [25.2, 82.5], [24.8, 84.0]],
      state: "Jharkhand"
    },
    {
      name: "Ganges in Bihar",
      coords: [[24.8, 84.0], [25.0, 85.5], [25.3, 86.5], [25.5, 87.5]],
      state: "Bihar"
    },
    {
      name: "Ganges in Bengal",
      coords: [[25.5, 87.5], [25.0, 88.5], [24.8, 89.0]],
      state: "West Bengal"
    }
  ],
  "Yamuna": [
    {
      name: "Yamuna Source",
      coords: [[31.8, 77.2], [31.5, 77.1], [31.2, 76.9]],
      state: "Himachal Pradesh"
    },
    {
      name: "Yamuna in Haryana",
      coords: [[31.2, 76.9], [30.8, 77.0], [30.4, 76.9], [30.0, 77.1]],
      state: "Haryana"
    },
    {
      name: "Yamuna at Delhi",
      coords: [[30.0, 77.1], [29.0, 77.2], [28.7, 77.2]],
      state: "Delhi"
    },
    {
      name: "Yamuna in UP",
      coords: [[28.7, 77.2], [28.0, 78.0], [27.0, 78.8], [26.0, 80.0]],
      state: "Uttar Pradesh"
    },
    {
      name: "Yamuna in MP",
      coords: [[26.0, 80.0], [25.0, 80.5], [24.0, 81.0]],
      state: "Madhya Pradesh"
    }
  ],
  "Brahmaputra": [
    {
      name: "Brahmaputra in Arunachal",
      coords: [[28.5, 94.0], [28.0, 93.8], [27.5, 93.5], [27.0, 93.0]],
      state: "Arunachal Pradesh"
    },
    {
      name: "Brahmaputra in Assam",
      coords: [[27.0, 93.0], [26.5, 92.5], [26.0, 91.5], [25.5, 90.5], [25.0, 89.0]],
      state: "Assam"
    },
    {
      name: "Brahmaputra-Meghalaya",
      coords: [[26.5, 92.0], [26.0, 91.5], [25.5, 91.0]],
      state: "Meghalaya"
    }
  ],
  "Godavari": [
    {
      name: "Godavari Source",
      coords: [[19.3, 73.5], [19.0, 74.0], [18.5, 74.5]],
      state: "Maharashtra"
    },
    {
      name: "Godavari in MP",
      coords: [[19.3, 73.5], [19.5, 74.0], [19.8, 74.5], [20.0, 75.0]],
      state: "Madhya Pradesh"
    },
    {
      name: "Godavari in Telangana",
      coords: [[18.5, 74.5], [18.0, 76.0], [17.5, 78.0], [17.0, 79.0]],
      state: "Telangana"
    },
    {
      name: "Godavari in AP",
      coords: [[17.0, 79.0], [16.5, 80.0], [16.0, 81.0], [15.5, 81.5]],
      state: "Andhra Pradesh"
    },
    {
      name: "Godavari-Odisha",
      coords: [[19.5, 84.0], [19.2, 84.5], [19.0, 85.0]],
      state: "Odisha"
    }
  ],
  "Krishna": [
    {
      name: "Krishna Source",
      coords: [[15.5, 75.0], [15.3, 75.5], [15.0, 76.0]],
      state: "Karnataka"
    },
    {
      name: "Krishna in Karnataka",
      coords: [[15.5, 75.0], [15.2, 75.5], [15.0, 76.0], [14.8, 76.5]],
      state: "Karnataka"
    },
    {
      name: "Krishna in Telangana",
      coords: [[16.5, 78.5], [16.0, 79.0], [15.5, 79.5]],
      state: "Telangana"
    },
    {
      name: "Krishna in AP",
      coords: [[15.5, 79.5], [15.0, 80.0], [14.5, 80.5]],
      state: "Andhra Pradesh"
    }
  ],
  "Cauvery": [
    {
      name: "Cauvery Source",
      coords: [[13.2, 75.5], [13.0, 76.0], [12.8, 76.5]],
      state: "Karnataka"
    },
    {
      name: "Cauvery in Karnataka",
      coords: [[13.2, 75.5], [12.8, 76.0], [12.5, 76.5], [12.2, 77.0]],
      state: "Karnataka"
    },
    {
      name: "Cauvery in TN",
      coords: [[12.2, 77.0], [11.8, 77.5], [11.5, 78.0], [11.2, 78.5]],
      state: "Tamil Nadu"
    }
  ],
  "Indus": [
    {
      name: "Indus Source",
      coords: [[32.5, 76.5], [32.2, 76.2], [31.8, 75.8]],
      state: "Himachal Pradesh"
    },
    {
      name: "Indus in HP",
      coords: [[32.5, 76.5], [32.0, 76.0], [31.5, 75.5], [31.2, 75.0]],
      state: "Himachal Pradesh"
    },
    {
      name: "Indus in Punjab",
      coords: [[31.2, 75.0], [31.0, 74.5], [30.8, 74.0], [30.5, 73.5]],
      state: "Punjab"
    },
    {
      name: "Indus in J&K",
      coords: [[33.5, 75.5], [33.0, 75.0], [32.5, 74.5]],
      state: "Jammu and Kashmir"
    }
  ],
  "Narmada": [
    {
      name: "Narmada Source",
      coords: [[22.8, 81.0], [22.6, 80.8], [22.4, 80.5]],
      state: "Madhya Pradesh"
    },
    {
      name: "Narmada in MP",
      coords: [[22.8, 81.0], [22.5, 80.5], [22.2, 80.0], [22.0, 79.0]],
      state: "Madhya Pradesh"
    },
    {
      name: "Narmada between MP-Gujarat",
      coords: [[22.0, 79.0], [21.8, 78.0], [21.5, 77.0]],
      state: "Madhya Pradesh"
    },
    {
      name: "Narmada in Gujarat",
      coords: [[21.5, 77.0], [21.2, 75.5], [21.0, 73.5]],
      state: "Gujarat"
    }
  ],
  "Mahanadi": [
    {
      name: "Mahanadi Source",
      coords: [[22.5, 81.5], [22.2, 82.0], [22.0, 82.5]],
      state: "Chhattisgarh"
    },
    {
      name: "Mahanadi in Chhattisgarh",
      coords: [[22.5, 81.5], [22.0, 82.0], [21.5, 82.5], [21.0, 83.0]],
      state: "Chhattisgarh"
    },
    {
      name: "Mahanadi in Odisha",
      coords: [[21.0, 83.0], [20.5, 84.0], [20.2, 84.5], [20.0, 85.0]],
      state: "Odisha"
    }
  ]
};

// River pollution levels by state (0-3: 0=Low, 1=Moderate, 2=High, 3=Very High)
const RIVER_STATE_POLLUTION = {
  "Ganges": {
    "Himachal Pradesh": 0,
    "Haryana": 1,
    "Delhi": 3,
    "Uttar Pradesh": 2,
    "Bihar": 3,
    "Jharkhand": 2,
    "West Bengal": 2
  },
  "Yamuna": {
    "Himachal Pradesh": 1,
    "Haryana": 2,
    "Delhi": 3,
    "Uttar Pradesh": 2,
    "Madhya Pradesh": 1
  },
  "Brahmaputra": {
    "Arunachal Pradesh": 0,
    "Assam": 1,
    "Meghalaya": 1
  },
  "Godavari": {
    "Maharashtra": 1,
    "Madhya Pradesh": 1,
    "Telangana": 2,
    "Andhra Pradesh": 1,
    "Odisha": 1
  },
  "Krishna": {
    "Karnataka": 1,
    "Telangana": 2,
    "Andhra Pradesh": 1
  },
  "Cauvery": {
    "Karnataka": 1,
    "Tamil Nadu": 1
  },
  "Indus": {
    "Himachal Pradesh": 0,
    "Punjab": 2,
    "Jammu and Kashmir": 1
  },
  "Narmada": {
    "Madhya Pradesh": 2,
    "Gujarat": 2
  },
  "Mahanadi": {
    "Chhattisgarh": 2,
    "Odisha": 1
  }
};

function initIndiaMap(containerId, data) {
  if (indiaMap) { indiaMap.remove(); indiaMap = null; }
  indiaMap = L.map(containerId, { center:[22.5,82.5], zoom:4, minZoom:3, maxZoom:10, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(indiaMap);
  
  // Store city layer for zoom-based visibility control
  const cityLayer = L.featureGroup();
  
  if (data) {
    data.forEach(row => {
      const coords = STATE_COORDS[row.state]; if (!coords) return;
      const st = getAQIStatus(row.aqi||0);
      L.circleMarker(coords, { radius:8, fillColor:st.color, color:'#fff', weight:1.5, fillOpacity:.85 })
       .addTo(indiaMap)
       .bindPopup(`
         <div style="font-family:'Inter',sans-serif;min-width:140px">
           <div style="font-weight:600;font-size:13px;color:#1f2328;margin-bottom:4px">${row.state}</div>
           <div style="font-weight:700;font-size:18px;color:${st.color};font-family:'Roboto Mono',monospace">${row.aqi||'–'}</div>
           <div style="font-size:11px;font-weight:600;color:${st.color};margin-bottom:7px">${st.label}</div>
           <div style="font-size:11.5px;color:#636c76;line-height:1.8">
             PM2.5 ${formatNum(row.pm25)} · PM10 ${formatNum(row.pm10)}<br>
             NO₂ ${formatNum(row.no2)} · SO₂ ${formatNum(row.so2)}
           </div>
         </div>
       `, { className:'iris-popup' });
    });
  }
  
  // Add major city markers with zoom-based visibility
  for (const [city, coords] of Object.entries(MAJOR_CITIES)) {
    const cityMarker = L.circleMarker(coords, {
      radius: 5,
      fillColor: '#ef4444',
      color: '#991b1b',
      weight: 1.5,
      opacity: 0.9,
      fillOpacity: 0.8
    });
    
    cityMarker.bindPopup(`
      <div style="font-family:'Inter',sans-serif;">
        <div style="font-weight:600;font-size:13px;color:#1f2328;">${city}</div>
        <div style="font-size:11px;color:#636c76;">City Monitoring</div>
      </div>
    `, { className:'iris-popup' });
    
    cityLayer.addLayer(cityMarker);
  }
  
  // Control city marker visibility based on zoom level
  indiaMap.on('zoomend', function() {
    const currentZoom = indiaMap.getZoom();
    if (currentZoom >= 5) {
      if (!indiaMap.hasLayer(cityLayer)) {
        cityLayer.addTo(indiaMap);
      }
    } else {
      if (indiaMap.hasLayer(cityLayer)) {
        indiaMap.removeLayer(cityLayer);
      }
    }
  });
  
  // Add city layer if starting zoom is high enough
  if (indiaMap.getZoom() >= 5) {
    cityLayer.addTo(indiaMap);
  }
}

function initStateMap(containerId, state) {
  if (stateMap) { stateMap.remove(); stateMap = null; }
  const coords = STATE_COORDS[state]||[22.5,82.5];
  stateMap = L.map(containerId, { center:coords, zoom:7, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(stateMap);
  L.circleMarker(coords, { radius:11, fillColor:'#0969da', color:'#fff', weight:2, fillOpacity:.8 })
   .addTo(stateMap)
   .bindPopup(`<span style="font-family:'Inter',sans-serif;font-weight:600;color:#1f2328">${state}</span>`)
   .openPopup();
}

function getRiverColor(pollutionLevel) {
  const colors = ['#1a7f37', '#9a6700', '#bc4c00', '#cf222e'];
  return colors[Math.max(0, Math.min(3, pollutionLevel))] || '#1a7f37';
}

function initRiverMap(containerId) {
  console.log('Initializing river map for', containerId);
  if (riverMap) { riverMap.remove(); riverMap = null; }
  riverMap = L.map(containerId, { center:[22.5,82.5], zoom:4, minZoom:3, maxZoom:10, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(riverMap);
  
  // River name label positions (strategic points along each river)
  const RIVER_LABELS = {
    "Ganges": [25.5, 82.5],
    "Yamuna": [28.5, 77.5],
    "Brahmaputra": [26.5, 92.5],
    "Godavari": [17.5, 79.5],
    "Krishna": [16.0, 79.5],
    "Cauvery": [11.5, 77.0],
    "Indus": [31.5, 75.5],
    "Narmada": [22.0, 77.5],
    "Mahanadi": [20.5, 83.5]
  };
  
  // Draw river polylines with state-based color coding
  Object.keys(RIVER_POLYLINES).forEach(riverName => {
    const riverSegments = RIVER_POLYLINES[riverName];
    riverSegments.forEach(segment => {
      const state = segment.state;
      const pollutionLevel = (RIVER_STATE_POLLUTION[riverName] && RIVER_STATE_POLLUTION[riverName][state]) || 0;
      const color = getRiverColor(pollutionLevel);
      
      const polyline = L.polyline(segment.coords, {
        color: color,
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(riverMap);
      
      polyline.bindPopup(`
        <div style="font-family:'Inter',sans-serif;">
          <div style="font-weight:600;font-size:13px;color:#1f2328;margin-bottom:4px">${riverName}</div>
          <div style="font-size:12px;color:#636c76;margin-bottom:4px">${state}</div>
          <div style="font-weight:700;font-size:14px;color:${color}">
            Pollution Level: ${['Low', 'Moderate', 'High', 'Very High'][pollutionLevel]}
          </div>
        </div>
      `, { className:'iris-popup' });
    });
    
    // Add river name label
    if (RIVER_LABELS[riverName]) {
      L.marker(RIVER_LABELS[riverName], {
        icon: L.divIcon({
          className: 'river-label',
          html: `<div style="font-size:12px;font-weight:700;color:#1f2328;background:rgba(255,255,255,0.9);padding:4px 6px;border-radius:4px;border:2px solid #d1d9e0;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${riverName}</div>`,
          iconSize: [80, 25],
          iconAnchor: [40, 12]
        })
      }).addTo(riverMap);
    }
  });
}

async function loadHomeMap() {
  const el = document.getElementById('india-map'); if (!el) return;
  const data = await fetchData('/api/aqi');
  initIndiaMap('india-map', data);
  const riverEl = document.getElementById('river-map');
  console.log('River map element:', riverEl);
  if (riverEl) {
    initRiverMap('river-map');
  } else {
    console.log('River map element not found');
  }
}

document.addEventListener('DOMContentLoaded', loadHomeMap);
