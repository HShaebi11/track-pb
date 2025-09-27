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

// ---------- Storage Model ----------
const KEY = 'pbTracker_v1';
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
  history: [] // entries: {type, metric, value, display, dateISO, pb:boolean}
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
  }

  // Strength (score logic for weighted)
  const sMap = ['pushups', 'pullups', 'dbpress', 'gobletsquat', 'dbrow'];
  for (const k of sMap) {
    const v = state.strength[k];
    $(`#pb-${k}`).textContent = v != null ? strengthDisplayFromScore(k, v) : '--';
    const prev = lastPrevious('strength', k);
    const delta = prev ? v - prev.score : null;
    setDelta(k, delta, false);
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

// Initial render
render();
