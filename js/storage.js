/**
 * storage.js - LocalStorage Persistence & Data Layer
 * Handles habits, daily performance logs, monthly goals, settings, JSON backup, and CSV export.
 */

const STORAGE_KEYS = {
  HABITS: 'habit_tracker_habits_v2',
  HABIT_LOGS: 'habit_tracker_habit_logs_v2',
  DAILY_LOGS: 'habit_tracker_daily_logs_v2',
  GOALS: 'habit_tracker_goals_v2',
  WEEKLY_NOTES: 'habit_tracker_weekly_notes_v2',
  SETTINGS: 'habit_tracker_settings_v2'
};

const DEFAULT_CATEGORIES = [
  { id: 'Personal', name: 'Personal', color: 'rose', bg: '#FCF0F0', text: '#B85D5D' },
  { id: 'Academic', name: 'Academic', color: 'blue', bg: '#EEF4F9', text: '#4C7699' },
  { id: 'Technology', name: 'Technology', color: 'violet', bg: '#F3F0F8', text: '#786498' },
  { id: 'Health', name: 'Health', color: 'sage', bg: '#EDF5EF', text: '#557F5D' },
  { id: 'Creative', name: 'Creative', color: 'peach', bg: '#FDF3ED', text: '#B86A41' },
  { id: 'Wellbeing', name: 'Wellbeing', color: 'teal', bg: '#EDF8F7', text: '#448581' }
];

const DEFAULT_HABITS = [
  { id: 'h_1', name: 'Wake up on time', category: 'Personal', frequency: 'daily', targetDays: 30, icon: 'sun', createdAt: '2026-01-01' },
  { id: 'h_2', name: 'Morning routine', category: 'Wellbeing', frequency: 'daily', targetDays: 30, icon: 'coffee', createdAt: '2026-01-01' },
  { id: 'h_3', name: 'Study & revision', category: 'Academic', frequency: 'daily', targetDays: 25, icon: 'book-open', createdAt: '2026-01-01' },
  { id: 'h_4', name: 'Coding practice', category: 'Technology', frequency: 'daily', targetDays: 26, icon: 'code', createdAt: '2026-01-01' },
  { id: 'h_5', name: 'Reading books', category: 'Academic', frequency: 'daily', targetDays: 28, icon: 'book', createdAt: '2026-01-01' },
  { id: 'h_6', name: 'Exercise / movement', category: 'Health', frequency: 'weekdays', targetDays: 20, icon: 'activity', createdAt: '2026-01-01' },
  { id: 'h_7', name: 'Creative work', category: 'Creative', frequency: 'daily', targetDays: 20, icon: 'palette', createdAt: '2026-01-01' },
  { id: 'h_8', name: 'Language learning', category: 'Academic', frequency: 'daily', targetDays: 22, icon: 'globe', createdAt: '2026-01-01' },
  { id: 'h_9', name: 'Journaling', category: 'Wellbeing', frequency: 'daily', targetDays: 25, icon: 'pen-tool', createdAt: '2026-01-01' },
  { id: 'h_10', name: 'Planning tomorrow', category: 'Personal', frequency: 'daily', targetDays: 30, icon: 'check-square', createdAt: '2026-01-01' },
  { id: 'h_11', name: 'Sleep routine (8h)', category: 'Health', frequency: 'daily', targetDays: 30, icon: 'moon', createdAt: '2026-01-01' },
  { id: 'h_12', name: 'Personal project', category: 'Technology', frequency: 'weekdays', targetDays: 20, icon: 'cpu', createdAt: '2026-01-01' },
  { id: 'h_13', name: 'Rest and recharge', category: 'Wellbeing', frequency: 'weekends', targetDays: 8, icon: 'smile', createdAt: '2026-01-01' }
];

const DEFAULT_SETTINGS = {
  userName: 'Jahnvi',
  theme: 'light',
  accentColor: 'sage', // sage, dusty-blue, lavender, blush, peach
  weekStartsOn: 1 // 1 for Monday, 0 for Sunday
};

class StorageService {
  constructor() {
    this.initDefaults();
  }

  initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.HABITS)) {
      this.saveHabits(DEFAULT_HABITS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.HABIT_LOGS)) {
      this.seedInitialMonthData();
    }
  }

  // --- Habits ---
  getHabits() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HABITS);
      return data ? JSON.parse(data) : [...DEFAULT_HABITS];
    } catch (e) {
      console.error('Error reading habits', e);
      return [...DEFAULT_HABITS];
    }
  }

  saveHabits(habits) {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
  }

  addHabit(habit) {
    const habits = this.getHabits();
    const newHabit = {
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      ...habit
    };
    habits.push(newHabit);
    this.saveHabits(habits);
    return newHabit;
  }

  updateHabit(updatedHabit) {
    const habits = this.getHabits();
    const index = habits.findIndex(h => h.id === updatedHabit.id);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updatedHabit };
      this.saveHabits(habits);
      return habits[index];
    }
    return null;
  }

  deleteHabit(habitId) {
    let habits = this.getHabits();
    habits = habits.filter(h => h.id !== habitId);
    this.saveHabits(habits);

    // Clean up habit logs for all months
    const allLogs = this.getAllHabitLogs();
    Object.keys(allLogs).forEach(monthKey => {
      if (allLogs[monthKey] && allLogs[monthKey][habitId]) {
        delete allLogs[monthKey][habitId];
      }
    });
    localStorage.setItem(STORAGE_KEYS.HABIT_LOGS, JSON.stringify(allLogs));
  }

  // --- Habit Logs (keyed by YYYY-MM) ---
  getAllHabitLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HABIT_LOGS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Error reading habit logs', e);
      return {};
    }
  }

  getHabitLogs(yearMonth) {
    const all = this.getAllHabitLogs();
    return all[yearMonth] || {};
  }

  saveHabitLogs(yearMonth, monthData) {
    const all = this.getAllHabitLogs();
    all[yearMonth] = monthData;
    localStorage.setItem(STORAGE_KEYS.HABIT_LOGS, JSON.stringify(all));
  }

  toggleHabitDay(yearMonth, habitId, day) {
    const monthLogs = this.getHabitLogs(yearMonth);
    if (!monthLogs[habitId]) {
      monthLogs[habitId] = {};
    }
    const current = !!monthLogs[habitId][day];
    monthLogs[habitId][day] = !current;
    this.saveHabitLogs(yearMonth, monthLogs);
    return monthLogs[habitId][day];
  }

  setHabitDayStatus(yearMonth, habitId, day, isCompleted) {
    const monthLogs = this.getHabitLogs(yearMonth);
    if (!monthLogs[habitId]) {
      monthLogs[habitId] = {};
    }
    monthLogs[habitId][day] = isCompleted;
    this.saveHabitLogs(yearMonth, monthLogs);
  }

  // --- Daily Logs (keyed by YYYY-MM-DD) ---
  getAllDailyLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Error reading daily logs', e);
      return {};
    }
  }

  getDailyLog(dateStr) {
    const all = this.getAllDailyLogs();
    return all[dateStr] || null;
  }

  saveDailyLog(dateStr, logData) {
    const all = this.getAllDailyLogs();
    all[dateStr] = {
      ...all[dateStr],
      ...logData,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(all));
    return all[dateStr];
  }

  deleteDailyLog(dateStr) {
    const all = this.getAllDailyLogs();
    if (all[dateStr]) {
      delete all[dateStr];
      localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(all));
    }
  }

  // --- Goals ---
  getAllGoals() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading goals', e);
      return [];
    }
  }

  getGoalsForMonth(yearMonth) {
    const goals = this.getAllGoals();
    return goals.filter(g => !g.month || g.month === yearMonth);
  }

  saveGoals(goals) {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }

  addGoal(goal) {
    const goals = this.getAllGoals();
    const newGoal = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      targetValue: Number(goal.targetValue) || 10,
      currentValue: Number(goal.currentValue) || 0,
      unit: goal.unit || 'tasks',
      status: goal.status || 'not_started',
      priority: goal.priority || 'medium',
      ...goal
    };
    goals.push(newGoal);
    this.saveGoals(goals);
    return newGoal;
  }

  updateGoal(updatedGoal) {
    const goals = this.getAllGoals();
    const index = goals.findIndex(g => g.id === updatedGoal.id);
    if (index !== -1) {
      goals[index] = { ...goals[index], ...updatedGoal };
      this.saveGoals(goals);
      return goals[index];
    }
    return null;
  }

  updateGoalProgress(goalId, delta) {
    const goals = this.getAllGoals();
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const target = Number(goal.targetValue) || 10;
      let cur = Number(goal.currentValue) || 0;
      cur = Math.max(0, Math.min(target, cur + delta));
      goal.currentValue = cur;
      if (cur >= target) {
        goal.status = 'completed';
      } else if (cur > 0 && goal.status === 'not_started') {
        goal.status = 'in_progress';
      }
      this.saveGoals(goals);
      return goal;
    }
    return null;
  }

  deleteGoal(goalId) {
    let goals = this.getAllGoals();
    goals = goals.filter(g => g.id !== goalId);
    this.saveGoals(goals);
  }

  // --- Weekly Reviews / Notes ---
  getAllWeeklyNotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WEEKLY_NOTES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Error reading weekly notes', e);
      return {};
    }
  }

  getWeeklyNote(weekKey) {
    const all = this.getAllWeeklyNotes();
    return all[weekKey] || { notes: '', assignmentsDone: 0, customScore: null };
  }

  saveWeeklyNote(weekKey, data) {
    const all = this.getAllWeeklyNotes();
    all[weekKey] = { ...all[weekKey], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.WEEKLY_NOTES, JSON.stringify(all));
    return all[weekKey];
  }

  // --- Settings ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Error reading settings', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(settings) {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  // --- Seed Initial Month Data ---
  seedInitialMonthData(targetYearMonth = null) {
    const now = new Date();
    const ym = targetYearMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = ym.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = (now.getFullYear() === year && (now.getMonth() + 1) === month) ? now.getDate() : Math.min(15, daysInMonth);

    // Habits completion
    const habits = this.getHabits();
    const habitLogs = {};

    habits.forEach((habit, idx) => {
      habitLogs[habit.id] = {};
      const successRate = 0.65 + ((idx % 4) * 0.08); // realistic varied consistency
      for (let d = 1; d <= currentDay; d++) {
        // Pseudo-random deterministic completion pattern
        const seed = (d * 17 + idx * 23) % 100;
        habitLogs[habit.id][d] = (seed / 100) < successRate;
      }
    });
    this.saveHabitLogs(ym, habitLogs);

    // Daily Logs
    const dailyLogs = this.getAllDailyLogs();
    const moods = ['great', 'good', 'good', 'neutral', 'great', 'good', 'low'];
    const exerciseTypes = ['Running', 'Yoga', 'HIIT', 'Walking', 'Gym', 'Cycling', 'Pilates'];
    const sampleNotes = [
      'Built interactive dashboard components. Feeling productive!',
      'Deep study on system architecture and memory management.',
      'Finished reading Chapter 4. Great mental clarity today.',
      'Morning workout felt great. High focus during 3-hour coding sprint.',
      'Revised core data structures and practiced LeetCode mediums.',
      'Productive creative writing session and clean habit completion.',
      'Quiet reflective day. Solid focus on personal projects.',
      'Consistent morning routine set the tone for smooth day work.'
    ];

    for (let d = 1; d <= currentDay; d++) {
      const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      const study = isWeekend ? Number((1.5 + ((d * 3) % 3) * 0.5).toFixed(1)) : Number((3.0 + ((d * 5) % 4) * 0.5).toFixed(1));
      const coding = isWeekend ? Number((2.0 + ((d * 7) % 3) * 0.5).toFixed(1)) : Number((3.5 + ((d * 2) % 3) * 0.5).toFixed(1));
      const reading = 20 + ((d * 11) % 4) * 10; // 20 - 50 mins
      const exercise = 30 + ((d * 13) % 4) * 15; // 30 - 75 mins
      const creative = Number((1.0 + ((d * 4) % 3) * 0.5).toFixed(1));
      const mood = moods[(d + idxLike(habitLogs)) % moods.length];
      const energy = 3 + ((d * 7) % 3); // 3, 4, 5

      dailyLogs[dateStr] = {
        studyHours: study,
        codingHours: coding,
        readingMinutes: reading,
        exerciseMinutes: exercise,
        exerciseType: exerciseTypes[(d + 2) % exerciseTypes.length],
        creativeHours: creative,
        mood: mood,
        energy: energy,
        notes: sampleNotes[d % sampleNotes.length],
        assignmentsDone: (d % 3 === 0) ? 1 : 0,
        updatedAt: new Date().toISOString()
      };
    }
    localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(dailyLogs));

    // Goals for this month
    const existingGoals = this.getAllGoals();
    const hasGoalsThisMonth = existingGoals.some(g => g.month === ym);

    if (!hasGoalsThisMonth) {
      const sampleGoals = [
        {
          id: 'g_demo_1',
          title: 'Complete 80 Hours of Deep Coding',
          description: 'Focus on fullstack projects, algorithmic practice, and code architecture.',
          category: 'Technology',
          month: ym,
          startDate: `${ym}-01`,
          deadline: `${ym}-${daysInMonth}`,
          targetValue: 80,
          currentValue: Math.min(80, Math.round(currentDay * 3.2)),
          unit: 'hours',
          priority: 'high',
          status: 'in_progress',
          createdAt: new Date().toISOString()
        },
        {
          id: 'g_demo_2',
          title: 'Read 2 Non-Fiction Books',
          description: 'Finish "Atomic Habits" and "Deep Work" to refine personal systems.',
          category: 'Academic',
          month: ym,
          startDate: `${ym}-01`,
          deadline: `${ym}-${daysInMonth}`,
          targetValue: 2,
          currentValue: 1,
          unit: 'books',
          priority: 'medium',
          status: 'in_progress',
          createdAt: new Date().toISOString()
        },
        {
          id: 'g_demo_3',
          title: 'Run 50 Kilometers Total',
          description: 'Build cardio endurance with consistent 4-5km runs.',
          category: 'Health',
          month: ym,
          startDate: `${ym}-01`,
          deadline: `${ym}-${daysInMonth}`,
          targetValue: 50,
          currentValue: Math.min(50, Math.round(currentDay * 1.8)),
          unit: 'km',
          priority: 'medium',
          status: 'in_progress',
          createdAt: new Date().toISOString()
        },
        {
          id: 'g_demo_4',
          title: 'Publish Tracker Web App Case Study',
          description: 'Write complete design documentation and frontend system review.',
          category: 'Creative',
          month: ym,
          startDate: `${ym}-05`,
          deadline: `${ym}-20`,
          targetValue: 1,
          currentValue: 1,
          unit: 'article',
          priority: 'high',
          status: 'completed',
          createdAt: new Date().toISOString()
        },
        {
          id: 'g_demo_5',
          title: 'Study 60 Hours for Certification Exam',
          description: 'Review curriculum modules, practice mock tests, and flashcards.',
          category: 'Academic',
          month: ym,
          startDate: `${ym}-01`,
          deadline: `${ym}-${daysInMonth}`,
          targetValue: 60,
          currentValue: Math.min(60, Math.round(currentDay * 2.5)),
          unit: 'hours',
          priority: 'high',
          status: 'in_progress',
          createdAt: new Date().toISOString()
        }
      ];
      this.saveGoals([...existingGoals, ...sampleGoals]);
    }
  }

  // --- Backup & Restore ---
  exportBackupJSON() {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      habits: this.getHabits(),
      habitLogs: this.getAllHabitLogs(),
      dailyLogs: this.getAllDailyLogs(),
      goals: this.getAllGoals(),
      weeklyNotes: this.getAllWeeklyNotes(),
      settings: this.getSettings()
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackupJSON(jsonString, overwrite = true) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format');
      }

      if (data.habits && Array.isArray(data.habits)) {
        if (overwrite) {
          this.saveHabits(data.habits);
        } else {
          const currentHabits = this.getHabits();
          const existingIds = new Set(currentHabits.map(h => h.id));
          const newHabits = data.habits.filter(h => !existingIds.has(h.id));
          this.saveHabits([...currentHabits, ...newHabits]);
        }
      }

      if (data.habitLogs && typeof data.habitLogs === 'object') {
        if (overwrite) {
          localStorage.setItem(STORAGE_KEYS.HABIT_LOGS, JSON.stringify(data.habitLogs));
        } else {
          const currentLogs = this.getAllHabitLogs();
          const mergedLogs = { ...currentLogs, ...data.habitLogs };
          localStorage.setItem(STORAGE_KEYS.HABIT_LOGS, JSON.stringify(mergedLogs));
        }
      }

      if (data.dailyLogs && typeof data.dailyLogs === 'object') {
        if (overwrite) {
          localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(data.dailyLogs));
        } else {
          const currentDaily = this.getAllDailyLogs();
          const mergedDaily = { ...currentDaily, ...data.dailyLogs };
          localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(mergedDaily));
        }
      }

      if (data.goals && Array.isArray(data.goals)) {
        if (overwrite) {
          this.saveGoals(data.goals);
        } else {
          const currentGoals = this.getAllGoals();
          const existingGoalIds = new Set(currentGoals.map(g => g.id));
          const newGoals = data.goals.filter(g => !existingGoalIds.has(g.id));
          this.saveGoals([...currentGoals, ...newGoals]);
        }
      }

      if (data.settings && typeof data.settings === 'object') {
        this.saveSettings(data.settings);
      }

      return { success: true };
    } catch (err) {
      console.error('Import error:', err);
      return { success: false, error: err.message };
    }
  }

  // --- Export CSV for Month ---
  generateCSV(yearMonth) {
    const habits = this.getHabits();
    const habitLogs = this.getHabitLogs(yearMonth);
    const dailyLogs = this.getAllDailyLogs();
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    let csv = `MONTHLY PERFORMANCE & HABIT REPORT - ${yearMonth}\n`;
    csv += `Exported On,${new Date().toISOString()}\n\n`;

    // 1. Habit Summary Table
    csv += `HABIT SUMMARY\n`;
    csv += `Habit Name,Category,Frequency,Target Days,Completed Days,Completion Rate %\n`;
    habits.forEach(h => {
      const logs = habitLogs[h.id] || {};
      let completedCount = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (logs[d]) completedCount++;
      }
      const rate = daysInMonth > 0 ? ((completedCount / daysInMonth) * 100).toFixed(1) : 0;
      csv += `${escapeCsv(h.name)},${escapeCsv(h.category)},${escapeCsv(h.frequency)},${h.targetDays || daysInMonth},${completedCount},${rate}%\n`;
    });

    csv += `\n`;

    // 2. Daily Log Table
    csv += `DAILY PERFORMANCE LOGS\n`;
    csv += `Date,Day,Study Hours,Coding Hours,Reading Minutes,Exercise Minutes,Exercise Type,Creative Hours,Mood,Energy (1-5),Habits Completed,Notes\n`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, d);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const log = dailyLogs[dateStr] || {};

      // calculate habits completed on that day
      let habitsDoneToday = 0;
      habits.forEach(h => {
        if (habitLogs[h.id] && habitLogs[h.id][d]) {
          habitsDoneToday++;
        }
      });

      csv += `${dateStr},${dayName},${log.studyHours || 0},${log.codingHours || 0},${log.readingMinutes || 0},${log.exerciseMinutes || 0},${escapeCsv(log.exerciseType || '')},${log.creativeHours || 0},${escapeCsv(log.mood || '')},${log.energy || ''},${habitsDoneToday}/${habits.length},${escapeCsv(log.notes || '')}\n`;
    }

    return csv;
  }

  // --- Reset All Data ---
  clearAllData() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this.saveHabits(DEFAULT_HABITS);
    this.saveSettings(DEFAULT_SETTINGS);
  }
}

function idxLike(logs) {
  return Object.keys(logs).length;
}

// Global instance
window.storage = new StorageService();
