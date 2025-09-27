// ---------- Utilities ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const fmtDate = (d) => new Date(d).toLocaleDateString();
const pad = (n) => String(n).padStart(2, '0');

function parseHMS(str) {
  // Accept hh:mm:ss or mm:ss or ss
  if (!str) return null;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  let s = 0;
  if (parts.length === 3) {
    s = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    s = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    s = parts[0];
  }
  return s;
}

function toHMS(sec) {
  if (sec == null) return '--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function todayISO() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 10);
}

// ---------- Estimation & Prediction Algorithms ----------
const VDOT_TABLE = {
  // Simplified VDOT equivalency table (time in seconds for different distances)
  // Based on Jack Daniels' Running Formula
  getEquivalentTime: function(knownDistance, knownTime, targetDistance) {
    // Riegel's formula: T2 = T1 * (D2/D1)^1.06
    const distanceMap = { '5k': 5, '10k': 10, 'hm': 21.1, 'marathon': 42.2 };
    const d1 = distanceMap[knownDistance];
    const d2 = distanceMap[targetDistance];
    if (!d1 || !d2) return null;
    
    return Math.round(knownTime * Math.pow(d2 / d1, 1.06));
  }
};

const STRENGTH_ESTIMATIONS = {
  // Strength exercise relationships and estimations
  // Based on common strength training ratios and research
  
  // Estimate 1RM from reps (Epley formula: 1RM = weight * (1 + reps/30))
  estimate1RM: function(weight, reps) {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  },
  
  // Estimate reps at percentage of 1RM
  estimateRepsAtWeight: function(oneRM, targetWeight) {
    if (targetWeight >= oneRM) return 1;
    const percentage = targetWeight / oneRM;
    // Approximate reps based on percentage of 1RM
    if (percentage >= 0.95) return 1;
    if (percentage >= 0.90) return 3;
    if (percentage >= 0.85) return 5;
    if (percentage >= 0.80) return 8;
    if (percentage >= 0.75) return 10;
    if (percentage >= 0.70) return 12;
    if (percentage >= 0.65) return 15;
    return 20;
  },
  
  // Bodyweight exercise progressions
  getBodyweightProgression: function(exercise, currentReps) {
    const progressions = {
      pushups: [
        { name: 'Standard Push-ups', range: [1, 50] },
        { name: 'Diamond Push-ups', range: [1, 30] },
        { name: 'One-arm Push-ups', range: [1, 10] }
      ],
      pullups: [
        { name: 'Assisted Pull-ups', range: [1, 15] },
        { name: 'Standard Pull-ups', range: [1, 25] },
        { name: 'Weighted Pull-ups', range: [1, 15] }
      ]
    };
    
    const exerciseProgressions = progressions[exercise];
    if (!exerciseProgressions) return null;
    
    for (let i = 0; i < exerciseProgressions.length; i++) {
      const prog = exerciseProgressions[i];
      if (currentReps >= prog.range[0] && currentReps <= prog.range[1]) {
        const nextProg = exerciseProgressions[i + 1];
        if (nextProg) {
          return {
            current: prog.name,
            next: nextProg.name,
            suggestion: `Ready for ${nextProg.name}? Try ${Math.ceil(nextProg.range[0])} reps.`
          };
        }
      }
    }
    return null;
  },
  
  // Strength ratios for balanced development
  getStrengthRatios: function(currentScores) {
    const ratios = {
      // Typical strength ratios (as percentages of each other)
      pushToPull: 1.0, // Push-ups to Pull-ups should be roughly equal
      upperToLower: 0.8 // Upper body to lower body ratio
    };
    
    const suggestions = [];
    
    if (currentScores.pushups && currentScores.pullups) {
      const ratio = currentScores.pushups / currentScores.pullups;
      if (ratio > 1.5) {
        suggestions.push({
          type: 'balance',
          message: `Your push-ups (${currentScores.pushups}) are much stronger than pull-ups (${currentScores.pullups}). Focus more on pulling exercises.`
        });
      } else if (ratio < 0.7) {
        suggestions.push({
          type: 'balance',
          message: `Your pull-ups (${currentScores.pullups}) are much stronger than push-ups (${currentScores.pushups}). Add more pushing exercises.`
        });
      }
    }
    
    return suggestions;
  }
};

function predictFuturePerformance(type, metric, daysAhead = 28) {
  // Simple linear regression based on recent performance trends
  const recentEntries = state.history
    .filter(h => h.type === type && h.metric === metric && h.pb)
    .slice(-5) // Last 5 PBs
    .map(h => ({
      date: new Date(h.dateISO).getTime(),
      value: type === 'running' ? h.valueSeconds : h.score
    }));

  if (recentEntries.length < 2) return null;

  // Calculate trend (simple linear regression)
  const n = recentEntries.length;
  const sumX = recentEntries.reduce((sum, entry) => sum + entry.date, 0);
  const sumY = recentEntries.reduce((sum, entry) => sum + entry.value, 0);
  const sumXY = recentEntries.reduce((sum, entry) => sum + entry.date * entry.value, 0);
  const sumX2 = recentEntries.reduce((sum, entry) => sum + entry.date * entry.date, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const futureDate = Date.now() + (daysAhead * 24 * 60 * 60 * 1000);
  const prediction = slope * futureDate + intercept;

  return Math.max(0, prediction);
}

function generateTrainingRecommendations() {
  const recommendations = [];
  
  // Analyze running performance
  const runningPBs = Object.entries(state.running).filter(([k, v]) => v !== null);
  if (runningPBs.length > 0) {
    const recentRuns = state.history.filter(h => h.type === 'running').slice(-10);
    const pbRate = recentRuns.filter(h => h.pb).length / recentRuns.length;
    
    if (pbRate < 0.1) {
      recommendations.push({
        type: 'running',
        priority: 'high',
        message: 'Consider varying your training intensity - mix tempo runs with easy runs'
      });
    }
  }

  // Analyze strength trends and balance
  const strengthPBs = Object.entries(state.strength).filter(([k, v]) => v !== null);
  if (strengthPBs.length > 0) {
    const recentStrength = state.history.filter(h => h.type === 'strength').slice(-10);
    const strengthPBRate = recentStrength.filter(h => h.pb).length / recentStrength.length;
    
    if (strengthPBRate < 0.1) {
      recommendations.push({
        type: 'strength',
        priority: 'medium',
        message: 'Try progressive overload - gradually increase weight or reps each week'
      });
    }
    
    // Check for strength imbalances
    const balanceIssues = STRENGTH_ESTIMATIONS.getStrengthRatios(state.strength);
    balanceIssues.forEach(issue => {
      recommendations.push({
        type: 'strength',
        priority: 'medium',
        message: issue.message
      });
    });
    
    // Bodyweight exercise progression recommendations
    if (state.strength.pushups) {
      const progression = STRENGTH_ESTIMATIONS.getBodyweightProgression('pushups', state.strength.pushups);
      if (progression) {
        recommendations.push({
          type: 'strength',
          priority: 'low',
          message: progression.suggestion
        });
      }
    }
    
    if (state.strength.pullups) {
      const progression = STRENGTH_ESTIMATIONS.getBodyweightProgression('pullups', state.strength.pullups);
      if (progression) {
        recommendations.push({
          type: 'strength',
          priority: 'low',
          message: progression.suggestion
        });
      }
    }
  }

  return recommendations;
}

// ---------- Storage Model ----------
const KEY = 'pbTracker_v2'; // Updated version for new features
const defaultState = {
  lastPBCheck: null,
  running: { '5k': null, '10k': null, 'hm': null, 'marathon': null }, // seconds (lower better)
  strength: {
    pushups: null, // reps
    pullups: null, // reps
    dbpress: null, // score = kg*reps
    gobletsquat: null, // score = kg*reps
    dbrow: null // score = kg*reps
  },
  body: { weight: null, bf: null, lean: null }, // latest values
  history: [], // entries: {type, metric, value, display, dateISO, pb:boolean}
  
  // New personalization features
  profile: {
    name: '',
    age: null,
    experience: 'beginner', // beginner, intermediate, advanced
    primaryGoal: 'general', // general, endurance, strength, weight_loss
    trainingDays: 3
  },
  goals: {
    running: {},
    strength: {},
    body: {}
  },
  preferences: {
    units: 'metric', // metric, imperial
    theme: 'dark',
    showEstimations: true,
    showPredictions: true
  }
};

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaultState);
  } catch (e) {
    return structuredClone(defaultState);
  }
}

function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

let state = loadState();

// ---------- UI Bindings ----------
function setDelta(id, delta, betterIsLower = false) {
  const el = $(`#delta-${id}`);
  if (delta == null) {
    el.textContent = '—';
    el.className = 'delta';
    return;
  }
  const sign = delta > 0 ? '+' : '';
  el.textContent = betterIsLower
    ? (delta < 0 ? `${toHMS(Math.abs(delta))} faster` : delta > 0 ? `${toHMS(delta)} slower` : '—')
    : (delta !== 0 ? `${sign}${delta.toFixed(1)}` : '—');
  el.className = 'delta ' + (
    betterIsLower
      ? (delta < 0 ? 'up' : delta > 0 ? 'down' : '')
      : (delta > 0 ? 'up' : delta < 0 ? 'down' : '')
  );
}

function renderEstimations(type, metric, currentValue) {
  if (type === 'running') {
    // Show estimated times for other distances
    const distances = ['5k', '10k', 'hm', 'marathon'];
    distances.forEach(dist => {
      if (dist !== metric) {
        const estimated = VDOT_TABLE.getEquivalentTime(metric, currentValue, dist);
        if (estimated) {
          const estimateEl = $(`#estimate-${dist}`);
          if (estimateEl) {
            estimateEl.textContent = `~${toHMS(estimated)}`;
            estimateEl.style.display = 'block';
          }
        }
      }
    });
  } else if (type === 'strength') {
    // Show strength-specific estimations
    const estimateEl = $(`#estimate-${metric}`);
    if (!estimateEl) return;
    
    let estimationText = '';
    
    if (metric === 'pushups' || metric === 'pullups') {
      // Bodyweight exercises - show progression suggestions
      const progression = STRENGTH_ESTIMATIONS.getBodyweightProgression(metric, currentValue);
      if (progression) {
        estimationText = `Next: ${progression.next}`;
      }
    } else {
      // Weighted exercises - show 1RM estimation
      const lastEntry = state.history
        .filter(h => h.type === 'strength' && h.metric === metric && h.pb)
        .slice(-1)[0];
      
      if (lastEntry && lastEntry.kg && lastEntry.reps) {
        const estimated1RM = STRENGTH_ESTIMATIONS.estimate1RM(lastEntry.kg, lastEntry.reps);
        estimationText = `Est. 1RM: ${estimated1RM}kg`;
        
        // Also show reps at different weights
        const repsAt80 = STRENGTH_ESTIMATIONS.estimateRepsAtWeight(estimated1RM, Math.round(estimated1RM * 0.8));
        estimationText += ` | ${Math.round(estimated1RM * 0.8)}kg × ${repsAt80}`;
      }
    }
    
    if (estimationText) {
      estimateEl.textContent = estimationText;
      estimateEl.style.display = 'block';
    }
  }
}

function renderPrediction(type, metric) {
  const prediction = predictFuturePerformance(type, metric, 28);
  if (prediction) {
    const predEl = $(`#pred-${metric}`);
    if (predEl) {
      const displayValue = type === 'running' ? toHMS(prediction) : prediction.toFixed(1);
      predEl.textContent = `📈 ${displayValue}`;
      predEl.style.display = 'block';
    }
  }
}

function renderRecommendations() {
  const recommendations = generateTrainingRecommendations();
  const container = $('#recommendations');
  if (container && recommendations.length > 0) {
    container.innerHTML = recommendations.map(rec => 
      `<div class="recommendation ${rec.priority}">
        <span class="rec-icon">${rec.type === 'running' ? '🏃' : '🏋️'}</span>
        <span class="rec-message">${rec.message}</span>
      </div>`
    ).join('');
    container.style.display = 'block';
  }
}

function render() {
  // Running
  const runMap = { '5k': 'pb-5k', '10k': 'pb-10k', 'hm': 'pb-hm', 'marathon': 'pb-marathon' };
  for (const k of Object.keys(runMap)) {
    const v = state.running[k];
    $(`#${runMap[k]}`).textContent = v != null ? toHMS(v) : '--';
    // delta vs previous same metric from history
    const prev = lastPrevious('running', k);
    const delta = prev ? v - prev.valueSeconds : null;
    setDelta(k === 'hm' ? 'hm' : (k === 'marathon' ? 'marathon' : k), delta, true);
    
    // Add estimations if enabled
    if (state.preferences.showEstimations && v != null) {
      renderEstimations('running', k, v);
    }
    
    // Add predictions if enabled
    if (state.preferences.showPredictions) {
      renderPrediction('running', k);
    }
  }

  // Strength (score logic for weighted)
  const sMap = ['pushups', 'pullups', 'dbpress', 'gobletsquat', 'dbrow'];
  for (const k of sMap) {
    const v = state.strength[k];
    $(`#pb-${k}`).textContent = v != null ? strengthDisplayFromScore(k, v) : '--';
    const prev = lastPrevious('strength', k);
    const delta = prev ? v - prev.score : null;
    setDelta(k, delta, false);
    
    // Add estimations if enabled
    if (state.preferences.showEstimations && v != null) {
      renderEstimations('strength', k, v);
    }
    
    // Add predictions if enabled
    if (state.preferences.showPredictions) {
      renderPrediction('strength', k);
    }
  }

  // Body (trend in 4 weeks)
  $('#pb-weight').textContent = state.body.weight ?? '--';
  $('#pb-bf').textContent = state.body.bf ?? '--';
  $('#pb-lean').textContent = state.body.lean ?? '--';
  // deltas vs 28 days ago
  const bPrev = lastByDays('body', 28);
  if (bPrev) {
    setDelta('weight', state.body.weight != null && bPrev.weight != null ? state.body.weight - bPrev.weight : null, false);
    setDelta('bf', state.body.bf != null && bPrev.bf != null ? state.body.bf - bPrev.bf : null, false);
    setDelta('lean', state.body.lean != null && bPrev.lean != null ? state.body.lean - bPrev.lean : null, false);
  } else {
    setDelta('weight', null);
    setDelta('bf', null);
    setDelta('lean', null);
  }

  // History
  const tbody = $('#historyTable tbody');
  tbody.innerHTML = '';
  for (const row of [...state.history].reverse().slice(0, 50)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${fmtDate(row.dateISO)}</td>
                    <td>${row.type} • ${row.metric}</td>
                    <td class="right">${row.display}${row.pb ? ' <span class="badge" style="color:var(--acc);border-color:rgba(110,231,183,.3)">PB</span>' : ''}</td>`;
    tbody.appendChild(tr);
  }

  // Reminder & last check
  if (state.lastPBCheck) {
    $('#last-check').textContent = 'Last PB check: ' + fmtDate(state.lastPBCheck);
  }
  checkReminder();
  
  // Render recommendations
  renderRecommendations();
  
  // Update profile display
  if (state.profile.name) {
    const profileEl = $('#profile-name');
    if (profileEl) profileEl.textContent = `Welcome back, ${state.profile.name}!`;
  }
}

function checkReminder() {
  // last PB entry across running/strength
  const lastPB = [...state.history].reverse().find(h => h.pb);
  const box = $('#reminder');
  if (!lastPB) {
    box.style.display = 'flex';
    return;
  }
  const days = (Date.now() - new Date(lastPB.dateISO).getTime()) / 86400000;
  if (days >= 28) {
    box.style.display = 'flex';
  } else {
    box.style.display = 'none';
  }
}

function lastPrevious(type, metric) {
  // find last before current PB for a metric
  let currIdx = state.history.findIndex(h => h.type === type && h.metric === metric);
  // We'll scan from the end
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    if (h.type === type && h.metric === metric) {
      // previous before this one
      for (let j = i - 1; j >= 0; j--) {
        const p = state.history[j];
        if (p.type === type && p.metric === metric) {
          return p;
        }
      }
      return null;
    }
  }
  return null;
}

function lastByDays(type, days) {
  // find the entry closest to N days ago (body type only)
  const target = Date.now() - days * 86400000;
  const candidates = state.history.filter(h => h.type === type);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => Math.abs(new Date(a.dateISO) - target) - Math.abs(new Date(b.dateISO) - target));
  const c = candidates[0];
  return c ? { weight: c.weight ?? null, bf: c.bf ?? null, lean: c.lean ?? null } : null;
}

function strengthScoreFromInputs(metric, kg, reps) {
  // reps-only metrics ignore kg
  if (metric === 'pushups' || metric === 'pullups') {
    return Number(reps || 0);
  }
  // simple score = kg * reps for DB movements
  const k = Number(kg || 0);
  const r = Number(reps || 0);
  return k * r;
}

function strengthDisplayFromScore(metric, score) {
  if (metric === 'pushups' || metric === 'pullups') {
    return `${score | 0} reps`;
  }
  return `${score.toFixed(1)} pts`;
}

// ---------- Form & Save ----------
const catBtns = $$('.chipbtn[data-cat]');
let activeCat = 'running';

function setCat(cat) {
  activeCat = cat;
  catBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  $('#fields-running').style.display = cat === 'running' ? 'block' : 'none';
  $('#fields-strength').style.display = cat === 'strength' ? 'block' : 'none';
  $('#fields-body').style.display = cat === 'body' ? 'block' : 'none';
}

catBtns.forEach(b => b.addEventListener('click', () => setCat(b.dataset.cat)));

$('#pb-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (activeCat === 'running') {
    const dist = $('#runDistance').value; // 5k, 10k, hm, marathon
    const t = parseHMS($('#runTime').value.trim());
    const dateISO = $('#runDate').value || todayISO();
    if (t == null) {
      alert('Please enter time as hh:mm:ss (or mm:ss).');
      return;
    }
    const current = state.running[dist];
    const isPB = current == null || t < current;
    if (isPB) {
      state.running[dist] = t;
      state.lastPBCheck = dateISO;
      flash('#card-running');
    }
    state.history.push({
      type: 'running',
      metric: dist,
      valueSeconds: t,
      display: toHMS(t),
      dateISO,
      pb: isPB
    });
  } else if (activeCat === 'strength') {
    const metric = $('#exName').value;
    const kg = Number($('#exWeight').value || 0);
    const reps = Number($('#exReps').value || 0);
    if (!reps) {
      alert('Please enter reps.');
      return;
    }
    const score = strengthScoreFromInputs(metric, kg, reps);
    const dateISO = $('#exDate').value || todayISO();
    const current = state.strength[metric];
    const isPB = current == null || score > current;
    if (isPB) {
      state.strength[metric] = score;
      state.lastPBCheck = dateISO;
      flash('#card-strength');
    }
        state.history.push({
          type: 'strength',
          metric,
          score,
          kg: kg, // Store weight for 1RM calculations
          reps: reps, // Store reps for 1RM calculations
          display: strengthDisplayFromScore(metric, score),
          dateISO,
          pb: isPB
        });
  } else {
    // body
    let weight = $('#bodyWeight').value ? Number($('#bodyWeight').value) : null;
    let bf = $('#bodyBF').value ? Number($('#bodyBF').value) : null;
    let lean = $('#bodyLean').value ? Number($('#bodyLean').value) : null;
    const dateISO = $('#bodyDate').value || todayISO();
    if (weight != null && bf != null && (lean == null)) {
      lean = Number(((weight * (100 - bf)) / 100).toFixed(1));
      $('#bodyLean').value = String(lean);
    }
    if (weight == null && bf == null && lean == null) {
      alert('Enter at least one body metric.');
      return;
    }
    state.body.weight = weight ?? state.body.weight;
    state.body.bf = bf ?? state.body.bf;
    state.body.lean = lean ?? state.body.lean;
    state.history.push({
      type: 'body',
      metric: 'composition',
      weight,
      bf,
      lean,
      display: [weight != null ? `${weight}kg` : null, bf != null ? `${bf}%` : null, lean != null ? `${lean}kg` : null].filter(Boolean).join(' • '),
      dateISO,
      pb: false
    });
    flash('#card-body');
  }
  saveState(state);
  render();
  // reset simple fields (keep dates convenient)
  $('#runTime').value = '';
  $('#exWeight').value = '';
  $('#exReps').value = '';
  // keep body fields for quick adjustments
});

function flash(sel) {
  const el = $(sel);
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 900);
}

$('#clearAll').addEventListener('click', () => {
  if (confirm('Clear all PB data?')) {
    localStorage.removeItem(KEY);
    state = loadState();
    render();
  }
});

// ---------- Initialization ----------
// Seed today's date inputs
$('#runDate').value = todayISO();
$('#exDate').value = todayISO();
$('#bodyDate').value = todayISO();

// ---------- Settings & Personalization ----------
function openSettings() {
  const modal = $('#settingsModal');
  modal.style.display = 'flex';
  
  // Populate current values
  $('#profileName').value = state.profile.name || '';
  $('#profileAge').value = state.profile.age || '';
  $('#profileExperience').value = state.profile.experience;
  $('#primaryGoal').value = state.profile.primaryGoal;
  $('#showEstimations').checked = state.preferences.showEstimations;
  $('#showPredictions').checked = state.preferences.showPredictions;
  $('#unitsSelect').value = state.preferences.units;
  
  // Populate goals
  if (state.goals.running['5k']) {
    $('#goal5k').value = toHMS(state.goals.running['5k']);
  }
  if (state.goals.strength.pushups) {
    $('#goalPushups').value = state.goals.strength.pushups;
  }
  if (state.goals.body.weight) {
    $('#goalWeight').value = state.goals.body.weight;
  }
}

function closeSettings() {
  $('#settingsModal').style.display = 'none';
}

function saveSettings() {
  // Update profile
  state.profile.name = $('#profileName').value.trim();
  state.profile.age = $('#profileAge').value ? Number($('#profileAge').value) : null;
  state.profile.experience = $('#profileExperience').value;
  state.profile.primaryGoal = $('#primaryGoal').value;
  
  // Update preferences
  state.preferences.showEstimations = $('#showEstimations').checked;
  state.preferences.showPredictions = $('#showPredictions').checked;
  state.preferences.units = $('#unitsSelect').value;
  
  // Update goals
  const goal5k = $('#goal5k').value.trim();
  if (goal5k) {
    const goalSeconds = parseHMS(goal5k);
    if (goalSeconds) {
      state.goals.running['5k'] = goalSeconds;
    }
  }
  
  const goalPushups = $('#goalPushups').value;
  if (goalPushups) {
    state.goals.strength.pushups = Number(goalPushups);
  }
  
  const goalWeight = $('#goalWeight').value;
  if (goalWeight) {
    state.goals.body.weight = Number(goalWeight);
  }
  
  saveState(state);
  render();
  closeSettings();
}

// Event listeners for settings
$('#settingsBtn').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', closeSettings);
$('#saveSettings').addEventListener('click', saveSettings);

// Close modal when clicking outside
$('#settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') {
    closeSettings();
  }
});

// Initial render
render();
