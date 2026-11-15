/**
 * storage.js - Enhanced LocalStorage Data Layer v3
 * - Input sanitization (XSS prevention)
 * - Storage quota monitoring
 * - Undo stack for destructive actions
 * - JSON integrity validation
 * - Auto-backup reminder tracking
 * - Debounced write rate limiting
 */

/* ---- Security: Input Sanitizer ------------------------------------------ */
function sanitize(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  // Strip script tags and event handlers
  str = str.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  str = str.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');
  str = str.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  str = str.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  str = str.replace(/<[^>]*>/g, function(tag) {
    // Allow only safe display tags
    const safe = /^<\/?(b|i|em|strong|span|p|br)\s*\/?>$/i;
    return safe.test(tag.trim()) ? tag : '';
  });
  return str.trim();
}
window.sanitize = sanitize;

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
window.escapeHTML = escapeHTML;

/* ---- Storage Keys ------------------------------------------------------- */
const STORAGE_KEYS = {
  HABITS:          'lumina_habits_v3',
  HABIT_LOGS:      'lumina_habit_logs_v3',
  GOALS:           'lumina_goals_v3',
  WEEKLY_NOTES:    'lumina_weekly_notes_v3',
  SETTINGS:        'lumina_settings_v3',
  POMODORO:        'lumina_pomodoro_v3',
  CUSTOMIZE:       'lumina_customize_v3',
  LAST_BACKUP:     'lumina_last_backup_v3'
};

/* ---- Safe JSON Parse with Fallback -------------------------------------- */
function safeParseJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== typeof fallback) return fallback;
    return parsed;
  } catch (e) {
    console.warn(`[Lumina] Corrupted key "${key}" reset to default.`, e);
    localStorage.removeItem(key);
    return fallback;
  }
}

/* ---- Write Rate Limiter (max 30 writes/sec) ----------------------------- */
let _writeCount = 0;
let _writeWindowStart = Date.now();
function rateLimitedSet(key, value) {
  const now = Date.now();
  if (now - _writeWindowStart > 1000) {
    _writeCount = 0;
    _writeWindowStart = now;
  }
  _writeCount++;
  if (_writeCount > 30) {
    console.warn('[Lumina] Write rate limit hit, queuing...');
    setTimeout(() => rateLimitedSet(key, value), 50);
    return;
  }
  localStorage.setItem(key, value);
  checkStorageQuota();
}

/* ---- Storage Quota Monitor --------------------------------------------- */
async function checkStorageQuota() {
  if (!navigator.storage || !navigator.storage.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const pct = quota > 0 ? (usage / quota) * 100 : 0;
    if (pct > 80 && window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`⚠️ Storage ${pct.toFixed(0)}% full — export a JSON backup soon!`, 'error');
    }
  } catch (e) { /* silent */ }
}

/* ---- Defaults ----------------------------------------------------------- */
const DEFAULT_HABITS = [
  { id: 'h_1',  name: 'Wake up on time',    category: 'Personal',   frequency: 'daily',    targetDays: 30 },
  { id: 'h_2',  name: 'Morning routine',     category: 'Wellbeing',  frequency: 'daily',    targetDays: 30 },
  { id: 'h_3',  name: 'Study & revision',    category: 'Academic',   frequency: 'daily',    targetDays: 25 },
  { id: 'h_4',  name: 'Coding practice',     category: 'Technology', frequency: 'daily',    targetDays: 26 },
  { id: 'h_5',  name: 'Reading books',       category: 'Academic',   frequency: 'daily',    targetDays: 28 },
  { id: 'h_6',  name: 'Exercise / movement', category: 'Health',     frequency: 'weekdays', targetDays: 20 },
  { id: 'h_7',  name: 'Creative work',       category: 'Creative',   frequency: 'daily',    targetDays: 20 },
  { id: 'h_8',  name: 'Language learning',   category: 'Academic',   frequency: 'daily',    targetDays: 22 },
  { id: 'h_9',  name: 'Journaling',          category: 'Wellbeing',  frequency: 'daily',    targetDays: 25 },
  { id: 'h_10', name: 'Planning tomorrow',   category: 'Personal',   frequency: 'daily',    targetDays: 30 },
  { id: 'h_11', name: 'Sleep routine (8h)',  category: 'Health',     frequency: 'daily',    targetDays: 30 },
  { id: 'h_12', name: 'Personal project',    category: 'Technology', frequency: 'weekdays', targetDays: 20 },
  { id: 'h_13', name: 'Rest and recharge',   category: 'Wellbeing',  frequency: 'weekends', targetDays: 8  }
];

const DEFAULT_SETTINGS = {
  userName: 'Jahnvi',
  theme: 'light',
  accentColor: 'sage',
  weekStartsOn: 1,
  pomodoroWork: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroAutoAdvance: false
};

const DEFAULT_CUSTOMIZE = {
  bg: 'cream',
  stickers: [],
  widgetVisibility: {
    todayCheckIn: true,
    habitTrend: true,
    weeklyBar: true,
    categoryChart: true,
    goalsOverview: true,
    heatmap: true
  }
};

/* ---- Undo Stack --------------------------------------------------------- */
const _undoStack = [];
const MAX_UNDO = 5;

function pushUndo(description, restoreFn) {
  _undoStack.push({ description, restoreFn, timestamp: Date.now() });
  if (_undoStack.length > MAX_UNDO) _undoStack.shift();
}

function popUndo() {
  return _undoStack.pop() || null;
}
window._undoStack = _undoStack;
window.pushUndo = pushUndo;
window.popUndo = popUndo;

/* ---- StorageService Class ----------------------------------------------- */
class StorageService {
  constructor() {
    this._initDefaults();
  }

  _initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.HABITS)) this._saveRaw(STORAGE_KEYS.HABITS, DEFAULT_HABITS);
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) this._saveRaw(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!localStorage.getItem(STORAGE_KEYS.HABIT_LOGS)) this.seedInitialMonthData();
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMIZE)) this._saveRaw(STORAGE_KEYS.CUSTOMIZE, DEFAULT_CUSTOMIZE);
    if (!localStorage.getItem(STORAGE_KEYS.POMODORO)) {
      this._saveRaw(STORAGE_KEYS.POMODORO, { todaySessions: 0, lastDate: '', totalSessions: 0 });
    }
  }

  _saveRaw(key, obj) {
    rateLimitedSet(key, JSON.stringify(obj));
  }

  /* ---- Habits ---- */
  getHabits() { return safeParseJSON(STORAGE_KEYS.HABITS, [...DEFAULT_HABITS]); }

  saveHabits(habits) { this._saveRaw(STORAGE_KEYS.HABITS, habits); }

  addHabit(habit) {
    const habits = this.getHabits();
    const newH = {
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      ...habit,
      name: sanitize(habit.name),
      category: sanitize(habit.category)
    };
    habits.push(newH);
    this.saveHabits(habits);
    return newH;
  }

  updateHabit(updated) {
    const habits = this.getHabits();
    const idx = habits.findIndex(h => h.id === updated.id);
    if (idx !== -1) {
      if (updated.name) updated.name = sanitize(updated.name);
      habits[idx] = { ...habits[idx], ...updated };
      this.saveHabits(habits);
      return habits[idx];
    }
    return null;
  }

  deleteHabit(habitId) {
    const habits = this.getHabits();
    const habit = habits.find(h => h.id === habitId);
    const allLogs = this.getAllHabitLogs();
    // Save to undo stack
    pushUndo(`Delete habit "${habit ? habit.name : habitId}"`, () => {
      const cur = this.getHabits();
      if (!cur.find(h => h.id === habitId)) {
        cur.push(habit);
        this.saveHabits(cur);
      }
      // Restore logs
      Object.keys(allLogs).forEach(ym => {
        if (allLogs[ym] && allLogs[ym][habitId]) {
          const ml = this.getHabitLogs(ym);
          ml[habitId] = allLogs[ym][habitId];
          this.saveHabitLogs(ym, ml);
        }
      });
    });

    this.saveHabits(habits.filter(h => h.id !== habitId));
    const updated = this.getAllHabitLogs();
    Object.keys(updated).forEach(ym => { if (updated[ym]) delete updated[ym][habitId]; });
    this._saveRaw(STORAGE_KEYS.HABIT_LOGS, updated);
  }

  /* ---- Habit Logs ---- */
  getAllHabitLogs() { return safeParseJSON(STORAGE_KEYS.HABIT_LOGS, {}); }
  getHabitLogs(ym) { return this.getAllHabitLogs()[ym] || {}; }

  saveHabitLogs(ym, data) {
    const all = this.getAllHabitLogs();
    all[ym] = data;
    this._saveRaw(STORAGE_KEYS.HABIT_LOGS, all);
  }

  toggleHabitDay(ym, habitId, day) {
    const ml = this.getHabitLogs(ym);
    if (!ml[habitId]) ml[habitId] = {};
    ml[habitId][day] = !ml[habitId][day];
    this.saveHabitLogs(ym, ml);
    return ml[habitId][day];
  }

  /* ---- Goals ---- */
  getAllGoals() { return safeParseJSON(STORAGE_KEYS.GOALS, []); }

  getGoalsForMonth(ym) {
    return this.getAllGoals().filter(g => !g.month || g.month === ym);
  }

  saveGoals(goals) { this._saveRaw(STORAGE_KEYS.GOALS, goals); }

  addGoal(goal) {
    const goals = this.getAllGoals();
    const newG = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      targetValue: Number(goal.targetValue) || 10,
      currentValue: Number(goal.currentValue) || 0,
      unit: sanitize(goal.unit || 'tasks'),
      status: goal.status || 'not_started',
      priority: goal.priority || 'medium',
      ...goal,
      title: sanitize(goal.title),
      description: sanitize(goal.description || '')
    };
    goals.push(newG);
    this.saveGoals(goals);
    return newG;
  }

  updateGoal(updated) {
    const goals = this.getAllGoals();
    const idx = goals.findIndex(g => g.id === updated.id);
    if (idx !== -1) {
      if (updated.title) updated.title = sanitize(updated.title);
      if (updated.description) updated.description = sanitize(updated.description);
      goals[idx] = { ...goals[idx], ...updated };
      this.saveGoals(goals);
      return goals[idx];
    }
    return null;
  }

  updateGoalProgress(goalId, delta) {
    const goals = this.getAllGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return null;
    const target = Number(goal.targetValue) || 10;
    let cur = Math.max(0, Math.min(target, Number(goal.currentValue) + delta));
    goal.currentValue = cur;
    if (cur >= target) goal.status = 'completed';
    else if (cur > 0 && goal.status === 'not_started') goal.status = 'in_progress';
    this.saveGoals(goals);
    return goal;
  }

  deleteGoal(goalId) {
    const goals = this.getAllGoals();
    const goal = goals.find(g => g.id === goalId);
    pushUndo(`Delete goal "${goal ? goal.title : goalId}"`, () => {
      const cur = this.getAllGoals();
      if (!cur.find(g => g.id === goalId)) {
        cur.push(goal);
        this.saveGoals(cur);
      }
    });
    this.saveGoals(goals.filter(g => g.id !== goalId));
  }

  /* ---- Weekly Notes ---- */
  getAllWeeklyNotes() { return safeParseJSON(STORAGE_KEYS.WEEKLY_NOTES, {}); }

  getWeeklyNote(key) {
    return this.getAllWeeklyNotes()[key] || { notes: '' };
  }

  saveWeeklyNote(key, data) {
    const all = this.getAllWeeklyNotes();
    all[key] = { ...all[key], ...data, notes: sanitize(data.notes || ''), updatedAt: new Date().toISOString() };
    this._saveRaw(STORAGE_KEYS.WEEKLY_NOTES, all);
    return all[key];
  }

  /* ---- Settings ---- */
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...safeParseJSON(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS) };
  }

  saveSettings(settings) {
    const cur = this.getSettings();
    const updated = { ...cur, ...settings };
    this._saveRaw(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  /* ---- Pomodoro Stats ---- */
  getPomodoroStats() {
    const data = safeParseJSON(STORAGE_KEYS.POMODORO, { todaySessions: 0, lastDate: '', totalSessions: 0 });
    const today = new Date().toISOString().slice(0, 10);
    if (data.lastDate !== today) {
      data.todaySessions = 0;
      data.lastDate = today;
      this._saveRaw(STORAGE_KEYS.POMODORO, data);
    }
    return data;
  }

  incrementPomodoroSession() {
    const data = this.getPomodoroStats();
    data.todaySessions = (data.todaySessions || 0) + 1;
    data.totalSessions = (data.totalSessions || 0) + 1;
    data.lastDate = new Date().toISOString().slice(0, 10);
    this._saveRaw(STORAGE_KEYS.POMODORO, data);
    return data;
  }

  /* ---- Customize ---- */
  getCustomize() {
    return { ...DEFAULT_CUSTOMIZE, ...safeParseJSON(STORAGE_KEYS.CUSTOMIZE, DEFAULT_CUSTOMIZE) };
  }

  saveCustomize(data) {
    const cur = this.getCustomize();
    const updated = { ...cur, ...data };
    this._saveRaw(STORAGE_KEYS.CUSTOMIZE, updated);
    return updated;
  }

  /* ---- Backup Reminder ---- */
  getLastBackupDate() { return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP) || null; }

  updateLastBackupDate() {
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString().slice(0, 10));
  }

  needsBackupReminder() {
    const last = this.getLastBackupDate();
    if (!last) return true;
    const diff = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 7;
  }

  /* ---- Seed Demo Data ---- */
  seedInitialMonthData(ym) {
    const now = new Date();
    ym = ym || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const currentDay = (now.getFullYear() === y && (now.getMonth() + 1) === m)
      ? now.getDate() : Math.min(15, daysInMonth);

    const habits = this.getHabits();
    const habitLogs = {};
    habits.forEach((habit, idx) => {
      habitLogs[habit.id] = {};
      const rate = 0.65 + ((idx % 4) * 0.08);
      for (let d = 1; d <= currentDay; d++) {
        habitLogs[habit.id][d] = ((d * 17 + idx * 23) % 100) / 100 < rate;
      }
    });
    this.saveHabitLogs(ym, habitLogs);

    const existingGoals = this.getAllGoals();
    if (!existingGoals.some(g => g.month === ym)) {
      const dEnd = String(daysInMonth).padStart(2, '0');
      const sampleGoals = [
        { id: 'g_d1', title: 'Complete 80 Hours of Deep Coding', description: 'Fullstack + algorithm practice.', category: 'Technology', month: ym, startDate: `${ym}-01`, deadline: `${ym}-${dEnd}`, targetValue: 80, currentValue: Math.min(80, currentDay * 3), unit: 'hours', priority: 'high', status: 'in_progress', createdAt: new Date().toISOString() },
        { id: 'g_d2', title: 'Read 2 Non-Fiction Books', description: 'Atomic Habits + Deep Work.', category: 'Academic', month: ym, startDate: `${ym}-01`, deadline: `${ym}-${dEnd}`, targetValue: 2, currentValue: 1, unit: 'books', priority: 'medium', status: 'in_progress', createdAt: new Date().toISOString() },
        { id: 'g_d3', title: 'Run 50 Kilometers Total', description: 'Consistent 4-5km sessions.', category: 'Health', month: ym, startDate: `${ym}-01`, deadline: `${ym}-${dEnd}`, targetValue: 50, currentValue: Math.min(50, currentDay * 2), unit: 'km', priority: 'medium', status: 'in_progress', createdAt: new Date().toISOString() },
        { id: 'g_d4', title: 'Publish Case Study Article', description: 'Full design + dev writeup.', category: 'Creative', month: ym, startDate: `${ym}-05`, deadline: `${ym}-20`, targetValue: 1, currentValue: 1, unit: 'article', priority: 'high', status: 'completed', createdAt: new Date().toISOString() },
        { id: 'g_d5', title: 'Study 60 Hours for Exam', description: 'Mock tests and flashcards.', category: 'Academic', month: ym, startDate: `${ym}-01`, deadline: `${ym}-${dEnd}`, targetValue: 60, currentValue: Math.min(60, currentDay * 2.5), unit: 'hours', priority: 'high', status: 'in_progress', createdAt: new Date().toISOString() }
      ];
      this.saveGoals([...existingGoals, ...sampleGoals]);
    }
  }

  /* ---- Export / Import / CSV ---- */
  exportBackupJSON() {
    this.updateLastBackupDate();
    return JSON.stringify({
      version: '3.0',
      exportedAt: new Date().toISOString(),
      habits: this.getHabits(),
      habitLogs: this.getAllHabitLogs(),
      goals: this.getAllGoals(),
      weeklyNotes: this.getAllWeeklyNotes(),
      settings: this.getSettings(),
      customize: this.getCustomize()
    }, null, 2);
  }

  importBackupJSON(jsonStr, overwrite = true) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') throw new Error('Invalid format');
      if (data.habits && Array.isArray(data.habits)) {
        this.saveHabits(overwrite ? data.habits : [...this.getHabits(), ...data.habits.filter(h => !this.getHabits().find(e => e.id === h.id))]);
      }
      if (data.habitLogs) this._saveRaw(STORAGE_KEYS.HABIT_LOGS, overwrite ? data.habitLogs : { ...this.getAllHabitLogs(), ...data.habitLogs });
      if (data.goals && Array.isArray(data.goals)) {
        this.saveGoals(overwrite ? data.goals : [...this.getAllGoals(), ...data.goals.filter(g => !this.getAllGoals().find(e => e.id === g.id))]);
      }
      if (data.settings) this.saveSettings(data.settings);
      if (data.customize) this.saveCustomize(data.customize);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  generateCSV(ym) {
    const habits = this.getHabits();
    const habitLogs = this.getHabitLogs(ym);
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const esc = s => `"${String(s || '').replace(/"/g, '""')}"`;

    let csv = `LUMINA MONTHLY HABIT REPORT - ${ym}\nExported,${new Date().toISOString()}\n\nHABIT SUMMARY\nHabit,Category,Frequency,Target Days,Completed,Rate\n`;
    habits.forEach(h => {
      const logs = habitLogs[h.id] || {};
      let done = 0;
      for (let d = 1; d <= daysInMonth; d++) if (logs[d]) done++;
      csv += `${esc(h.name)},${esc(h.category)},${esc(h.frequency)},${h.targetDays || daysInMonth},${done},${(done / daysInMonth * 100).toFixed(1)}%\n`;
    });
    return csv;
  }

  clearAllData() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this._initDefaults();
  }
}

window.storage = new StorageService();
