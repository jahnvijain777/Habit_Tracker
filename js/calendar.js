/**
 * calendar.js - Full Monthly Calendar Grid & Day Details Modal
 */

class CalendarManager {
  constructor() {
    this.selectedModalDate = null;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Calendar month prev/next
    const prevBtn = document.getElementById('calPrevMonthBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (window.app) window.app.navigateMonth(-1);
      });
    }

    const nextBtn = document.getElementById('calNextMonthBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (window.app) window.app.navigateMonth(1);
      });
    }

    const todayBtn = document.getElementById('calTodayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        if (window.app) window.app.jumpToCurrentMonth();
      });
    }

    // Modal close
    document.querySelectorAll('[data-close-modal="dayDetailModal"]').forEach(btn => {
      btn.addEventListener('click', () => this.closeDayModal());
    });
  }

  render() {
    const calendarGrid = document.getElementById('calendarMonthGrid');
    if (!calendarGrid) return;

    const currentYM = window.app.activeYearMonth;
    const [yearStr, monthStr] = currentYM.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const titleEl = document.getElementById('calendarMonthTitle');
    if (titleEl) {
      const monthDate = new Date(year, month - 1, 1);
      titleEl.textContent = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    const settings = window.storage.getSettings();
    const weekStartsOn = settings.weekStartsOn ?? 1; // 1 = Monday, 0 = Sunday

    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    // Adjust for week start
    let leadingBlanks = (firstDayIndex - weekStartsOn + 7) % 7;

    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
    const todayNum = today.getDate();

    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(currentYM);
    const dailyLogs = window.storage.getAllDailyLogs();

    const moodEmojiMap = {
      great: '🤩',
      good: '😊',
      neutral: '😐',
      low: '🥱',
      tough: '😔'
    };

    let html = '';

    // Leading days from previous month
    for (let i = leadingBlanks - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      html += `
        <div class="calendar-cell is-adjacent-month">
          <div class="cal-cell-header">
            <span class="cal-day-num">${d}</span>
          </div>
        </div>
      `;
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
      const isToday = (isCurrentMonth && d === todayNum);
      const log = dailyLogs[dateStr] || null;

      // Habit completion for day
      let habitsCompleted = 0;
      habits.forEach(h => {
        if (habitLogs[h.id] && habitLogs[h.id][d]) habitsCompleted++;
      });

      const totalHours = log ? ((log.studyHours || 0) + (log.codingHours || 0) + (log.creativeHours || 0) + ((log.readingMinutes || 0) / 60)).toFixed(1) : 0;
      const habitPct = habits.length > 0 ? Math.round((habitsCompleted / habits.length) * 100) : 0;
      const hasActivity = (log && (log.studyHours > 0 || log.codingHours > 0 || log.notes)) || habitsCompleted > 0;

      html += `
        <div class="calendar-cell ${isToday ? 'is-today' : ''} ${hasActivity ? 'has-activity' : ''}" 
             onclick="window.calendarManager.openDayModal('${dateStr}')">
          <div class="cal-cell-header">
            <span class="cal-day-num ${isToday ? 'today-badge' : ''}">${d}</span>
            ${log && log.mood ? `<span class="cal-mood-emoji">${moodEmojiMap[log.mood] || ''}</span>` : ''}
          </div>

          <div class="cal-cell-body">
            ${habitsCompleted > 0 ? `
              <div class="cal-habit-pill ${habitPct >= 80 ? 'pill-high' : habitPct >= 50 ? 'pill-med' : 'pill-low'}" title="${habitsCompleted} of ${habits.length} habits completed (${habitPct}%)">
                <i data-lucide="check"></i>
                <span>${habitsCompleted}/${habits.length}</span>
              </div>
            ` : '<div class="cal-habit-empty"></div>'}

            ${parseFloat(totalHours) > 0 ? `
              <div class="cal-hours-pill" title="Total productive hours: ${totalHours}h">
                <i data-lucide="zap"></i>
                <span>${totalHours}h</span>
              </div>
            ` : ''}

            ${log && log.notes ? `
              <div class="cal-notes-indicator" title="Has daily notes">
                <span class="cal-note-dot"></span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Trailing days to fill 7-day row
    const totalRendered = leadingBlanks + daysInMonth;
    const trailingBlanks = (7 - (totalRendered % 7)) % 7;
    for (let i = 1; i <= trailingBlanks; i++) {
      html += `
        <div class="calendar-cell is-adjacent-month">
          <div class="cal-cell-header">
            <span class="cal-day-num">${i}</span>
          </div>
        </div>
      `;
    }

    calendarGrid.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  openDayModal(dateStr) {
    this.selectedModalDate = dateStr;
    const parts = dateStr.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const ym = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
    const day = parts[2];

    const titleEl = document.getElementById('dayModalTitle');
    if (titleEl) {
      titleEl.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    const log = window.storage.getDailyLog(dateStr) || {};
    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);

    // Populate day summary stats
    const totalHours = ((log.studyHours || 0) + (log.codingHours || 0) + (log.creativeHours || 0) + ((log.readingMinutes || 0) / 60)).toFixed(1);
    
    document.getElementById('modalStudyVal').textContent = `${log.studyHours || 0} hrs`;
    document.getElementById('modalCodingVal').textContent = `${log.codingHours || 0} hrs`;
    document.getElementById('modalExerciseVal').textContent = `${log.exerciseMinutes || 0} mins (${log.exerciseType || 'None'})`;
    document.getElementById('modalReadingVal').textContent = `${log.readingMinutes || 0} mins`;
    document.getElementById('modalCreativeVal').textContent = `${log.creativeHours || 0} hrs`;
    document.getElementById('modalTotalHoursVal').textContent = `${totalHours} hrs`;

    const moodMap = { great: '🤩 Great', good: '😊 Good', neutral: '😐 Neutral', low: '🥱 Low', tough: '😔 Tough' };
    document.getElementById('modalMoodVal').textContent = log.mood ? (moodMap[log.mood] || log.mood) : 'Not recorded';
    document.getElementById('modalEnergyVal').textContent = log.energy ? `${log.energy} / 5` : 'Not recorded';
    document.getElementById('modalNotesVal').textContent = log.notes || 'No reflections logged for this day.';

    // Populate Habits Check List with inline toggles
    const habitListContainer = document.getElementById('modalHabitsCheckList');
    if (habitListContainer) {
      let listHtml = '';
      habits.forEach(h => {
        const isChecked = !!(habitLogs[h.id] && habitLogs[h.id][day]);
        listHtml += `
          <div class="modal-habit-item ${isChecked ? 'is-checked' : ''}" onclick="window.calendarManager.toggleModalHabit('${h.id}', ${day})">
            <div class="modal-habit-check">
              ${isChecked ? '<i data-lucide="check"></i>' : ''}
            </div>
            <div class="modal-habit-details">
              <span class="modal-habit-name">${escapeHTML(h.name)}</span>
              <span class="category-pill cat-${h.category.toLowerCase()}">${h.category}</span>
            </div>
          </div>
        `;
      });
      habitListContainer.innerHTML = listHtml;
    }

    // Jump to daily log button
    const jumpBtn = document.getElementById('modalJumpToLogBtn');
    if (jumpBtn) {
      jumpBtn.onclick = () => {
        this.closeDayModal();
        window.dailyLogManager.setSelectedDate(dateStr);
        window.app.switchSection('daily-log');
      };
    }

    const modal = document.getElementById('dayDetailModal');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  toggleModalHabit(habitId, day) {
    if (!this.selectedModalDate) return;
    const parts = this.selectedModalDate.split('-').map(Number);
    const ym = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;

    window.storage.toggleHabitDay(ym, habitId, day);
    // Refresh modal contents
    this.openDayModal(this.selectedModalDate);
    // Also update calendar and habit matrix behind
    this.render();
    if (window.app) window.app.refreshAllSections(false);
  }

  closeDayModal() {
    const modal = document.getElementById('dayDetailModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
    this.selectedModalDate = null;
  }
}

// Global instance
window.calendarManager = new CalendarManager();
