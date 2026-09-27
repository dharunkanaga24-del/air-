/**
 * ==============================================================================
 * AeroPulse IoT — Real-Time ESP32 Air Quality Dashboard
 * Core Application Engine & Firebase Telemetry Manager
 * ==============================================================================
 */

(function () {
  'use strict';

  // ----------------------------------------------------------------------------
  // Application State
  // ----------------------------------------------------------------------------
  const STATE = {
    // Mode: 'demo' | 'live' | 'connecting' | 'error'
    mode: 'demo',
    
    // Live readings
    currentAdc: 450,
    previousAdc: 450,
    currentAqi: 32,
    
    // Telemetry session metrics
    peakAdc: 450,
    minAdc: 450,
    totalPackets: 0,
    packetSum: 0,
    lastReceivedTime: null,
    
    // History array for charts & export
    history: [],
    
    // Chart configurations
    chartWindow: 30,
    isChartPaused: false,
    chartInstance: null,
    
    // Thresholds & Alerts
    warningThreshold: 1600,
    criticalThreshold: 2800,
    audioAlertEnabled: true,
    lastAlarmTime: 0,
    
    // Firebase Config (loaded from localStorage or defaults)
    firebase: {
      databaseUrl: localStorage.getItem('aeropulse_db_url') || '',
      nodePath: localStorage.getItem('aeropulse_node_path') || 'sensor/air_quality',
      apiKey: localStorage.getItem('aeropulse_api_key') || '',
      authDomain: localStorage.getItem('aeropulse_auth_domain') || '',
    },
    
    // Active Firebase instance & EventSource
    firebaseApp: null,
    firebaseRef: null,
    sseEventSource: null,
    
    // Demo Simulator Interval
    demoIntervalId: null,
    demoTargetAdc: 450,
  };

  // ----------------------------------------------------------------------------
  // DOM Elements
  // ----------------------------------------------------------------------------
  const DOM = {
    themeIcon: document.getElementById('themeIcon'),
    btnToggleTheme: document.getElementById('btnToggleTheme'),
    connectionStatusPill: document.getElementById('connectionStatusPill'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    statusDot: document.getElementById('statusDot'),
    ambientGlow: document.getElementById('ambientGlow'),
    
    // Gauge
    gaugeProgressArc: document.getElementById('gaugeProgressArc'),
    gaugeMainValue: document.getElementById('gaugeMainValue'),
    gaugeAqiSubValue: document.getElementById('gaugeAqiSubValue'),
    gaugeStatusMini: document.getElementById('gaugeStatusMini'),
    statusHeroBadge: document.getElementById('statusHeroBadge'),
    statusHeroIcon: document.getElementById('statusHeroIcon'),
    statusHeroText: document.getElementById('statusHeroText'),
    gaugeDescription: document.getElementById('gaugeDescription'),
    metaPeakValue: document.getElementById('metaPeakValue'),
    metaAvgValue: document.getElementById('metaAvgValue'),
    lastUpdatedBadge: document.getElementById('lastUpdatedBadge'),
    
    // Metric Cards
    cardAdcVal: document.getElementById('cardAdcVal'),
    cardAdcBar: document.getElementById('cardAdcBar'),
    sensorTrendText: document.getElementById('sensorTrendText'),
    cardAqiVal: document.getElementById('cardAqiVal'),
    cardAqiBar: document.getElementById('cardAqiBar'),
    aqiLevelBadge: document.getElementById('aqiLevelBadge'),
    cardCo2Val: document.getElementById('cardCo2Val'),
    cardCo2Bar: document.getElementById('cardCo2Bar'),
    co2TrendText: document.getElementById('co2TrendText'),
    cardPacketsVal: document.getElementById('cardPacketsVal'),
    pingBadge: document.getElementById('pingBadge'),
    
    // Gas Breakdown
    gasCo2Val: document.getElementById('gasCo2Val'),
    gasCo2Bar: document.getElementById('gasCo2Bar'),
    gasSmokeVal: document.getElementById('gasSmokeVal'),
    gasSmokeBar: document.getElementById('gasSmokeBar'),
    gasVocVal: document.getElementById('gasVocVal'),
    gasVocBar: document.getElementById('gasVocBar'),
    gasNh3Val: document.getElementById('gasNh3Val'),
    gasNh3Bar: document.getElementById('gasNh3Bar'),
    
    // Health Advice
    adviceWindowText: document.getElementById('adviceWindowText'),
    advicePurifierText: document.getElementById('advicePurifierText'),
    adviceExerciseText: document.getElementById('adviceExerciseText'),
    adviceSensitiveText: document.getElementById('adviceSensitiveText'),
    
    // Hardware & Log
    specTargetNode: document.getElementById('specTargetNode'),
    eventsTableBody: document.getElementById('eventsTableBody'),
    
    // Controls & Simulator
    simSlider: document.getElementById('simSlider'),
    simSliderVal: document.getElementById('simSliderVal'),
    btnPresetClean: document.getElementById('btnPresetClean'),
    btnPresetModerate: document.getElementById('btnPresetModerate'),
    btnPresetSmoke: document.getElementById('btnPresetSmoke'),
    btnPresetSmog: document.getElementById('btnPresetSmog'),
    
    // Alert Banner
    alertBanner: document.getElementById('alertBanner'),
    alertBannerMessage: document.getElementById('alertBannerMessage'),
    btnCloseAlertBanner: document.getElementById('btnCloseAlertBanner'),
    
    // Chart Controls
    chartCanvas: document.getElementById('airQualityChart'),
    btnToggleChartPause: document.getElementById('btnToggleChartPause'),
    chartPauseIcon: document.getElementById('chartPauseIcon'),
    chartPauseText: document.getElementById('chartPauseText'),
    btnClearChartHistory: document.getElementById('btnClearChartHistory'),
    chartFilterBtns: document.querySelectorAll('.chart-filter-btn'),
    
    // Exports
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnExportJSON: document.getElementById('btnExportJSON'),
    
    // Modals
    firebaseModal: document.getElementById('firebaseModal'),
    btnOpenFirebaseModal: document.getElementById('btnOpenFirebaseModal'),
    btnCloseFirebaseModal: document.getElementById('btnCloseFirebaseModal'),
    btnSaveFirebaseConfig: document.getElementById('btnSaveFirebaseConfig'),
    btnSwitchToDemo: document.getElementById('btnSwitchToDemo'),
    cfgDatabaseUrl: document.getElementById('cfgDatabaseUrl'),
    cfgNodePath: document.getElementById('cfgNodePath'),
    cfgApiKey: document.getElementById('cfgApiKey'),
    cfgAuthDomain: document.getElementById('cfgAuthDomain'),
    
    esp32Modal: document.getElementById('esp32Modal'),
    btnOpenESP32Modal: document.getElementById('btnOpenESP32Modal'),
    btnCloseESP32Modal: document.getElementById('btnCloseESP32Modal'),
    btnDoneESP32Modal: document.getElementById('btnDoneESP32Modal'),
    btnCopyArduinoCode: document.getElementById('btnCopyArduinoCode'),
    copyBtnText: document.getElementById('copyBtnText'),
    btnDownloadInoFile: document.getElementById('btnDownloadInoFile'),
    
    alertsModal: document.getElementById('alertsModal'),
    btnOpenAlertsModal: document.getElementById('btnOpenAlertsModal'),
    btnCloseAlertsModal: document.getElementById('btnCloseAlertsModal'),
    btnSaveAlertSettings: document.getElementById('btnSaveAlertSettings'),
    cfgWarningThreshold: document.getElementById('cfgWarningThreshold'),
    cfgWarningValText: document.getElementById('cfgWarningValText'),
    cfgCriticalThreshold: document.getElementById('cfgCriticalThreshold'),
    cfgCriticalValText: document.getElementById('cfgCriticalValText'),
    cfgAudioAlertEnabled: document.getElementById('cfgAudioAlertEnabled'),
    btnTestAudioChirp: document.getElementById('btnTestAudioChirp'),
    btnRequestNotificationPermission: document.getElementById('btnRequestNotificationPermission'),
    
    toastContainer: document.getElementById('toastContainer') || document.getElementById('toast-container'),
  };

  // ----------------------------------------------------------------------------
  // AQI Level & Classification Mapping
  // ----------------------------------------------------------------------------
  const AQI_TIERS = [
    {
      minAdc: 0,
      maxAdc: 800,
      minAqi: 0,
      maxAqi: 50,
      label: 'EXCELLENT',
      category: 'Good',
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      badgeClass: 'status-good',
      description: 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
      windowAdvice: 'Open windows freely for natural atmospheric ventilation.',
      purifierAdvice: 'Standby mode. Particulate levels are negligible.',
      exerciseAdvice: 'Ideal conditions for all outdoor sports and activities.',
      sensitiveAdvice: 'Completely safe for respiratory-sensitive individuals.',
    },
    {
      minAdc: 801,
      maxAdc: 1600,
      minAqi: 51,
      maxAqi: 100,
      label: 'GOOD AIR',
      category: 'Moderate',
      color: '#34d399',
      glow: 'rgba(52, 211, 153, 0.4)',
      badgeClass: 'status-good',
      description: 'Air quality is acceptable. Normal indoor and outdoor levels.',
      windowAdvice: 'Normal ventilation is fine. Keep fresh airflow.',
      purifierAdvice: 'Low fan speed or automatic monitoring mode.',
      exerciseAdvice: 'Great conditions for general outdoor activities.',
      sensitiveAdvice: 'Very small risk for unusually sensitive individuals.',
    },
    {
      minAdc: 1601,
      maxAdc: 2400,
      minAqi: 101,
      maxAqi: 150,
      label: 'MODERATE POLLUTION',
      category: 'Unhealthy for Sensitive',
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      badgeClass: 'status-moderate',
      description: 'Elevated particulate or VOC gas concentration detected.',
      windowAdvice: 'Consider closing windows if outdoor air is hazy or dusty.',
      purifierAdvice: 'Activate air purifier on medium fan speed.',
      exerciseAdvice: 'Sensitive individuals should reduce prolonged outdoor exertion.',
      sensitiveAdvice: 'Asthma patients should monitor breathing and keep inhaler nearby.',
    },
    {
      minAdc: 2401,
      maxAdc: 3200,
      minAqi: 151,
      maxAqi: 200,
      label: 'UNHEALTHY',
      category: 'Unhealthy',
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.45)',
      badgeClass: 'status-unhealthy',
      description: 'Significant air degradation. Smoke, gas, or heavy pollutants present.',
      windowAdvice: 'Keep all windows tightly closed. Seal drafts.',
      purifierAdvice: 'Run air purifier on maximum turbo / HEPA filtration mode.',
      exerciseAdvice: 'Avoid outdoor exercise. Stay indoors in filtered air.',
      sensitiveAdvice: 'Sensitive groups should avoid all physical exertion.',
    },
    {
      minAdc: 3201,
      maxAdc: 4095,
      minAqi: 201,
      maxAqi: 500,
      label: 'HAZARDOUS AIR',
      category: 'Hazardous',
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.5)',
      badgeClass: 'status-hazardous',
      description: 'Health emergency alert: High gas or dense smoke concentration!',
      windowAdvice: 'Seal all windows and exterior vents immediately.',
      purifierAdvice: 'Maximum HEPA + Carbon filtration. Check for smoke/gas sources.',
      exerciseAdvice: 'Stay completely indoors. Do not go outside.',
      sensitiveAdvice: 'Wear N95/FFP2 mask if exposed. Evacuate if smoke is present.',
    },
  ];

  /**
   * Calculates AQI index and metadata from ESP32 ADC reading (0-4095)
   */
  function calculateAirQuality(adcValue) {
    const clampedAdc = Math.max(0, Math.min(4095, adcValue));
    
    // Find matching tier
    let tier = AQI_TIERS.find(t => clampedAdc >= t.minAdc && clampedAdc <= t.maxAdc);
    if (!tier) tier = AQI_TIERS[AQI_TIERS.length - 1];

    // Linear interpolation for AQI score within tier
    const adcRatio = (clampedAdc - tier.minAdc) / (tier.maxAdc - tier.minAdc || 1);
    const aqi = Math.round(tier.minAqi + adcRatio * (tier.maxAqi - tier.minAqi));

    // Gas estimations based on MQ sensor response curve approximations
    const co2Ppm = Math.round(400 + (clampedAdc / 4095) * 1650);
    const smokePpm = ((clampedAdc / 4095) * 12.5).toFixed(2);
    const vocMg = ((clampedAdc / 4095) * 1.85).toFixed(2);
    const nh3Ppm = ((clampedAdc / 4095) * 0.95).toFixed(2);

    return {
      adc: clampedAdc,
      aqi,
      tier,
      gases: {
        co2: co2Ppm,
        smoke: smokePpm,
        voc: vocMg,
        nh3: nh3Ppm,
      }
    };
  }

  // ----------------------------------------------------------------------------
  // Web Audio Synthesizer (Zero External File Dependencies)
  // ----------------------------------------------------------------------------
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playBuzzerSound(type = 'warn') {
    if (!STATE.audioAlertEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'critical') {
        // High urgency two-tone alarm
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174.66, now + 0.15);
        osc.frequency.setValueAtTime(880, now + 0.3);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'chirp') {
        // Subtle informational notification chirp
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        // Warning alert beep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(523.25, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  // ----------------------------------------------------------------------------
  // UI Notification & Toast Helper
  // ----------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;

    if (DOM.toastContainer) {
      DOM.toastContainer.appendChild(toast);
      if (window.lucide) window.lucide.createIcons({ root: toast });

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }
  }

  // ----------------------------------------------------------------------------
  // Chart.js Telemetry Graph Initializer
  // ----------------------------------------------------------------------------
  function initChart() {
    if (!DOM.chartCanvas || typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet or canvas missing.');
      return;
    }

    const ctx = DOM.chartCanvas.getContext('2d');
    
    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    STATE.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Air Quality ADC (0-4095)',
            data: [],
            borderColor: '#06b6d4',
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 400,
          easing: 'easeOutQuart',
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            callbacks: {
              label: function (context) {
                const val = context.parsed.y;
                const calc = calculateAirQuality(val);
                return ` Reading: ${val} ADC | AQI: ${calc.aqi} (${calc.tier.category})`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
            },
            ticks: {
              color: '#64748b',
              font: { family: 'Inter', size: 11 },
              maxRotation: 0,
            }
          },
          y: {
            min: 0,
            max: 4095,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
            },
            ticks: {
              color: '#64748b',
              font: { family: 'Inter', size: 11 },
              stepSize: 1000,
            }
          }
        }
      }
    });
  }

  /**
   * Push new reading to Chart.js
   */
  function updateChart(timeLabel, adcValue) {
    if (!STATE.chartInstance || STATE.isChartPaused) return;

    const chart = STATE.chartInstance;
    chart.data.labels.push(timeLabel);
    chart.data.datasets[0].data.push(adcValue);

    // Limit window
    while (chart.data.labels.length > STATE.chartWindow) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    // Dynamic line color matching current AQI
    const calc = calculateAirQuality(adcValue);
    chart.data.datasets[0].borderColor = calc.tier.color;
    chart.data.datasets[0].pointBackgroundColor = calc.tier.color;

    chart.update('none'); // Update without heavy animation for performance
  }

  // ----------------------------------------------------------------------------
  // Main Telemetry Ingestion Handler
  // ----------------------------------------------------------------------------
  function ingestSensorReading(rawValue) {
    const adc = Number(rawValue);
    if (isNaN(adc)) return;

    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    STATE.previousAdc = STATE.currentAdc;
    STATE.currentAdc = adc;
    STATE.lastReceivedTime = now;
    STATE.totalPackets++;
    STATE.packetSum += adc;

    // Peak and Min
    if (adc > STATE.peakAdc) STATE.peakAdc = adc;
    if (adc < STATE.minAdc) STATE.minAdc = adc;

    const avgAdc = Math.round(STATE.packetSum / STATE.totalPackets);
    const data = calculateAirQuality(adc);
    STATE.currentAqi = data.aqi;

    // Append to history
    STATE.history.unshift({
      timestamp: timeLabel,
      rawAdc: adc,
      aqi: data.aqi,
      status: data.tier.category,
      co2: data.gases.co2,
      smoke: data.gases.smoke,
    });
    if (STATE.history.length > 200) STATE.history.pop();

    // 1. Update Gauge & Hero Section
    updateGaugeUI(data, avgAdc);

    // 2. Update Metric Cards
    updateMetricCardsUI(data);

    // 3. Update Gas Breakdown & Recommendations
    updateGasAndAdviceUI(data);

    // 4. Update Chart
    updateChart(timeLabel, adc);

    // 5. Append to Event History Table
    appendEventLogRow(timeLabel, data);

    // 6. Check Thresholds & Trigger Alarms if needed
    checkThresholdAlerts(adc, data);

    // 7. Update Hardware Node Path display
    if (DOM.specTargetNode) {
      DOM.specTargetNode.textContent = STATE.firebase.nodePath || 'sensor/air_quality';
    }
  }

  // ----------------------------------------------------------------------------
  // UI Renderers
  // ----------------------------------------------------------------------------
  function updateGaugeUI(data, avgAdc) {
    const { adc, aqi, tier } = data;

    // SVG arc calculation (Circumference of r=105 is ~660)
    const circumference = 2 * Math.PI * 105;
    // Map 0-4095 ADC to 0-100% of arc
    const progressRatio = Math.min(1, Math.max(0, adc / 4095));
    const strokeOffset = circumference - (progressRatio * circumference);

    if (DOM.gaugeProgressArc) {
      DOM.gaugeProgressArc.style.strokeDasharray = `${circumference}`;
      DOM.gaugeProgressArc.style.strokeDashoffset = `${strokeOffset}`;
      DOM.gaugeProgressArc.style.stroke = tier.color;
    }

    // Number readouts
    if (DOM.gaugeMainValue) DOM.gaugeMainValue.textContent = adc;
    if (DOM.gaugeAqiSubValue) DOM.gaugeAqiSubValue.textContent = aqi;
    if (DOM.gaugeStatusMini) DOM.gaugeStatusMini.textContent = tier.category.toUpperCase();

    // Big Status Badge
    if (DOM.statusHeroBadge) {
      DOM.statusHeroBadge.className = `status-hero-badge ${tier.badgeClass}`;
      if (DOM.statusHeroText) DOM.statusHeroText.textContent = tier.label;
    }

    // Icon update
    if (DOM.statusHeroIcon) {
      let iconName = 'shield-check';
      if (tier.category === 'Moderate') iconName = 'alert-circle';
      if (tier.category === 'Unhealthy for Sensitive' || tier.category === 'Unhealthy') iconName = 'alert-triangle';
      if (tier.category === 'Hazardous') iconName = 'flame';
      DOM.statusHeroIcon.setAttribute('data-lucide', iconName);
      if (window.lucide) window.lucide.createIcons({ root: DOM.statusHeroBadge });
    }

    // Description
    if (DOM.gaugeDescription) DOM.gaugeDescription.textContent = tier.description;

    // Peak & Avg
    if (DOM.metaPeakValue) DOM.metaPeakValue.textContent = `${STATE.peakAdc} ADC`;
    if (DOM.metaAvgValue) DOM.metaAvgValue.textContent = `${avgAdc} ADC`;

    // Ambient glow update
    if (DOM.ambientGlow) {
      document.documentElement.style.setProperty('--status-glow', tier.glow);
      document.documentElement.style.setProperty('--status-current', tier.color);
    }
  }

  function updateMetricCardsUI(data) {
    const { adc, aqi, gases } = data;

    // Card 1: ADC Value
    if (DOM.cardAdcVal) DOM.cardAdcVal.textContent = adc;
    if (DOM.cardAdcBar) {
      const pct = Math.min(100, Math.round((adc / 4095) * 100));
      DOM.cardAdcBar.style.width = `${pct}%`;
    }

    // Trend calculation
    const delta = adc - STATE.previousAdc;
    if (DOM.sensorTrendText) {
      if (delta > 5) {
        DOM.sensorTrendText.className = 'metric-trend trend-up';
        DOM.sensorTrendText.innerHTML = `<i data-lucide="trending-up"></i> +${delta}`;
      } else if (delta < -5) {
        DOM.sensorTrendText.className = 'metric-trend trend-down';
        DOM.sensorTrendText.innerHTML = `<i data-lucide="trending-down"></i> ${delta}`;
      } else {
        DOM.sensorTrendText.className = 'metric-trend trend-neutral';
        DOM.sensorTrendText.innerHTML = `<i data-lucide="minus"></i> Stable`;
      }
      if (window.lucide) window.lucide.createIcons({ root: DOM.sensorTrendText });
    }

    // Card 2: AQI
    if (DOM.cardAqiVal) DOM.cardAqiVal.textContent = aqi;
    if (DOM.cardAqiBar) {
      const aqiPct = Math.min(100, Math.round((aqi / 500) * 100));
      DOM.cardAqiBar.style.width = `${aqiPct}%`;
      DOM.cardAqiBar.style.background = data.tier.color;
    }
    if (DOM.aqiLevelBadge) {
      DOM.aqiLevelBadge.textContent = data.tier.category;
      DOM.aqiLevelBadge.style.color = data.tier.color;
      DOM.aqiLevelBadge.style.background = `${data.tier.color}22`;
    }

    // Card 3: CO2 / VOC Estimate
    if (DOM.cardCo2Val) DOM.cardCo2Val.textContent = gases.co2;
    if (DOM.cardCo2Bar) {
      const co2Pct = Math.min(100, Math.round(((gases.co2 - 400) / 1600) * 100));
      DOM.cardCo2Bar.style.width = `${Math.max(5, co2Pct)}%`;
    }

    // Card 4: Packets Count
    if (DOM.cardPacketsVal) DOM.cardPacketsVal.textContent = STATE.totalPackets;
  }

  function updateGasAndAdviceUI(data) {
    const { gases, tier } = data;

    // Gas 1: CO2
    if (DOM.gasCo2Val) DOM.gasCo2Val.textContent = `${gases.co2} ppm`;
    if (DOM.gasCo2Bar) {
      const pct = Math.min(100, Math.round(((gases.co2 - 400) / 1600) * 100));
      DOM.gasCo2Bar.style.width = `${Math.max(8, pct)}%`;
    }

    // Gas 2: Smoke / CO
    if (DOM.gasSmokeVal) DOM.gasSmokeVal.textContent = `${gases.smoke} ppm`;
    if (DOM.gasSmokeBar) {
      const pct = Math.min(100, Math.round((gases.smoke / 12) * 100));
      DOM.gasSmokeBar.style.width = `${Math.max(5, pct)}%`;
    }

    // Gas 3: VOCs
    if (DOM.gasVocVal) DOM.gasVocVal.textContent = `${gases.voc} mg/m³`;
    if (DOM.gasVocBar) {
      const pct = Math.min(100, Math.round((gases.voc / 1.85) * 100));
      DOM.gasVocBar.style.width = `${Math.max(5, pct)}%`;
    }

    // Gas 4: NH3 / Alcohol
    if (DOM.gasNh3Val) DOM.gasNh3Val.textContent = `${gases.nh3} ppm`;
    if (DOM.gasNh3Bar) {
      const pct = Math.min(100, Math.round((gases.nh3 / 0.95) * 100));
      DOM.gasNh3Bar.style.width = `${Math.max(4, pct)}%`;
    }

    // Advice texts
    if (DOM.adviceWindowText) DOM.adviceWindowText.textContent = tier.windowAdvice;
    if (DOM.advicePurifierText) DOM.advicePurifierText.textContent = tier.purifierAdvice;
    if (DOM.adviceExerciseText) DOM.adviceExerciseText.textContent = tier.exerciseAdvice;
    if (DOM.adviceSensitiveText) DOM.adviceSensitiveText.textContent = tier.sensitiveAdvice;
  }

  function appendEventLogRow(timeLabel, data) {
    if (!DOM.eventsTableBody) return;

    let badgeClass = 'info';
    if (data.adc >= STATE.criticalThreshold) {
      badgeClass = 'alert';
    } else if (data.adc >= STATE.warningThreshold) {
      badgeClass = 'warn';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${timeLabel}</td>
      <td><span class="event-badge ${badgeClass}">${badgeClass.toUpperCase()}</span></td>
      <td style="font-family: monospace; font-weight: 700;">${data.adc}</td>
      <td>${data.aqi}</td>
      <td style="color: ${data.tier.color}; font-weight: 600;">${data.tier.category}</td>
    `;

    DOM.eventsTableBody.insertBefore(row, DOM.eventsTableBody.firstChild);

    // Limit table rows to 50
    while (DOM.eventsTableBody.children.length > 50) {
      DOM.eventsTableBody.removeChild(DOM.eventsTableBody.lastChild);
    }
  }

  function checkThresholdAlerts(adc, data) {
    const now = Date.now();
    
    // Critical Alert Threshold
    if (adc >= STATE.criticalThreshold) {
      if (DOM.alertBanner) {
        DOM.alertBanner.classList.add('active');
        if (DOM.alertBannerMessage) {
          DOM.alertBannerMessage.innerHTML = `<strong>⚠️ CRITICAL HAZARD ALERT:</strong> Air quality ADC reached <strong>${adc}</strong> (${data.tier.category}). Check ventilation immediately!`;
        }
      }

      // Throttle sound to every 8 seconds
      if (now - STATE.lastAlarmTime > 8000) {
        STATE.lastAlarmTime = now;
        playBuzzerSound('critical');
        sendBrowserPushNotification('Critical Air Quality Alert!', `Sensor reading: ${adc} ADC (${data.tier.category}). High gas/smoke levels.`);
      }
    } else if (adc >= STATE.warningThreshold) {
      if (DOM.alertBanner) {
        DOM.alertBanner.classList.add('active');
        if (DOM.alertBannerMessage) {
          DOM.alertBannerMessage.innerHTML = `<strong>⚠️ Caution:</strong> Elevated Air Quality ADC reading <strong>${adc}</strong> (${data.tier.category}).`;
        }
      }

      if (now - STATE.lastAlarmTime > 15000) {
        STATE.lastAlarmTime = now;
        playBuzzerSound('warn');
      }
    } else {
      if (DOM.alertBanner) {
        DOM.alertBanner.classList.remove('active');
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Browser Notifications
  // ----------------------------------------------------------------------------
  function sendBrowserPushNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306b6d4"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/></svg>'
        });
      } catch (e) {
        console.warn('Notification trigger failed:', e);
      }
    }
  }

  function requestNotificationPermission() {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported in this browser.', 'error');
      return;
    }
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showToast('Browser notifications enabled successfully!', 'success');
        sendBrowserPushNotification('AeroPulse IoT Notifications Active', 'You will receive warnings when air quality drops.');
      } else {
        showToast('Notification permission was denied.', 'error');
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Firebase Realtime Database Engine
  // ----------------------------------------------------------------------------
  function connectToFirebase() {
    const { databaseUrl, nodePath, apiKey, authDomain } = STATE.firebase;

    if (!databaseUrl) {
      startDemoMode();
      return;
    }

    stopDemoMode();
    setConnectionStatus('connecting', 'Connecting to Firebase...');

    // Clean sanitized URL
    let dbUrl = databaseUrl.trim();
    if (!dbUrl.startsWith('http://') && !dbUrl.startsWith('https://')) {
      dbUrl = 'https://' + dbUrl;
    }
    if (dbUrl.endsWith('/')) {
      dbUrl = dbUrl.slice(0, -1);
    }

    // Clean node path
    let path = (nodePath || 'sensor/air_quality').trim();
    if (path.startsWith('/')) path = path.slice(1);
    if (path.endsWith('/')) path = path.slice(0, -1);

    // Try Method 1: Firebase Compat SDK
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      try {
        // Delete previous app if exists
        if (firebase.apps && firebase.apps.length > 0) {
          firebase.apps.forEach(app => app.delete());
        }

        const fbConfig = {
          databaseURL: dbUrl,
          apiKey: apiKey || 'AIzaFakeKeyForPublicTestingMode12345678',
          authDomain: authDomain || `${dbUrl.split('//')[1].split('.')[0]}.firebaseapp.com`,
        };

        STATE.firebaseApp = firebase.initializeApp(fbConfig, 'aeropulse_' + Date.now());
        const db = firebase.database(STATE.firebaseApp);
        STATE.firebaseRef = db.ref(path);

        STATE.firebaseRef.on('value', (snapshot) => {
          setConnectionStatus('live', `Live Firebase Connected (${path})`);
          const val = snapshot.val();
          if (val !== null && val !== undefined) {
            // Handle if value is an object or a direct number
            const sensorVal = typeof val === 'object' && val.air_quality !== undefined ? val.air_quality : val;
            ingestSensorReading(sensorVal);
          }
        }, (error) => {
          console.warn('Firebase SDK listener error, falling back to SSE stream:', error);
          connectViaRestSSE(dbUrl, path);
        });

        showToast('Connected to Firebase Realtime Database!', 'success');
        return;
      } catch (err) {
        console.warn('Firebase SDK initialization failed, trying REST SSE stream:', err);
      }
    }

    // Fallback Method 2: Direct REST Server-Sent Events (SSE)
    connectViaRestSSE(dbUrl, path);
  }

  function connectViaRestSSE(dbUrl, path) {
    if (STATE.sseEventSource) {
      STATE.sseEventSource.close();
      STATE.sseEventSource = null;
    }

    const sseUrl = `${dbUrl}/${path}.json`;
    try {
      STATE.sseEventSource = new EventSource(sseUrl);

      STATE.sseEventSource.addEventListener('put', (e) => {
        setConnectionStatus('live', `Live Firebase Connected (${path})`);
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.data !== undefined && payload.data !== null) {
            const val = typeof payload.data === 'object' && payload.data.air_quality !== undefined ? payload.data.air_quality : payload.data;
            ingestSensorReading(val);
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      });

      STATE.sseEventSource.onerror = (err) => {
        console.warn('Firebase SSE connection error:', err);
        setConnectionStatus('error', 'Firebase Offline / Permission Error');
        showToast('Firebase connection failed. Check Database URL and Rules!', 'error');
      };
    } catch (err) {
      console.error('EventSource connection error:', err);
      setConnectionStatus('error', 'Firebase Connection Error');
    }
  }

  function disconnectFirebase() {
    if (STATE.firebaseRef) {
      try { STATE.firebaseRef.off(); } catch (e) {}
      STATE.firebaseRef = null;
    }
    if (STATE.sseEventSource) {
      STATE.sseEventSource.close();
      STATE.sseEventSource = null;
    }
  }

  function setConnectionStatus(status, text) {
    STATE.mode = status;
    if (DOM.connectionStatusText) DOM.connectionStatusText.textContent = text;
    if (DOM.statusDot) {
      DOM.statusDot.className = 'status-dot';
      if (status === 'live') DOM.statusDot.classList.add('active-live');
      else if (status === 'demo') DOM.statusDot.classList.add('active-demo');
      else DOM.statusDot.classList.add('active-disconnected');
    }
  }

  // ----------------------------------------------------------------------------
  // Realistic Simulation / Demo Mode Engine
  // ----------------------------------------------------------------------------
  function startDemoMode() {
    stopDemoMode();
    disconnectFirebase();
    setConnectionStatus('demo', 'Demo Mode (Interactive Simulation)');

    // Seed initial reading
    ingestSensorReading(STATE.currentAdc);

    STATE.demoIntervalId = setInterval(() => {
      // Natural random walk towards target ADC with gentle jitter
      const diff = STATE.demoTargetAdc - STATE.currentAdc;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), Math.floor(Math.random() * 60 + 15));
      const jitter = Math.floor((Math.random() - 0.5) * 20);
      
      let nextAdc = STATE.currentAdc + step + jitter;
      nextAdc = Math.max(120, Math.min(4090, nextAdc));

      // Sync slider if user isn't actively dragging
      if (DOM.simSlider && !DOM.simSlider.matches(':active')) {
        DOM.simSlider.value = nextAdc;
        if (DOM.simSliderVal) DOM.simSliderVal.textContent = nextAdc;
      }

      ingestSensorReading(nextAdc);
    }, 2000); // 2-second interval matches ESP32 loop
  }

  function stopDemoMode() {
    if (STATE.demoIntervalId) {
      clearInterval(STATE.demoIntervalId);
      STATE.demoIntervalId = null;
    }
  }

  // ----------------------------------------------------------------------------
  // Data Exporters (CSV & JSON)
  // ----------------------------------------------------------------------------
  function exportCSV() {
    if (STATE.history.length === 0) {
      showToast('No telemetry history to export yet!', 'error');
      return;
    }

    let csv = 'Timestamp,Raw_ADC_0_4095,Calculated_AQI,Air_Status,Estimated_CO2_ppm,Estimated_Smoke_ppm\n';
    STATE.history.forEach(row => {
      csv += `"${row.timestamp}",${row.rawAdc},${row.aqi},"${row.status}",${row.co2},${row.smoke}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ESP32_AirQuality_Log_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported telemetry log to CSV!', 'success');
  }

  function exportJSON() {
    if (STATE.history.length === 0) {
      showToast('No telemetry history to export yet!', 'error');
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      device: 'ESP32 Air Quality Monitor Node',
      targetNode: STATE.firebase.nodePath,
      totalFrames: STATE.totalPackets,
      peakAdc: STATE.peakAdc,
      minAdc: STATE.minAdc,
      history: STATE.history
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ESP32_AirQuality_Log_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported telemetry log to JSON!', 'success');
  }

  function downloadInoFile() {
    const code = `#include <WiFi.h>                  // Use <ESP8266WiFi.h> if using an ESP8266
#include <Firebase_ESP_Client.h>   // Install via Library Manager

// Provide the token generation process info
#include <addons/TokenHelper.h>
// Provide the RTDB payload printing info
#include <addons/RTDBHelper.h>

// 1. Put your Wi-Fi credentials here
#define WIFI_SSID "${localStorage.getItem('aeropulse_wifi_ssid') || 'YOUR_WIFI_NAME'}"
#define WIFI_PASSWORD "${localStorage.getItem('aeropulse_wifi_pass') || 'YOUR_WIFI_PASSWORD'}"

// 2. Put your Firebase credentials here
#define API_KEY "${STATE.firebase.apiKey || 'YOUR_FIREBASE_API_KEY'}"
#define DATABASE_URL "${STATE.firebase.databaseUrl || 'YOUR_DATABASE_URL'}"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const int sensorPin = 34; // GPIO 34 (ADC1_CH6)

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\\nConnected! IP: " + WiFi.localIP().toString());

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.test_mode = true;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  int airQualityReading = analogRead(sensorPin);
  
  if (Firebase.ready()) {
    if (Firebase.RTDB.setInt(&fbdo, "${STATE.firebase.nodePath}", airQualityReading)) {
      Serial.println("Data sent: " + String(airQualityReading));
    } else {
      Serial.println("Failed to send: " + fbdo.errorReason());
    }
  }
  
  delay(2000); // 2-second interval
}
`;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'esp32_air_quality.ino';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded esp32_air_quality.ino firmware file!', 'success');
  }

  // ----------------------------------------------------------------------------
  // Event Listeners & User Interactions
  // ----------------------------------------------------------------------------
  function setupEventListeners() {
    // Dark / Light Theme Toggle
    if (DOM.btnToggleTheme) {
      DOM.btnToggleTheme.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('aeropulse_theme', newTheme);
        
        if (DOM.themeIcon) {
          DOM.themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'moon' : 'sun');
          if (window.lucide) window.lucide.createIcons({ root: DOM.btnToggleTheme });
        }
      });
    }

    // Simulation Slider
    if (DOM.simSlider) {
      DOM.simSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        if (DOM.simSliderVal) DOM.simSliderVal.textContent = val;
        STATE.demoTargetAdc = val;
        ingestSensorReading(val);
      });
    }

    // Simulation Preset Buttons
    if (DOM.btnPresetClean) {
      DOM.btnPresetClean.addEventListener('click', () => {
        STATE.demoTargetAdc = 350;
        if (DOM.simSlider) DOM.simSlider.value = 350;
        if (DOM.simSliderVal) DOM.simSliderVal.textContent = 350;
        ingestSensorReading(350);
        showToast('Simulating: Fresh Mountain Air (350 ADC)', 'info');
      });
    }

    if (DOM.btnPresetModerate) {
      DOM.btnPresetModerate.addEventListener('click', () => {
        STATE.demoTargetAdc = 1450;
        if (DOM.simSlider) DOM.simSlider.value = 1450;
        if (DOM.simSliderVal) DOM.simSliderVal.textContent = 1450;
        ingestSensorReading(1450);
        showToast('Simulating: Standard Indoor Air (1450 ADC)', 'info');
      });
    }

    if (DOM.btnPresetSmoke) {
      DOM.btnPresetSmoke.addEventListener('click', () => {
        STATE.demoTargetAdc = 2650;
        if (DOM.simSlider) DOM.simSlider.value = 2650;
        if (DOM.simSliderVal) DOM.simSliderVal.textContent = 2650;
        ingestSensorReading(2650);
        showToast('Simulating: Cooking Smoke Spike (2650 ADC)', 'error');
      });
    }

    if (DOM.btnPresetSmog) {
      DOM.btnPresetSmog.addEventListener('click', () => {
        STATE.demoTargetAdc = 3850;
        if (DOM.simSlider) DOM.simSlider.value = 3850;
        if (DOM.simSliderVal) DOM.simSliderVal.textContent = 3850;
        ingestSensorReading(3850);
        showToast('Simulating: Toxic Smog Hazard (3850 ADC)', 'error');
      });
    }

    // Chart Pause / Resume
    if (DOM.btnToggleChartPause) {
      DOM.btnToggleChartPause.addEventListener('click', () => {
        STATE.isChartPaused = !STATE.isChartPaused;
        if (DOM.chartPauseText) DOM.chartPauseText.textContent = STATE.isChartPaused ? 'Resume' : 'Pause';
        if (DOM.chartPauseIcon) {
          DOM.chartPauseIcon.setAttribute('data-lucide', STATE.isChartPaused ? 'play' : 'pause');
          if (window.lucide) window.lucide.createIcons({ root: DOM.btnToggleChartPause });
        }
      });
    }

    // Chart Clear
    if (DOM.btnClearChartHistory) {
      DOM.btnClearChartHistory.addEventListener('click', () => {
        if (STATE.chartInstance) {
          STATE.chartInstance.data.labels = [];
          STATE.chartInstance.data.datasets[0].data = [];
          STATE.chartInstance.update();
        }
        STATE.history = [];
        if (DOM.eventsTableBody) DOM.eventsTableBody.innerHTML = '';
        showToast('Telemetry history cleared!', 'info');
      });
    }

    // Chart Time Window Filters
    DOM.chartFilterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        DOM.chartFilterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        STATE.chartWindow = parseInt(e.target.dataset.window, 10) || 30;
      });
    });

    // Alert Banner Close
    if (DOM.btnCloseAlertBanner) {
      DOM.btnCloseAlertBanner.addEventListener('click', () => {
        if (DOM.alertBanner) DOM.alertBanner.classList.remove('active');
      });
    }

    // Data Exports
    if (DOM.btnExportCSV) DOM.btnExportCSV.addEventListener('click', exportCSV);
    if (DOM.btnExportJSON) DOM.btnExportJSON.addEventListener('click', exportJSON);
    if (DOM.btnDownloadInoFile) DOM.btnDownloadInoFile.addEventListener('click', downloadInoFile);

    // Copy Arduino Code
    if (DOM.btnCopyArduinoCode) {
      DOM.btnCopyArduinoCode.addEventListener('click', () => {
        const codeElement = document.getElementById('arduinoCodeSnippet');
        if (codeElement) {
          navigator.clipboard.writeText(codeElement.innerText).then(() => {
            if (DOM.copyBtnText) DOM.copyBtnText.textContent = 'Copied!';
            showToast('Arduino code copied to clipboard!', 'success');
            setTimeout(() => {
              if (DOM.copyBtnText) DOM.copyBtnText.textContent = 'Copy Code';
            }, 2500);
          });
        }
      });
    }

    // Firebase Modal Controls
    if (DOM.btnOpenFirebaseModal && DOM.firebaseModal) {
      DOM.btnOpenFirebaseModal.addEventListener('click', () => {
        if (DOM.cfgDatabaseUrl) DOM.cfgDatabaseUrl.value = STATE.firebase.databaseUrl;
        if (DOM.cfgNodePath) DOM.cfgNodePath.value = STATE.firebase.nodePath;
        if (DOM.cfgApiKey) DOM.cfgApiKey.value = STATE.firebase.apiKey;
        if (DOM.cfgAuthDomain) DOM.cfgAuthDomain.value = STATE.firebase.authDomain;
        DOM.firebaseModal.showModal();
      });
    }

    if (DOM.btnCloseFirebaseModal && DOM.firebaseModal) {
      DOM.btnCloseFirebaseModal.addEventListener('click', () => DOM.firebaseModal.close());
    }

    if (DOM.btnSwitchToDemo && DOM.firebaseModal) {
      DOM.btnSwitchToDemo.addEventListener('click', () => {
        DOM.firebaseModal.close();
        startDemoMode();
        showToast('Switched to interactive demo simulation mode.', 'info');
      });
    }

    if (DOM.btnSaveFirebaseConfig && DOM.firebaseModal) {
      DOM.btnSaveFirebaseConfig.addEventListener('click', () => {
        const url = DOM.cfgDatabaseUrl ? DOM.cfgDatabaseUrl.value.trim() : '';
        const path = DOM.cfgNodePath ? DOM.cfgNodePath.value.trim() : 'sensor/air_quality';
        const apiKey = DOM.cfgApiKey ? DOM.cfgApiKey.value.trim() : '';
        const authDomain = DOM.cfgAuthDomain ? DOM.cfgAuthDomain.value.trim() : '';

        if (!url) {
          showToast('Please enter your Firebase Database URL!', 'error');
          return;
        }

        STATE.firebase.databaseUrl = url;
        STATE.firebase.nodePath = path;
        STATE.firebase.apiKey = apiKey;
        STATE.firebase.authDomain = authDomain;

        localStorage.setItem('aeropulse_db_url', url);
        localStorage.setItem('aeropulse_node_path', path);
        localStorage.setItem('aeropulse_api_key', apiKey);
        localStorage.setItem('aeropulse_auth_domain', authDomain);

        DOM.firebaseModal.close();
        connectToFirebase();
      });
    }

    // ESP32 Modal Controls
    if (DOM.btnOpenESP32Modal && DOM.esp32Modal) {
      DOM.btnOpenESP32Modal.addEventListener('click', () => DOM.esp32Modal.showModal());
    }
    if (DOM.btnCloseESP32Modal && DOM.esp32Modal) {
      DOM.btnCloseESP32Modal.addEventListener('click', () => DOM.esp32Modal.close());
    }
    if (DOM.btnDoneESP32Modal && DOM.esp32Modal) {
      DOM.btnDoneESP32Modal.addEventListener('click', () => DOM.esp32Modal.close());
    }

    // Alerts Modal Controls
    if (DOM.btnOpenAlertsModal && DOM.alertsModal) {
      DOM.btnOpenAlertsModal.addEventListener('click', () => {
        if (DOM.cfgWarningThreshold) DOM.cfgWarningThreshold.value = STATE.warningThreshold;
        if (DOM.cfgWarningValText) DOM.cfgWarningValText.textContent = STATE.warningThreshold;
        if (DOM.cfgCriticalThreshold) DOM.cfgCriticalThreshold.value = STATE.criticalThreshold;
        if (DOM.cfgCriticalValText) DOM.cfgCriticalValText.textContent = STATE.criticalThreshold;
        if (DOM.cfgAudioAlertEnabled) DOM.cfgAudioAlertEnabled.checked = STATE.audioAlertEnabled;
        DOM.alertsModal.showModal();
      });
    }

    if (DOM.btnCloseAlertsModal && DOM.alertsModal) {
      DOM.btnCloseAlertsModal.addEventListener('click', () => DOM.alertsModal.close());
    }

    if (DOM.cfgWarningThreshold) {
      DOM.cfgWarningThreshold.addEventListener('input', (e) => {
        if (DOM.cfgWarningValText) DOM.cfgWarningValText.textContent = e.target.value;
      });
    }

    if (DOM.cfgCriticalThreshold) {
      DOM.cfgCriticalThreshold.addEventListener('input', (e) => {
        if (DOM.cfgCriticalValText) DOM.cfgCriticalValText.textContent = e.target.value;
      });
    }

    if (DOM.btnTestAudioChirp) {
      DOM.btnTestAudioChirp.addEventListener('click', () => {
        playBuzzerSound('critical');
      });
    }

    if (DOM.btnRequestNotificationPermission) {
      DOM.btnRequestNotificationPermission.addEventListener('click', () => {
        requestNotificationPermission();
      });
    }

    if (DOM.btnSaveAlertSettings && DOM.alertsModal) {
      DOM.btnSaveAlertSettings.addEventListener('click', () => {
        if (DOM.cfgWarningThreshold) STATE.warningThreshold = Number(DOM.cfgWarningThreshold.value);
        if (DOM.cfgCriticalThreshold) STATE.criticalThreshold = Number(DOM.cfgCriticalThreshold.value);
        if (DOM.cfgAudioAlertEnabled) STATE.audioAlertEnabled = DOM.cfgAudioAlertEnabled.checked;
        
        DOM.alertsModal.close();
        showToast('Alert preferences updated successfully!', 'success');
      });
    }

    // Close modals on backdrop click
    [DOM.firebaseModal, DOM.esp32Modal, DOM.alertsModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          const rect = modal.getBoundingClientRect();
          const isInDialog = (
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width
          );
          if (!isInDialog) {
            modal.close();
          }
        });
      }
    });
  }

  // ----------------------------------------------------------------------------
  // App Bootstrap
  // ----------------------------------------------------------------------------
  function init() {
    // Restore theme preference
    const savedTheme = localStorage.getItem('aeropulse_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (DOM.themeIcon) {
      DOM.themeIcon.setAttribute('data-lucide', savedTheme === 'dark' ? 'moon' : 'sun');
    }

    // Initialize Chart.js
    initChart();

    // Setup Event Listeners
    setupEventListeners();

    // Render Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Check if Firebase URL is saved
    if (STATE.firebase.databaseUrl) {
      connectToFirebase();
    } else {
      startDemoMode();
    }
  }

  // Kickoff when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
