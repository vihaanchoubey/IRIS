// ── Location Tracking & Pollution Monitoring System ─────────────────────────────────────
// Monitors user location and tracks pollution levels in real-time
// Sends alerts when pollution exceeds safe limits

class LocationPollutionTracker {
  constructor() {
    this.userLocation = null;
    this.isTracking = false;
    this.pollutionLevel = null;
    this.notificationPermission = null;
    this.monitoringInterval = null;
    this.periodicNotificationInterval = null;
    this.checkInterval = 30000; // Check every 30 seconds
    this.notificationInterval = 1800000; // Notify every 30 minutes (1800000 ms)
    this.lastNotificationTime = 0;
    this.pollutionThresholds = {
      aqi: 150, // Poor level
      ph: null, // Water pH
      noise: 70, // High noise
      co2: 500, // High emissions
    };
    this.init();
  }

  init() {
    // Wait for user to be logged in
    this.checkUserLoginAndInitialize();
  }

  checkUserLoginAndInitialize() {
    const user = this.getUser();
    if (user && user.id) {
      this.startTracking();
    } else {
      // Check again after 2 seconds if user not logged in yet
      setTimeout(() => this.checkUserLoginAndInitialize(), 2000);
    }
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('iris_user'));
    } catch (e) {
      return null;
    }
  }

  async startTracking() {
    if (this.isTracking) return;

    console.log('[LocationTracker] Starting location tracking...');

    // Request notification permission first
    await this.requestNotificationPermission();

    // Request geolocation
    this.requestGeolocation();

    // Start periodic monitoring
    this.startMonitoring();
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('[LocationTracker] Notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      console.log('[LocationTracker] Notification permission already granted');
      return;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        console.log('[LocationTracker] Notification permission:', permission);
      } catch (e) {
        console.error('[LocationTracker] Error requesting notification permission:', e);
      }
    }
  }

  requestGeolocation() {
    if (!navigator.geolocation) {
      console.warn('[LocationTracker] Geolocation API not supported');
      this.showAlert('Geolocation not supported in your browser', 'warning');
      return;
    }

    // Show permission request to user
    this.showPermissionPrompt();

    navigator.geolocation.getCurrentPosition(
      (position) => this.handleLocationSuccess(position),
      (error) => this.handleLocationError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Also watch position for continuous tracking
    navigator.geolocation.watchPosition(
      (position) => this.handleLocationSuccess(position),
      (error) => this.handleLocationError(error),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    this.isTracking = true;
  }

  showPermissionPrompt() {
    const existing = document.getElementById('location-permission-prompt');
    if (existing) return;

    const prompt = document.createElement('div');
    prompt.id = 'location-permission-prompt';
    prompt.style.cssText = `
      position: fixed;
      top: 130px;
      right: 20px;
      background: white;
      border: 2px solid #0969da;
      border-radius: 8px;
      padding: 16px 20px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 350px;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;

    prompt.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: 500; color: #0969da;">📍 Location Permission</div>
      <div style="color: #636c76; margin-bottom: 12px; line-height: 1.4;">IRIS would like to access your location to monitor pollution levels in your area and alert you about air quality changes.</div>
      <div style="display: flex; gap: 8px;">
        <button id="location-allow" style="flex: 1; padding: 8px 12px; background: #0969da; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Allow</button>
        <button id="location-deny" style="flex: 1; padding: 8px 12px; background: #d1d9e0; color: #1f2328; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Deny</button>
      </div>
    `;

    document.body.appendChild(prompt);

    document.getElementById('location-allow').addEventListener('click', () => {
      prompt.remove();
    });

    document.getElementById('location-deny').addEventListener('click', () => {
      prompt.remove();
      this.showAlert('Location tracking disabled. You can enable it in browser settings.', 'info');
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (existing === null) {
        prompt.remove();
      }
    }, 10000);
  }

  handleLocationSuccess(position) {
    const { latitude, longitude } = position.coords;

    if (
      this.userLocation &&
      this.userLocation.lat === latitude &&
      this.userLocation.lng === longitude
    ) {
      return; // Location hasn't changed
    }

    this.userLocation = { lat: latitude, lng: longitude };
    console.log('[LocationTracker] Location updated:', this.userLocation);

    // Update UI
    this.updateLocationUI();

    // Fetch pollution data for this location
    this.fetchPollutionData();
  }

  handleLocationError(error) {
    console.error('[LocationTracker] Geolocation error:', error.message);
    let message = 'Unable to access your location';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Check browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out.';
        break;
    }
    this.showAlert(message, 'warning');
  }

  startMonitoring() {
    if (this.monitoringInterval) return;

    console.log('[LocationTracker] Starting pollution monitoring...');

    // Initial fetch
    this.fetchPollutionData();

    // Periodic monitoring (every 30 seconds)
    this.monitoringInterval = setInterval(() => {
      this.fetchPollutionData();
    }, this.checkInterval);

    // Periodic notifications (every 30 minutes)
    this.periodicNotificationInterval = setInterval(() => {
      this.sendPeriodicPollutionNotification();
    }, this.notificationInterval);

    // Send first notification after 30 minutes
    setTimeout(() => {
      this.sendPeriodicPollutionNotification();
    }, this.notificationInterval);
  }

  async fetchPollutionData() {
    if (!this.userLocation) {
      console.warn('[LocationTracker] No location data available');
      return;
    }

    try {
      // Get nearest state based on coordinates
      const state = this.getNearestState(
        this.userLocation.lat,
        this.userLocation.lng
      );

      if (!state) {
        console.warn('[LocationTracker] Could not determine nearest state');
        return;
      }

      // Fetch AQI data for the state
      const aqiResponse = await fetch(`/api/aqi?state=${encodeURIComponent(state)}`);
      const aqiData = await aqiResponse.json();

      if (aqiData && aqiData.length > 0) {
        const latestAqi = aqiData[0];
        this.pollutionLevel = {
          aqi: latestAqi.aqi,
          state: latestAqi.state,
          pm25: latestAqi.pm25,
          pm10: latestAqi.pm10,
          timestamp: latestAqi.timestamp,
        };

        console.log('[LocationTracker] Pollution data:', this.pollutionLevel);

        // Update UI
        this.updatePollutionUI();

        // Check thresholds and alert if needed
        this.checkAndAlertPollution();
      }
    } catch (error) {
      console.error('[LocationTracker] Error fetching pollution data:', error);
    }
  }

  getNearestState(lat, lng) {
    // Map of approximate coordinates for Indian states (capital city locations)
    const stateCoordinates = {
      Delhi: { lat: 28.704, lng: 77.1025 },
      Maharashtra: { lat: 19.758, lng: 75.7139 },
      Karnataka: { lat: 15.2993, lng: 75.8245 },
      'Tamil Nadu': { lat: 13.0827, lng: 80.2707 },
      Gujarat: { lat: 23.1815, lng: 72.6369 },
      Rajasthan: { lat: 26.9124, lng: 75.7873 },
      'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
      'Madhya Pradesh': { lat: 23.1815, lng: 79.9864 },
      'West Bengal': { lat: 22.5726, lng: 88.363 },
      Bihar: { lat: 25.5941, lng: 85.1376 },
      'Andhra Pradesh': { lat: 16.5062, lng: 80.648 },
      Telangana: { lat: 17.3850, lng: 78.4867 },
      Odisha: { lat: 20.2961, lng: 85.8245 },
      Kerala: { lat: 10.8505, lng: 76.2711 },
      Punjab: { lat: 31.5204, lng: 74.3587 },
      Haryana: { lat: 29.0588, lng: 77.0745 },
      Jharkhand: { lat: 23.6102, lng: 85.2799 },
      Assam: { lat: 26.1445, lng: 91.7362 },
      Chhattisgarh: { lat: 21.1458, lng: 81.6882 },
      Uttarakhand: { lat: 30.0668, lng: 79.0193 },
      'Himachal Pradesh': { lat: 31.1471, lng: 77.1734 },
      Goa: { lat: 15.3, lng: 73.8333 },
      Tripura: { lat: 23.8103, lng: 91.2869 },
      Meghalaya: { lat: 25.5788, lng: 91.8933 },
      Manipur: { lat: 24.9986, lng: 94.7833 },
      Nagaland: { lat: 26.1645, lng: 94.5604 },
      'Arunachal Pradesh': { lat: 28.2282, lng: 92.7365 },
      Mizoram: { lat: 23.1815, lng: 92.9789 },
      Sikkim: { lat: 27.5330, lng: 88.5122 },
      'Jammu and Kashmir': { lat: 34.1526, lng: 77.5770 },
      Ladakh: { lat: 34.2268, lng: 77.5619 },
      Puducherry: { lat: 12.1697, lng: 79.8711 },
      Chandigarh: { lat: 30.7333, lng: 76.8333 },
    };

    let nearestState = null;
    let minDistance = Infinity;

    for (const [state, coords] of Object.entries(stateCoordinates)) {
      const distance = this.calculateDistance(
        lat,
        lng,
        coords.lat,
        coords.lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestState = state;
      }
    }

    return nearestState;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  checkAndAlertPollution() {
    if (!this.pollutionLevel) return;

    const aqi = this.pollutionLevel.aqi;
    const threshold = this.pollutionThresholds.aqi;

    // Determine alert level
    let alertLevel = null;
    let alertMessage = null;
    let alertTitle = null;
    let severity = null;

    if (aqi >= 350) {
      alertLevel = 'severe';
      alertTitle = '🚨 SEVERE POLLUTION';
      alertMessage = `Air Quality Index is ${aqi} (SEVERE). Avoid outdoor activities. Stay indoors.`;
      severity = 'critical';
    } else if (aqi >= 250) {
      alertLevel = 'very-poor';
      alertTitle = '⚠️ VERY POOR AIR QUALITY';
      alertMessage = `Air Quality Index is ${aqi} (Very Poor). Vulnerable groups should avoid outdoors.`;
      severity = 'high';
    } else if (aqi >= 150) {
      alertLevel = 'poor';
      alertTitle = '⚠️ POOR AIR QUALITY';
      alertMessage = `Air Quality Index is ${aqi} (Poor). Consider limiting outdoor activities.`;
      severity = 'medium';
    } else if (aqi >= 100) {
      alertLevel = 'moderate';
      alertTitle = '⚡ MODERATE POLLUTION';
      alertMessage = `Air Quality Index is ${aqi} (Moderate). Some people may experience symptoms.`;
      severity = 'low';
    }

    if (alertLevel) {
      // Send notification
      this.sendNotification(alertTitle, {
        body: alertMessage,
        icon: '/static/images/iris-icon.png',
        badge: '/static/images/iris-badge.png',
        tag: 'pollution-alert',
        requireInteraction: severity === 'critical' || severity === 'high',
      });

      // Update UI
      this.showPollutionAlert(alertLevel, alertTitle, alertMessage, aqi);
    }
  }

  sendPeriodicPollutionNotification() {
    if (!this.pollutionLevel) {
      console.log('[LocationTracker] No pollution data available for periodic notification');
      return;
    }

    if (this.notificationPermission !== 'granted') {
      console.warn('[LocationTracker] Notification permission not granted for periodic notification');
      return;
    }

    const aqi = this.pollutionLevel.aqi;
    const state = this.pollutionLevel.state;
    const aqiStatus = this.getAQIStatus(aqi);
    const pm25 = this.pollutionLevel.pm25 || '–';

    const title = `📊 Pollution Update - ${state}`;
    const body = `AQI: ${aqi} (${aqiStatus.label}) | PM2.5: ${pm25} µg/m³`;

    console.log('[LocationTracker] Sending periodic pollution notification:', { title, body });

    this.sendNotification(title, {
      body: body,
      icon: '/static/images/iris-icon.png',
      badge: '/static/images/iris-badge.png',
      tag: 'periodic-pollution-update',
      requireInteraction: false,
    });

    this.lastNotificationTime = Date.now();
  }

  sendNotification(title, options) {
    if (this.notificationPermission !== 'granted') {
      console.warn('[LocationTracker] Notification permission not granted');
      return;
    }

    try {
      new Notification(title, options);
    } catch (e) {
      console.error('[LocationTracker] Error sending notification:', e);
    }
  }

  updateLocationUI() {
    const segment = document.getElementById('location-pollution-segment');
    if (!segment) return;

    const lat = this.userLocation.lat.toFixed(4);
    const lng = this.userLocation.lng.toFixed(4);

    const locationInfo = segment.querySelector('.location-info');
    if (locationInfo) {
      locationInfo.innerHTML = `
        <div style="font-size: 12px; color: #636c76;">
          📍 <strong>Your Location:</strong><br>
          Lat: ${lat}, Lng: ${lng}
        </div>
      `;
    }
  }

  updatePollutionUI() {
    const segment = document.getElementById('location-pollution-segment');
    if (!segment) return;

    const pollutionInfo = segment.querySelector('.pollution-info');
    if (!pollutionInfo || !this.pollutionLevel) return;

    const aqi = this.pollutionLevel.aqi;
    const state = this.pollutionLevel.state;
    const pm25 = this.pollutionLevel.pm25 || '–';
    const pm10 = this.pollutionLevel.pm10 || '–';

    let aqiStatus = this.getAQIStatus(aqi);

    pollutionInfo.innerHTML = `
      <div style="margin: 12px 0; padding: 12px; background: #f6f8fb; border-radius: 6px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #1f2328;">
          🌍 Pollution in ${state}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
          <div>
            <div style="color: #636c76; margin-bottom: 4px;">AQI</div>
            <div style="font-size: 24px; font-weight: bold; color: ${aqiStatus.color};">${aqi}</div>
            <div style="color: #8590a2; font-size: 11px;">${aqiStatus.label}</div>
          </div>
          <div>
            <div style="color: #636c76; margin-bottom: 4px;">Pollutants</div>
            <div style="font-size: 12px; line-height: 1.6;">
              PM2.5: <strong>${pm25}</strong> µg/m³<br>
              PM10: <strong>${pm10}</strong> µg/m³
            </div>
          </div>
        </div>
      </div>
    `;
  }

  showPollutionAlert(level, title, message, aqi) {
    // Remove existing alert
    const existing = document.getElementById('pollution-alert-banner');
    if (existing) existing.remove();

    const colors = {
      severe: { bg: '#a50d0d', border: '#cf222e' },
      'very-poor': { bg: '#cf222e', border: '#ff6b6b' },
      poor: { bg: '#bc4c00', border: '#d4a574' },
      moderate: { bg: '#9a6700', border: '#d4a574' },
    };

    const color = colors[level] || colors.moderate;

    const alert = document.createElement('div');
    alert.id = 'pollution-alert-banner';
    alert.style.cssText = `
      position: fixed;
      top: 130px;
      left: 20px;
      background: ${color.bg};
      border: 2px solid ${color.border};
      border-radius: 8px;
      padding: 16px 20px;
      color: white;
      z-index: 999;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease-out;
    `;

    alert.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">${title}</div>
      <div style="font-size: 13px; line-height: 1.4; margin-bottom: 10px;">${message}</div>
      <div style="display: flex; gap: 10px;">
        <button onclick="this.parentElement.parentElement.remove()" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Dismiss</button>
        <a href="/aqi" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.3); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; text-decoration: none; text-align: center;">View AQI</a>
      </div>
    `;

    document.body.appendChild(alert);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => alert.remove(), 300);
      }
    }, 10000);
  }

  getAQIStatus(aqi) {
    if (aqi <= 50) return { label: 'Good', color: '#1a7f37' };
    if (aqi <= 100) return { label: 'Satisfactory', color: '#9a6700' };
    if (aqi <= 150) return { label: 'Moderate', color: '#d4a574' };
    if (aqi <= 250) return { label: 'Poor', color: '#bc4c00' };
    if (aqi <= 350) return { label: 'Very Poor', color: '#cf222e' };
    return { label: 'Severe', color: '#a50d0d' };
  }

  showAlert(message, type) {
    const alert = document.createElement('div');
    alert.style.cssText = `
      position: fixed;
      top: 130px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      z-index: 1000;
      font-size: 13px;
      animation: slideIn 0.3s ease-out;
    `;

    const bgColors = {
      warning: '#bc601a',
      info: '#0969da',
      error: '#cf222e',
      success: '#1a7f37',
    };

    alert.style.backgroundColor = bgColors[type] || bgColors.info;
    alert.textContent = message;

    document.body.appendChild(alert);

    setTimeout(() => {
      alert.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => alert.remove(), 300);
    }, 4000);
  }
}

// Initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LocationPollutionTracker();
  });
} else {
  new LocationPollutionTracker();
}

// Add animations to document if not already present
if (!document.querySelector('style[data-tracker]')) {
  const style = document.createElement('style');
  style.setAttribute('data-tracker', 'true');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(-400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(-400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
