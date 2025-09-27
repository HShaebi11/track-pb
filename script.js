/* ===== HYBRID ATHLETE PERFORMANCE LEDGER - OPTIMIZED ===== */

// ---------- CORE UTILITIES ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
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
    el.className = 'metric-delta';
    return;
  }
  
  let deltaText = '—';
  let deltaClass = 'metric-delta';
  
  if (betterIsLower) {
    // Running times - lower is better
    if (delta < 0) {
      deltaText = `↓ ${toHMS(Math.abs(delta))}`;
      deltaClass = 'metric-delta delta-up';
    } else if (delta > 0) {
      deltaText = `↑ ${toHMS(delta)}`;
      deltaClass = 'metric-delta delta-down';
    }
  } else {
    // Strength/body - higher is usually better
    if (delta > 0) {
      deltaText = `↑ ${delta.toFixed(1)}`;
      deltaClass = 'metric-delta delta-up';
    } else if (delta < 0) {
      deltaText = `↓ ${Math.abs(delta).toFixed(1)}`;
      deltaClass = 'metric-delta delta-down';
    }
  }
  
  el.textContent = deltaText;
  el.className = deltaClass;
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
    const header = container.querySelector('.system-header');
    let content = recommendations.map(rec => 
      `<div class="recommendation ${rec.priority}">
        <span class="recommendation-icon">${rec.type === 'running' ? 'RUN' : 'STR'}</span>
        <span>${rec.message.toUpperCase()}</span>
      </div>`
    ).join('');
    
    if (header) {
      container.innerHTML = `<div class="system-header">TRAINING RECOMMENDATIONS</div>${content}`;
    } else {
      container.innerHTML = content;
    }
    container.style.display = 'block';
    addSlideInAnimation(container);
  }
}

function render() {
  // Running - Antithesis Table Format
  const runMap = { '5k': 'pb-5k', '10k': 'pb-10k', 'hm': 'pb-hm', 'marathon': 'pb-marathon' };
  for (const k of Object.keys(runMap)) {
    const v = state.running[k];
    const displayTime = v != null ? toHMS(v) : '--:--';
    $(`#${runMap[k]}`).textContent = displayTime;
    
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

  // Strength - Antithesis Table Format
  const sMap = ['pushups', 'pullups', 'dbpress', 'gobletsquat', 'dbrow'];
  for (const k of sMap) {
    const v = state.strength[k];
    let displayText = '-- REPS';
    if (v != null) {
      if (k === 'pushups' || k === 'pullups') {
        displayText = `${v|0} REPS`;
      } else {
        displayText = `${v.toFixed(1)} PTS`;
      }
    }
    $(`#pb-${k}`).textContent = displayText;
    
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

  // History - Antithesis Table Format
  const tbody = $('#historyTable tbody');
  tbody.innerHTML = '';
  for (const row of [...state.history].reverse().slice(0, 50)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="metric-name">${fmtDate(row.dateISO)}</td>
                    <td class="metric-name">${row.type.toUpperCase()} // ${row.metric.toUpperCase()}</td>
                    <td class="metric-value text-right">${row.display}${row.pb ? ' PB' : ''}</td>`;
    tbody.appendChild(tr);
    if (row.pb) {
      addSlideInAnimation(tr);
    }
  }

  // Reminder & last check - Antithesis Format
  if (state.lastPBCheck) {
    $('#last-check').textContent = `LAST CHECK: ${fmtDate(state.lastPBCheck)}`;
  }
  checkReminder();
  
  // Render recommendations
  renderRecommendations();
  
  // Update profile display - Antithesis Format
  if (state.profile.name) {
    const profileEl = $('#profile-name');
    if (profileEl) profileEl.textContent = `OPERATOR: ${state.profile.name.toUpperCase()}`;
  }
  
  // Render card view
  renderCardView();
  
  // Check 4-week reminder
  check4WeekReminder();
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

// ---------- ANTITHESIS GASP ANIMATION SYSTEM ----------
function addGaspAnimation(element) {
  element.classList.add('gasp');
  setTimeout(() => element.classList.remove('gasp'), 200);
}

function addPulseAnimation(element) {
  element.classList.add('pulse');
  setTimeout(() => element.classList.remove('pulse'), 300);
}

function addSlideInAnimation(element) {
  element.classList.add('slide-in');
  setTimeout(() => element.classList.remove('slide-in'), 150);
}

// ---------- PB DASHBOARD & VIEW MANAGEMENT ----------
let currentView = 'card'; // 'card' or 'table'

function switchView(view) {
  currentView = view;
  
  // Update toggle buttons
  $('#cardViewBtn').classList.toggle('active', view === 'card');
  $('#tableViewBtn').classList.toggle('active', view === 'table');
  
  // Show/hide views
  $('#pbCardView').style.display = view === 'card' ? 'block' : 'none';
  $('#pbTableView').style.display = view === 'table' ? 'block' : 'none';
  
  addGaspAnimation(view === 'card' ? $('#pbCardView') : $('#pbTableView'));
}

// View toggle event listeners
$('#cardViewBtn').addEventListener('click', () => switchView('card'));
$('#tableViewBtn').addEventListener('click', () => switchView('table'));

// ---------- QUICK ADD MODAL ----------
function openQuickAdd() {
  const modal = $('#quickAddModal');
  modal.style.display = 'flex';
  
  // Set today's date for all date inputs
  $('#quickRunDate').value = todayISO();
  $('#quickExDate').value = todayISO();
  $('#quickBodyDate').value = todayISO();
  
  addSlideInAnimation(modal.querySelector('.modal-content'));
}

function closeQuickAdd() {
  $('#quickAddModal').style.display = 'none';
}

// Quick Add event listeners
$('#quickAddBtn').addEventListener('click', openQuickAdd);
$('#closeQuickAdd').addEventListener('click', closeQuickAdd);

// Close modal when clicking outside
$('#quickAddModal').addEventListener('click', (e) => {
  if (e.target.id === 'quickAddModal') {
    closeQuickAdd();
  }
});

// ---------- EDITORIAL PILL BUTTONS ----------
const pillBtns = $$('.editorial-pill[data-cat]');
let activeCat = 'running';

function setCat(cat) {
  activeCat = cat;
  pillBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
    b.setAttribute('aria-pressed', String(b.dataset.cat === cat));
    if (b.dataset.cat === cat) {
      addGaspAnimation(b);
    }
  });
  
  // Update main form fields
  $('#fields-running').style.display = cat === 'running' ? 'block' : 'none';
  $('#fields-strength').style.display = cat === 'strength' ? 'block' : 'none';
  $('#fields-body').style.display = cat === 'body' ? 'block' : 'none';
  
  // Update quick add form fields
  $('#quick-fields-running').style.display = cat === 'running' ? 'block' : 'none';
  $('#quick-fields-strength').style.display = cat === 'strength' ? 'block' : 'none';
  $('#quick-fields-body').style.display = cat === 'body' ? 'block' : 'none';
}

pillBtns.forEach(b => b.addEventListener('click', () => setCat(b.dataset.cat)));

// ---------- 4-WEEK REMINDER SYSTEM ----------
function check4WeekReminder() {
  const lastPBDate = getLastPBDate();
  const banner = $('#reminderBanner');
  
  if (lastPBDate) {
    const daysSince = (Date.now() - new Date(lastPBDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 28) {
      banner.style.display = 'block';
      addSlideInAnimation(banner);
    }
  }
}

function getLastPBDate() {
  const pbEntries = state.history.filter(h => h.pb);
  if (pbEntries.length === 0) return null;
  
  return pbEntries[pbEntries.length - 1].dateISO;
}

$('#dismissReminder').addEventListener('click', () => {
  $('#reminderBanner').style.display = 'none';
});

// ---------- CARD VIEW RENDERING ----------
function renderCardView() {
  // Running cards
  const runMap = { '5k': 'card-5k', '10k': 'card-10k', 'hm': 'card-hm', 'marathon': 'card-marathon' };
  for (const [k, id] of Object.entries(runMap)) {
    const v = state.running[k];
    const displayTime = v != null ? toHMS(v) : '--:--';
    $(`#${id}`).textContent = displayTime;
    
    // Show change from previous PB
    const prev = lastPrevious('running', k);
    if (prev && v != null) {
      const delta = v - prev.valueSeconds;
      const changeEl = $(`#card-change-${k}`);
      if (delta < 0) {
        changeEl.textContent = `↓ ${toHMS(Math.abs(delta))} FASTER`;
        changeEl.className = 'pb-card-change improvement';
        $(`[data-metric="${k}"]`).classList.add('improved');
      } else if (delta > 0) {
        changeEl.textContent = `↑ ${toHMS(delta)} SLOWER`;
        changeEl.className = 'pb-card-change decline';
      }
    }
  }
  
  // Strength cards
  const sMap = ['pushups', 'pullups', 'dbpress', 'gobletsquat', 'dbrow'];
  for (const k of sMap) {
    const v = state.strength[k];
    let displayText = '-- REPS';
    if (v != null) {
      if (k === 'pushups' || k === 'pullups') {
        displayText = `${v|0} REPS`;
      } else {
        displayText = `${v.toFixed(1)} PTS`;
      }
    }
    $(`#card-${k}`).textContent = displayText;
    
    // Show change from previous PB
    const prev = lastPrevious('strength', k);
    if (prev && v != null) {
      const delta = v - prev.score;
      const changeEl = $(`#card-change-${k}`);
      if (delta > 0) {
        changeEl.textContent = `↑ +${delta.toFixed(1)}`;
        changeEl.className = 'pb-card-change improvement';
        $(`[data-metric="${k}"]`).classList.add('improved');
      } else if (delta < 0) {
        changeEl.textContent = `↓ ${delta.toFixed(1)}`;
        changeEl.className = 'pb-card-change decline';
      }
    }
  }
  
  // Body composition cards
  $(`#card-weight`).textContent = state.body.weight ? `${state.body.weight} KG` : '-- KG';
  $(`#card-bf`).textContent = state.body.bf ? `${state.body.bf} %` : '-- %';
  $(`#card-lean`).textContent = state.body.lean ? `${state.body.lean} KG` : '-- KG';
  
  // Body changes (28-day trend)
  const bPrev = lastByDays('body', 28);
  if (bPrev) {
    ['weight', 'bf', 'lean'].forEach(metric => {
      const current = state.body[metric];
      const previous = bPrev[metric];
      if (current != null && previous != null) {
        const delta = current - previous;
        const changeEl = $(`#card-change-${metric}`);
        if (Math.abs(delta) > 0.1) {
          const sign = delta > 0 ? '↑ +' : '↓ ';
          changeEl.textContent = `${sign}${Math.abs(delta).toFixed(1)} (28D)`;
          changeEl.className = delta > 0 ? 'pb-card-change improvement' : 'pb-card-change decline';
        }
      }
    });
  }
}

// ---------- Form & Save ----------
const catBtns = $$('.chip[data-cat]');
// let activeCat = 'running'; // Already defined above

function setCat(cat) {
  activeCat = cat;
  catBtns.forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.cat === cat));
    if (b.dataset.cat === cat) {
      addGaspAnimation(b);
    }
  });
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
  addGaspAnimation(el);
  // Add pulse to any updated values in the module
  const values = el.querySelectorAll('.metric-value');
  values.forEach(val => addPulseAnimation(val));
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

// ---------- QUICK ADD FORM SUBMISSION ----------
$('#saveQuickAdd').addEventListener('click', (e) => {
  e.preventDefault();
  
  if (activeCat === 'running') {
    const dist = $('#quickRunDistance').value;
    const t = parseHMS($('#quickRunTime').value.trim());
    const dateISO = $('#quickRunDate').value || todayISO();
    
    if (t == null) {
      alert('Please enter time as hh:mm:ss (or mm:ss).');
      return;
    }
    
    const current = state.running[dist];
    const isPB = current == null || t < current;
    
    if (isPB) {
      state.running[dist] = t;
      state.lastPBCheck = dateISO;
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
    const metric = $('#quickExName').value;
    const kg = Number($('#quickExWeight').value || 0);
    const reps = Number($('#quickExReps').value || 0);
    
    if (!reps) {
      alert('Please enter reps.');
      return;
    }
    
    const score = strengthScoreFromInputs(metric, kg, reps);
    const dateISO = $('#quickExDate').value || todayISO();
    const current = state.strength[metric];
    const isPB = current == null || score > current;
    
    if (isPB) {
      state.strength[metric] = score;
      state.lastPBCheck = dateISO;
    }
    
    state.history.push({
      type: 'strength',
      metric,
      score,
      kg: kg,
      reps: reps,
      display: strengthDisplayFromScore(metric, score),
      dateISO,
      pb: isPB
    });
    
  } else {
    // body
    let weight = $('#quickBodyWeight').value ? Number($('#quickBodyWeight').value) : null;
    let bf = $('#quickBodyBF').value ? Number($('#quickBodyBF').value) : null;
    let lean = $('#quickBodyLean').value ? Number($('#quickBodyLean').value) : null;
    const dateISO = $('#quickBodyDate').value || todayISO();
    
    if (weight != null && bf != null && lean == null) {
      lean = Number(((weight * (100 - bf)) / 100).toFixed(1));
      $('#quickBodyLean').value = String(lean);
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
  }
  
  saveState(state);
  render();
  closeQuickAdd();
  
  // Reset form
  $('#quickRunTime').value = '';
  $('#quickExWeight').value = '';
  $('#quickExReps').value = '';
  // Keep body fields for quick adjustments
  
  // Flash success animation
  addGaspAnimation($('#pbCardView'));
});

// Auto-save inputs to localStorage (basic implementation)
function setupAutoSave() {
  const inputs = ['quickRunTime', 'quickExWeight', 'quickExReps', 'quickBodyWeight', 'quickBodyBF', 'quickBodyLean'];
  
  inputs.forEach(id => {
    const input = $(`#${id}`);
    if (input) {
      // Load saved value
      const saved = localStorage.getItem(`autosave_${id}`);
      if (saved) input.value = saved;
      
      // Save on change
      input.addEventListener('input', () => {
        localStorage.setItem(`autosave_${id}`, input.value);
      });
    }
  });
}

// Initialize auto-save
setupAutoSave();

// Initial render
render();
