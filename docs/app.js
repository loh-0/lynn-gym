/* ============================================================================
   SUPABASE — this app points at an existing Supabase project that already
   has the `sessions` and `sets` tables, RLS policies, and this account
   provisioned. No SQL needs to be run for this deployment.

   The one manual step (already done per-project, once per new user of that
   project): Supabase Dashboard → Authentication → Users → Add user, to
   create this account's email/password. RLS scopes every row by
   auth.uid(), so each user's sessions/sets are only ever visible to them.
   ============================================================================ */

// ============================================================================
// CONFIG — Supabase project URL and anon key
// ============================================================================
const SUPABASE_URL = 'https://tverznmarwwzcvoyudrb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hg2CllEdPWmDEt8UUHaLpg_-J_DDYuI';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const isConfigured =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('YOUR-PROJECT') &&
  !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY') &&
  SUPABASE_URL.startsWith('http');

const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ============================================================================
// Program definition
// ============================================================================
const PROGRAM = {
  1: {
    label: 'Squat & Press',
    exercises: [
      { name: 'Goblet Squat', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Dumbbell Shoulder Press', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Single Arm Dumbbell Row', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Hip Thrust', sets: 3, repRange: '12', rest: 60, optional: true },
      { name: 'Dumbbell Curl', sets: 3, repRange: '12', rest: 60, optional: true },
      { name: 'Tricep Overhead Extension', sets: 3, repRange: '12', rest: 60, optional: true },
    ],
  },
  2: {
    label: 'Deadlift & Push',
    exercises: [
      { name: 'Romanian Deadlift', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Push Up', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Lat Pulldown', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Hip Abduction Machine', sets: 3, repRange: '15', rest: 60, optional: true },
      { name: 'Hamstring Curl Machine', sets: 3, repRange: '12', rest: 60, optional: true },
      { name: 'Lateral Raise', sets: 3, repRange: '12', rest: 60, optional: true },
    ],
  },
  3: {
    label: 'Split Squat & Incline Press',
    exercises: [
      { name: 'Bulgarian Split Squat', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Dumbbell Incline Press', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Single Arm Dumbbell Row', sets: 3, repRange: '8-12', rest: 90, optional: false },
      { name: 'Cable Glute Kickback', sets: 3, repRange: '15', rest: 60, optional: true },
      { name: 'Hip Abduction Machine', sets: 3, repRange: '15', rest: 60, optional: true },
      { name: 'Dumbbell Curl', sets: 3, repRange: '12', rest: 60, optional: true },
    ],
  },
};

// ============================================================================
// Icons (inline SVG strings — no emoji in UI chrome)
// ============================================================================
const ICONS = {
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  note: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
};

// ============================================================================
// State + cache
// ============================================================================
const cache = { sessions: [], sets: [] };
const state = {
  view: 'today',
  selectedDay: 1,
  exerciseUI: {},
  altByExercise: {},
  calendar: null,
};
let dataLoaded = false;
let progressChart = null;

// ============================================================================
// DOM helper
// ============================================================================
function h(tag, opts = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(opts)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

// ============================================================================
// Date utilities
// ============================================================================
function pad(n) { return String(n).padStart(2, '0'); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function daysBetween(aStr, bStr) {
  return Math.round((parseDateStr(bStr) - parseDateStr(aStr)) / 86400000);
}
function formatShortDate(s) {
  const d = parseDateStr(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function formatLongDate(s) {
  const d = parseDateStr(s);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function monthLabel({ year, month }) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
}
const WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function formatHeaderDate(s) {
  const d = parseDateStr(s);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// ============================================================================
// Screen switching
// ============================================================================
function showScreen(name) {
  document.getElementById('setup-screen').classList.toggle('hidden', name !== 'setup');
  document.getElementById('login-screen').classList.toggle('hidden', name !== 'login');
  document.getElementById('app').classList.toggle('hidden', name !== 'app');
}

// ============================================================================
// Derived data
// ============================================================================
function computeLastWeights() {
  const map = {};
  const sessionById = Object.fromEntries(cache.sessions.map((s) => [s.id, s]));
  for (const set of cache.sets) {
    if (set.weight == null) continue;
    const session = sessionById[set.session_id];
    if (!session) continue;
    const key = set.exercise_name + '|' + set.set_number;
    const cur = map[key];
    if (!cur || session.date > cur.date) map[key] = { weight: set.weight, date: session.date };
  }
  return map;
}

function getSetPrefill(exerciseName, setNumber) {
  const dateStr = todayISO();
  const todaySession = cache.sessions.find((s) => s.date === dateStr);
  if (todaySession) {
    const existing = cache.sets.find(
      (s) => s.session_id === todaySession.id && s.exercise_name === exerciseName && s.set_number === setNumber
    );
    if (existing) {
      return {
        reps: existing.reps ?? '',
        weight: existing.weight ?? '',
        logged: existing.reps != null && existing.weight != null,
      };
    }
  }
  const last = computeLastWeights()[exerciseName + '|' + setNumber];
  return { reps: '', weight: last ? last.weight : '', logged: false };
}

function computeSuggestedDay() {
  const dateStr = todayISO();
  const todaySession = cache.sessions.find((s) => s.date === dateStr);
  if (todaySession) return todaySession.day_number;
  if (cache.sessions.length === 0) return 1;
  const last = cache.sessions.reduce((a, b) => (a.date > b.date ? a : b));
  return (last.day_number % 3) + 1;
}

function computeStreak() {
  const dates = [...new Set(cache.sessions.map((s) => s.date))].sort();
  if (dates.length === 0) return 0;
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    if (daysBetween(dates[i - 1], dates[i]) <= 4) streak++;
    else break;
  }
  return streak;
}

function computeLastWorkoutLabel() {
  if (cache.sessions.length === 0) return String.fromCharCode(8212); // em dash
  const last = cache.sessions.reduce((a, b) => (a.date > b.date ? a : b));
  const diff = daysBetween(last.date, todayISO());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

function computeCompletion() {
  const day = PROGRAM[state.selectedDay];
  const mandatory = day.exercises.filter((e) => !e.optional);
  const total = mandatory.reduce((sum, e) => sum + e.sets, 0);
  const dateStr = todayISO();
  const session = cache.sessions.find((s) => s.date === dateStr);
  let logged = 0;
  if (session) {
    logged = cache.sets.filter(
      (s) =>
        s.session_id === session.id &&
        mandatory.some((e) => e.name === s.exercise_name) &&
        s.reps != null &&
        s.weight != null
    ).length;
  }
  return { logged, total };
}

function lastDateForDay(dayNum) {
  const matches = cache.sessions.filter((s) => s.day_number === dayNum);
  if (!matches.length) return null;
  return matches.reduce((a, b) => (a.date > b.date ? a : b)).date;
}

// ============================================================================
// Supabase read/write
// ============================================================================
async function loadAllData() {
  const [{ data: sessions, error: sErr }, { data: sets, error: setErr }] = await Promise.all([
    supabase.from('sessions').select('*').order('date', { ascending: false }),
    supabase.from('sets').select('*'),
  ]);
  if (sErr) console.error(sErr);
  if (setErr) console.error(setErr);
  cache.sessions = sessions || [];
  cache.sets = sets || [];
}

async function ensureSessionForToday() {
  const dateStr = todayISO();
  const existing = cache.sessions.find((s) => s.date === dateStr);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('sessions')
    .insert({ date: dateStr, day_number: state.selectedDay })
    .select()
    .single();
  if (error) throw error;
  cache.sessions.unshift(data);
  return data;
}

async function logSetHandler(exerciseName, setNumber, repsVal, weightVal, btnEl) {
  if (repsVal === '' || weightVal === '') {
    const row = btnEl.closest('.set-row');
    row?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
      { duration: 220 }
    );
    return;
  }
  btnEl.disabled = true;
  try {
    const session = await ensureSessionForToday();
    const alt = state.altByExercise[exerciseName] || { active: false, note: '' };
    const payload = {
      session_id: session.id,
      exercise_name: exerciseName,
      set_number: setNumber,
      reps: Number(repsVal),
      weight: Number(weightVal),
      is_alternative: alt.active,
      alternative_note: alt.active ? alt.note || null : null,
    };
    const { data, error } = await supabase
      .from('sets')
      .upsert(payload, { onConflict: 'session_id,exercise_name,set_number' })
      .select()
      .single();
    if (error) throw error;

    const idx = cache.sets.findIndex(
      (s) => s.session_id === session.id && s.exercise_name === exerciseName && s.set_number === setNumber
    );
    if (idx >= 0) cache.sets[idx] = data;
    else cache.sets.push(data);

    btnEl.classList.add('logged');
    updateStatsAndRing();
  } catch (e) {
    alert('Failed to save set: ' + e.message);
  } finally {
    btnEl.disabled = false;
  }
}

async function selectDay(dayNumber) {
  if (dayNumber === state.selectedDay) return;
  state.selectedDay = dayNumber;
  const dateStr = todayISO();
  const existing = cache.sessions.find((s) => s.date === dateStr);
  if (existing && existing.day_number !== dayNumber) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ day_number: dayNumber })
      .eq('id', existing.id)
      .select()
      .single();
    if (!error && data) Object.assign(existing, data);
  }
  state.altByExercise = {};
  hydrateAltStateFromToday();
  renderTodayView(document.getElementById('view-root'));
}

function hydrateAltStateFromToday() {
  const dateStr = todayISO();
  const session = cache.sessions.find((s) => s.date === dateStr);
  if (!session) return;
  for (const set of cache.sets) {
    if (set.session_id === session.id && set.is_alternative) {
      state.altByExercise[set.exercise_name] = { active: true, note: set.alternative_note || '' };
    }
  }
}

function initTodayState() {
  state.selectedDay = computeSuggestedDay();
  state.exerciseUI = {};
  state.altByExercise = {};
  hydrateAltStateFromToday();
}

// ============================================================================
// Today view
// ============================================================================
const RING_R = 24;
const RING_C = 2 * Math.PI * RING_R;

function createDayHeader() {
  const day = PROGRAM[state.selectedDay];
  const text = h('div', {}, [
    h('div', { class: 'day-header-date mono', text: formatHeaderDate(todayISO()) }),
    h('h2', { class: 'day-header-title', text: day.label }),
  ]);
  return h('div', { class: 'day-header' }, [text, createCompletionRing()]);
}

function createStatRow() {
  const row = h('div', { class: 'stat-row' });
  row.appendChild(
    h('div', { class: 'stat-card' }, [
      h('div', { class: 'stat-label', text: 'Streak' }),
      h('div', { class: 'stat-value', id: 'stat-streak', text: String(computeStreak()) }),
    ])
  );
  row.appendChild(
    h('div', { class: 'stat-card' }, [
      h('div', { class: 'stat-label', text: 'Last Workout' }),
      h('div', { class: 'stat-value', id: 'stat-last', text: computeLastWorkoutLabel() }),
    ])
  );
  return row;
}

function createCompletionRing() {
  const { logged, total } = computeCompletion();
  const pct = total > 0 ? Math.min(1, logged / total) : 0;
  const wrap = h('div', { class: 'ring-compact', title: 'Mandatory sets logged' });
  wrap.innerHTML = `
    <svg class="ring-svg" width="56" height="56" viewBox="0 0 56 56">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563EB"/>
          <stop offset="100%" stop-color="#38BDF8"/>
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="${RING_R}" fill="none" stroke="var(--surface-2)" stroke-width="6"/>
      <circle id="ring-progress-circle" cx="28" cy="28" r="${RING_R}" fill="none" stroke="url(#ringGrad)" stroke-width="6"
        stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"
        transform="rotate(-90 28 28)"/>
    </svg>
    <span class="ring-compact-text mono" id="ring-count-text">${logged}/${total}</span>`;
  requestAnimationFrame(() => {
    const circle = wrap.querySelector('#ring-progress-circle');
    if (circle) circle.style.strokeDashoffset = String(RING_C * (1 - pct));
  });
  return wrap;
}

function updateStatsAndRing() {
  const streakEl = document.getElementById('stat-streak');
  if (streakEl) streakEl.textContent = String(computeStreak());
  const lastEl = document.getElementById('stat-last');
  if (lastEl) lastEl.textContent = computeLastWorkoutLabel();

  const { logged, total } = computeCompletion();
  const countText = document.getElementById('ring-count-text');
  if (countText) countText.textContent = `${logged}/${total}`;
  const circle = document.getElementById('ring-progress-circle');
  if (circle) {
    const pct = total > 0 ? Math.min(1, logged / total) : 0;
    circle.style.strokeDashoffset = String(RING_C * (1 - pct));
  }
  updateDayPickerMeta();
}

function updateDayPickerMeta() {
  document.querySelectorAll('.day-pill').forEach((pill) => {
    const dayNum = Number(pill.dataset.day);
    const meta = pill.querySelector('.day-pill-meta');
    if (!meta) return;
    const lastDate = lastDateForDay(dayNum);
    meta.textContent = lastDate ? `Last: ${formatShortDate(lastDate)}` : 'Not yet done';
  });
}

function createDayPicker() {
  const wrap = h('div', { class: 'day-picker' });
  for (const dayNum of [1, 2, 3]) {
    const day = PROGRAM[dayNum];
    const lastDate = lastDateForDay(dayNum);
    const pill = h(
      'button',
      { class: 'day-pill' + (dayNum === state.selectedDay ? ' selected' : ''), type: 'button', dataset: { day: String(dayNum) } },
      [
        h('span', { class: 'day-pill-label', text: day.label }),
        h('span', { class: 'day-pill-meta', text: lastDate ? `Last: ${formatShortDate(lastDate)}` : 'Not yet done' }),
      ]
    );
    pill.addEventListener('click', () => selectDay(dayNum));
    wrap.appendChild(pill);
  }
  return wrap;
}

function createSetRow(ex, setNumber) {
  const prefill = getSetPrefill(ex.name, setNumber);
  const row = h('div', { class: 'set-row' });
  row.appendChild(h('span', { class: 'set-index mono', text: String(setNumber) }));

  const weightInput = h('input', { class: 'set-input', type: 'number', inputmode: 'decimal', min: '0', step: '0.5', placeholder: 'Weight' });
  weightInput.value = prefill.weight;

  const repsInput = h('input', { class: 'set-input', type: 'number', inputmode: 'numeric', min: '0', placeholder: 'Reps' });
  repsInput.value = prefill.reps;

  const logBtn = h('button', {
    class: 'set-log-btn' + (prefill.logged ? ' logged' : ''),
    type: 'button',
    title: 'Log set',
    html: ICONS.check,
  });
  logBtn.addEventListener('click', () => logSetHandler(ex.name, setNumber, repsInput.value, weightInput.value, logBtn));

  row.appendChild(weightInput);
  row.appendChild(repsInput);
  row.appendChild(logBtn);
  return row;
}

function createAltToggleRow(ex) {
  const wrap = h('div', {});
  const cur = state.altByExercise[ex.name] || { active: false, note: '' };

  const checkbox = h('input', { type: 'checkbox' });
  checkbox.checked = cur.active;
  const track = h('span', { class: 'switch-track' });
  const switchLabel = h('label', { class: 'switch' }, [checkbox, track]);

  const rowEl = h('div', { class: 'alt-toggle-row' }, [
    h('span', { html: ICONS.note }),
    h('span', { class: 'alt-toggle-label', text: 'Used an alternative?' }),
    switchLabel,
  ]);

  const noteInput = h('input', { type: 'text', placeholder: 'e.g. used barbell instead of dumbbell', maxlength: '140' });
  noteInput.value = cur.note || '';
  const noteField = h('div', { class: 'alt-note-field' + (cur.active ? '' : ' hidden') }, [noteInput]);

  checkbox.addEventListener('change', () => {
    noteField.classList.toggle('hidden', !checkbox.checked);
    state.altByExercise[ex.name] = { active: checkbox.checked, note: noteInput.value };
  });
  noteInput.addEventListener('input', () => {
    const entry = state.altByExercise[ex.name] || { active: checkbox.checked, note: '' };
    entry.note = noteInput.value;
    state.altByExercise[ex.name] = entry;
  });

  wrap.appendChild(rowEl);
  wrap.appendChild(noteField);
  return wrap;
}

function createExerciseCard(ex) {
  const dateStr = todayISO();
  const todaySession = cache.sessions.find((s) => s.date === dateStr);
  const loggedToday = todaySession ? cache.sets.filter((s) => s.session_id === todaySession.id && s.exercise_name === ex.name) : [];
  const maxLoggedSetNum = loggedToday.reduce((m, s) => Math.max(m, s.set_number), 0);
  const setCount = Math.max(ex.sets, maxLoggedSetNum);
  const expanded = !ex.optional || loggedToday.length > 0;
  state.exerciseUI[ex.name] = { setCount, expanded };

  const card = h('div', {
    class: 'exercise-card' + (ex.optional ? ' optional' : '') + (expanded ? ' expanded' : ''),
    dataset: { exercise: ex.name },
  });

  const badges = [
    ex.optional ? h('span', { class: 'badge badge-optional', text: 'Optional' }) : null,
    h('span', { class: 'badge mono', text: `${ex.repRange} reps` }),
    h('span', { class: 'badge mono', text: `${ex.rest}s rest` }),
  ];

  const header = h('div', { class: 'exercise-header' }, [
    h('div', { class: 'exercise-name-row' }, [h('span', { class: 'exercise-name', text: ex.name }), ...badges]),
    h('span', { class: 'chevron', html: ICONS.chevron }),
  ]);
  header.addEventListener('click', () => {
    card.classList.toggle('expanded');
    state.exerciseUI[ex.name].expanded = card.classList.contains('expanded');
  });

  const setsContainer = h('div', { class: 'sets-container' });
  for (let i = 1; i <= setCount; i++) setsContainer.appendChild(createSetRow(ex, i));

  const addSetBtn = h('button', { class: 'add-set-btn', type: 'button', text: '+ Add Set' });
  addSetBtn.addEventListener('click', () => {
    state.exerciseUI[ex.name].setCount++;
    setsContainer.appendChild(createSetRow(ex, state.exerciseUI[ex.name].setCount));
  });

  const body = h('div', { class: 'exercise-body' }, [setsContainer, addSetBtn, createAltToggleRow(ex)]);

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function renderTodayView(root) {
  root.innerHTML = '';
  root.appendChild(createDayHeader());
  root.appendChild(createStatRow());
  root.appendChild(createDayPicker());
  const day = PROGRAM[state.selectedDay];
  for (const ex of day.exercises) root.appendChild(createExerciseCard(ex));
}

// ============================================================================
// History view (calendar)
// ============================================================================
function renderHistoryView(root) {
  root.innerHTML = '';
  if (!state.calendar) {
    const now = new Date();
    state.calendar = { year: now.getFullYear(), month: now.getMonth() };
  }
  root.appendChild(h('h2', { class: 'section-title', text: 'History' }));

  const prevBtn = h('button', { class: 'icon-btn', html: ICONS.chevronLeft });
  prevBtn.addEventListener('click', () => shiftMonth(-1));
  const nextBtn = h('button', { class: 'icon-btn', html: ICONS.chevronRight });
  nextBtn.addEventListener('click', () => shiftMonth(1));
  root.appendChild(h('div', { class: 'cal-header' }, [prevBtn, h('span', { class: 'cal-month-label', text: monthLabel(state.calendar) }), nextBtn]));

  const grid = h('div', { class: 'cal-grid' });
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d) => grid.appendChild(h('div', { class: 'cal-dow', text: d })));

  const { year, month } = state.calendar;
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayISO();

  for (let i = 0; i < startWeekday; i++) grid.appendChild(h('div', { class: 'cal-cell' }));
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    const session = cache.sessions.find((s) => s.date === dateStr);
    const cell = h(
      'div',
      { class: 'cal-cell in-month' + (session ? ' has-session' : '') + (dateStr === todayStr ? ' today' : '') },
      [h('span', { text: String(d) }), session ? h('span', { class: 'cal-dot' }) : null]
    );
    if (session) cell.addEventListener('click', () => renderDayDetail(dateStr, session));
    grid.appendChild(cell);
  }
  root.appendChild(grid);
  root.appendChild(h('div', { id: 'day-detail-container' }));
}

function shiftMonth(delta) {
  let { year, month } = state.calendar;
  month += delta;
  if (month < 0) { month = 11; year--; }
  if (month > 11) { month = 0; year++; }
  state.calendar = { year, month };
  renderHistoryView(document.getElementById('view-root'));
}

function renderDayDetail(dateStr, session) {
  const container = document.getElementById('day-detail-container');
  if (!container) return;
  const sets = cache.sets.filter((s) => s.session_id === session.id);
  const dayDef = PROGRAM[session.day_number];
  const byExercise = {};
  for (const s of sets) (byExercise[s.exercise_name] ||= []).push(s);

  const detail = h('div', { class: 'day-detail' });
  detail.appendChild(h('div', { class: 'day-detail-title', text: dayDef ? dayDef.label : `Day ${session.day_number}` }));
  detail.appendChild(h('div', { class: 'day-detail-sub mono', text: formatLongDate(dateStr) }));

  for (const [exName, exSets] of Object.entries(byExercise)) {
    exSets.sort((a, b) => a.set_number - b.set_number);
    const exBlock = h('div', { class: 'day-detail-exercise' });
    exBlock.appendChild(h('div', { class: 'day-detail-exercise-name', text: exName }));
    const listHtml = exSets
      .map((s) => `<span class="num">${s.reps ?? '-'}</span> reps @ <span class="num">${s.weight ?? '-'}</span>kg`)
      .join(' &middot; ');
    exBlock.appendChild(h('div', { class: 'day-detail-set-list', html: listHtml }));
    const withNote = exSets.find((s) => s.is_alternative && s.alternative_note);
    if (withNote) {
      exBlock.appendChild(h('div', { class: 'alt-note' }, [h('span', { html: ICONS.note }), h('span', { text: withNote.alternative_note })]));
    }
    detail.appendChild(exBlock);
  }
  container.innerHTML = '';
  container.appendChild(detail);
}

// ============================================================================
// Progress view
// ============================================================================
function getAllExerciseNamesDeduped() {
  const set = new Set();
  for (const dayNum of [1, 2, 3]) for (const ex of PROGRAM[dayNum].exercises) set.add(ex.name);
  return [...set].sort();
}

function drawProgressChart(chartCard, exerciseName) {
  if (progressChart) { progressChart.destroy(); progressChart = null; }
  const sessionById = Object.fromEntries(cache.sessions.map((s) => [s.id, s]));
  const bySessionDate = {};
  for (const s of cache.sets) {
    if (s.exercise_name !== exerciseName || s.weight == null) continue;
    const session = sessionById[s.session_id];
    if (!session) continue;
    if (!bySessionDate[session.date] || s.weight > bySessionDate[session.date]) bySessionDate[session.date] = s.weight;
  }
  const dates = Object.keys(bySessionDate).sort();

  if (!dates.length) {
    chartCard.innerHTML = '<div class="empty-state">No data logged yet for this exercise.</div>';
    return;
  }
  chartCard.innerHTML = '<canvas id="progress-chart"></canvas>';
  const canvas = chartCard.querySelector('canvas');
  progressChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dates.map(formatShortDate),
      datasets: [
        {
          label: exerciseName,
          data: dates.map((d) => bySessionDate[d]),
          borderColor: '#38BDF8',
          backgroundColor: 'rgba(37,99,235,0.15)',
          pointBackgroundColor: '#2563EB',
          tension: 0.25,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono' } }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#8A8A8A', font: { family: 'JetBrains Mono' } }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

function renderProgressView(root) {
  root.innerHTML = '';
  root.appendChild(h('h2', { class: 'section-title', text: 'Progress' }));

  const exerciseNames = getAllExerciseNamesDeduped();
  const select = h('select', { class: 'progress-select' });
  for (const name of exerciseNames) select.appendChild(h('option', { value: name, text: name }));
  root.appendChild(select);

  const chartCard = h('div', { class: 'chart-card' });
  root.appendChild(chartCard);

  select.addEventListener('change', () => drawProgressChart(chartCard, select.value));
  if (exerciseNames.length) drawProgressChart(chartCard, select.value);
  else chartCard.innerHTML = '<div class="empty-state">No exercises found.</div>';
}

// ============================================================================
// View dispatch + nav
// ============================================================================
function renderCurrentView() {
  const root = document.getElementById('view-root');
  if (state.view === 'today') renderTodayView(root);
  else if (state.view === 'history') renderHistoryView(root);
  else if (state.view === 'progress') renderProgressView(root);
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.view = btn.dataset.view;
    renderCurrentView();
  });
});

// ============================================================================
// Auth + boot
// ============================================================================
function wireLoginForm() {
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    errEl.textContent = '';
    submitBtn.disabled = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) errEl.textContent = error.message;
    submitBtn.disabled = false;
  });
}

function wireLogout() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
  });
}

async function boot() {
  showScreen('login');
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      showScreen('app');
      if (!dataLoaded) {
        dataLoaded = true;
        await loadAllData();
        initTodayState();
        renderCurrentView();
      }
    } else {
      dataLoaded = false;
      showScreen('login');
    }
  });
}

if (!isConfigured) {
  showScreen('setup');
} else {
  wireLoginForm();
  wireLogout();
  boot();
}
