/**
 * dailyLog.js - Daily Performance Log Controller
 * Manages study, coding, reading, exercise, creative work, mood, energy, and notes.
 */

class DailyLogManager {
  constructor() {
    this.selectedDate = this.getTodayDateStr();
  }

  getTodayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Form submit
    const form = document.getElementById('dailyLogForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCurrentLog();
      });
    }

    // Date change input
    const dateInput = document.getElementById('logDateInput');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
          this.setSelectedDate(e.target.value);
        }
      });
    }

    // Prev / Next day buttons
    const prevDayBtn = document.getElementById('logPrevDayBtn');
    if (prevDayBtn) {
      prevDayBtn.addEventListener('click', () => this.shiftDay(-1));
    }
    const nextDayBtn = document.getElementById('logNextDayBtn');
    if (nextDayBtn) {
      nextDayBtn.addEventListener('click', () => this.shiftDay(1));
    }
    const todayBtn = document.getElementById('logTodayJumpBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => this.setSelectedDate(this.getTodayDateStr()));
    }

    // Mood buttons selector
    document.querySelectorAll('.mood-selector-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-selector-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const hiddenMood = document.getElementById('logMoodInput');
        if (hiddenMood) hiddenMood.value = btn.dataset.mood;
      });
    });

    // Energy buttons selector
    document.querySelectorAll('.energy-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.energy-chip-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const hiddenEnergy = document.getElementById('logEnergyInput');
        if (hiddenEnergy) hiddenEnergy.value = btn.dataset.energy;
      });
    });

    // Quick add hour presets
    document.querySelectorAll('.quick-hour-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const addAmount = parseFloat(btn.dataset.add) || 0;
        const input = document.getElementById(targetId);
        if (input) {
          const cur = parseFloat(input.value) || 0;
          input.value = (cur + addAmount).toFixed(1);
          this.updateCalculatedTotalsPreview();
        }
      });
    });

    // Live total preview on input change
    ['logStudyHours', 'logCodingHours', 'logReadingMins', 'logCreativeHours'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.updateCalculatedTotalsPreview());
      }
    });
  }

  setSelectedDate(dateStr) {
    this.selectedDate = dateStr;
    const dateInput = document.getElementById('logDateInput');
    if (dateInput) {
      dateInput.value = dateStr;
    }

    // Update active month in app if date crosses month
    const ym = dateStr.substring(0, 7);
    if (window.app && window.app.activeYearMonth !== ym) {
      window.app.setActiveMonth(ym, false);
    }

    this.render();
  }

  shiftDay(offset) {
    const parts = this.selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + offset);
    const newDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.setSelectedDate(newDateStr);
  }

  render() {
    const dateInput = document.getElementById('logDateInput');
    if (dateInput) dateInput.value = this.selectedDate;

    // Display formatted date
    const dateDisplay = document.getElementById('logDateDisplay');
    if (dateDisplay) {
      const parts = this.selectedDate.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateDisplay.textContent = dateObj.toLocaleDateString('en-US', options);
    }

    const log = window.storage.getDailyLog(this.selectedDate) || {};

    // Populate inputs
    const studyInput = document.getElementById('logStudyHours');
    const codingInput = document.getElementById('logCodingHours');
    const readingInput = document.getElementById('logReadingMins');
    const exerciseInput = document.getElementById('logExerciseMins');
    const exerciseType = document.getElementById('logExerciseType');
    const creativeInput = document.getElementById('logCreativeHours');
    const notesInput = document.getElementById('logNotesInput');
    const moodInput = document.getElementById('logMoodInput');
    const energyInput = document.getElementById('logEnergyInput');

    if (studyInput) studyInput.value = log.studyHours ?? 0;
    if (codingInput) codingInput.value = log.codingHours ?? 0;
    if (readingInput) readingInput.value = log.readingMinutes ?? 0;
    if (exerciseInput) exerciseInput.value = log.exerciseMinutes ?? 0;
    if (exerciseType) exerciseType.value = log.exerciseType || 'Running';
    if (creativeInput) creativeInput.value = log.creativeHours ?? 0;
    if (notesInput) notesInput.value = log.notes || '';

    // Mood selection
    const savedMood = log.mood || '';
    if (moodInput) moodInput.value = savedMood;
    document.querySelectorAll('.mood-selector-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mood === savedMood);
    });

    // Energy selection
    const savedEnergy = log.energy ? String(log.energy) : '';
    if (energyInput) energyInput.value = savedEnergy;
    document.querySelectorAll('.energy-chip-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.energy === savedEnergy);
    });

    this.updateCalculatedTotalsPreview();
    this.renderMonthDaysHistory();
  }

  updateCalculatedTotalsPreview() {
    const study = parseFloat(document.getElementById('logStudyHours')?.value) || 0;
    const coding = parseFloat(document.getElementById('logCodingHours')?.value) || 0;
    const reading = parseFloat(document.getElementById('logReadingMins')?.value) || 0;
    const creative = parseFloat(document.getElementById('logCreativeHours')?.value) || 0;
    const exercise = parseFloat(document.getElementById('logExerciseMins')?.value) || 0;

    const totalProductiveHours = (study + coding + creative + (reading / 60)).toFixed(1);

    const totalHoursEl = document.getElementById('dailyTotalProductiveHours');
    if (totalHoursEl) {
      totalHoursEl.textContent = `${totalProductiveHours} hrs`;
    }

    const previewStudy = document.getElementById('previewStudyHours');
    if (previewStudy) previewStudy.textContent = `${study}h`;

    const previewCoding = document.getElementById('previewCodingHours');
    if (previewCoding) previewCoding.textContent = `${coding}h`;

    const previewExercise = document.getElementById('previewExerciseMins');
    if (previewExercise) previewExercise.textContent = `${exercise}m`;

    // Habits done for this selected date
    const parts = this.selectedDate.split('-').map(Number);
    const day = parts[2];
    const ym = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
    const habitLogs = window.storage.getHabitLogs(ym);
    const habits = window.storage.getHabits();
    let habitsDone = 0;
    habits.forEach(h => {
      if (habitLogs[h.id] && habitLogs[h.id][day]) {
        habitsDone++;
      }
    });

    const previewHabits = document.getElementById('previewHabitsDone');
    if (previewHabits) {
      previewHabits.textContent = `${habitsDone} / ${habits.length}`;
    }
  }

  saveCurrentLog() {
    const studyHours = parseFloat(document.getElementById('logStudyHours')?.value) || 0;
    const codingHours = parseFloat(document.getElementById('logCodingHours')?.value) || 0;
    const readingMinutes = parseInt(document.getElementById('logReadingMins')?.value, 10) || 0;
    const exerciseMinutes = parseInt(document.getElementById('logExerciseMins')?.value, 10) || 0;
    const exerciseType = document.getElementById('logExerciseType')?.value || 'General';
    const creativeHours = parseFloat(document.getElementById('logCreativeHours')?.value) || 0;
    const mood = document.getElementById('logMoodInput')?.value || '';
    const energy = parseInt(document.getElementById('logEnergyInput')?.value, 10) || null;
    const notes = document.getElementById('logNotesInput')?.value || '';

    const logData = {
      studyHours,
      codingHours,
      readingMinutes,
      exerciseMinutes,
      exerciseType,
      creativeHours,
      mood,
      energy,
      notes
    };

    window.storage.saveDailyLog(this.selectedDate, logData);
    window.app.showToast(`Daily log saved for ${this.selectedDate}`, 'success');

    this.render();
    if (window.app) window.app.refreshAllSections();
  }

  renderMonthDaysHistory() {
    const container = document.getElementById('dailyLogHistoryList');
    if (!container) return;

    const currentYM = window.app.activeYearMonth;
    const [yearStr, monthStr] = currentYM.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyLogs = window.storage.getAllDailyLogs();
    const habitLogs = window.storage.getHabitLogs(currentYM);
    const habits = window.storage.getHabits();

    let html = `<div class="history-cards-scroller">`;

    for (let d = daysInMonth; d >= 1; d--) {
      const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
      const log = dailyLogs[dateStr] || {};
      const dayDate = new Date(year, month - 1, d);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const isSelected = (dateStr === this.selectedDate);

      // Habits done
      let habitsCount = 0;
      habits.forEach(h => {
        if (habitLogs[h.id] && habitLogs[h.id][d]) habitsCount++;
      });

      const totalHours = ((log.studyHours || 0) + (log.codingHours || 0) + (log.creativeHours || 0) + ((log.readingMinutes || 0) / 60)).toFixed(1);
      const hasLog = (log.studyHours || log.codingHours || log.notes || habitsCount > 0);

      const moodEmojiMap = {
        great: '🤩',
        good: '😊',
        neutral: '😐',
        low: '🥱',
        tough: '😔'
      };
      const moodEmoji = log.mood ? (moodEmojiMap[log.mood] || '✨') : '';

      html += `
        <div class="history-day-card ${isSelected ? 'is-selected' : ''} ${hasLog ? 'has-data' : 'is-empty'}" onclick="window.dailyLogManager.setSelectedDate('${dateStr}')">
          <div class="history-card-header">
            <span class="history-date">${dayName}, ${monthStr}/${d}</span>
            <span class="history-mood">${moodEmoji}</span>
          </div>
          <div class="history-metrics">
            <span class="hist-metric" title="Productive Hours"><i data-lucide="clock"></i> ${totalHours}h</span>
            <span class="hist-metric" title="Habits Completed"><i data-lucide="check-circle-2"></i> ${habitsCount}/${habits.length}</span>
          </div>
          ${log.notes ? `<p class="history-note-snippet">${escapeHTML(log.notes)}</p>` : ''}
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Global instance
window.dailyLogManager = new DailyLogManager();
