/**
 * calendar.js - Full Monthly Calendar Grid & Day Details Modal (v3)
 * No dependency on daily log — only habit logs and goal data.
 */

class CalendarManager {
  constructor() { this.selectedModalDate = null; }

  init() {
    document.querySelectorAll('[data-close-modal="dayDetailModal"]').forEach(btn =>
      btn.addEventListener('click', () => this.closeDayModal())
    );
  }

  render() {
    const ym = window.app.activeYearMonth;
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const prevMonthDays = new Date(y, m - 1, 0).getDate();

    const titleEl = document.getElementById('calendarMonthTitle');
    if (titleEl) titleEl.textContent = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const settings = window.storage.getSettings();
    const weekStart = settings.weekStartsOn ?? 1;
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0=Sun
    const lead = (firstDay - weekStart + 7) % 7;

    const today = new Date();
    const isCurrent = today.getFullYear() === y && (today.getMonth() + 1) === m;
    const todayNum = today.getDate();

    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);

    let html = '';

    // Leading blanks
    for (let i = lead - 1; i >= 0; i--) {
      html += `<div class="calendar-cell is-adjacent-month"><div class="cal-cell-header"><span class="cal-day-num">${prevMonthDays - i}</span></div></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
      const isToday = isCurrent && d === todayNum;
      let habitsCount = 0;
      habits.forEach(h => { if (habitLogs[h.id] && habitLogs[h.id][d]) habitsCount++; });
      const pct = habits.length > 0 ? Math.round((habitsCount / habits.length) * 100) : 0;
      const hasActivity = habitsCount > 0;

      html += `
        <div class="calendar-cell ${isToday ? 'is-today' : ''} ${hasActivity ? 'has-activity' : ''}" onclick="window.calendarManager.openDayModal('${dateStr}')">
          <div class="cal-cell-header">
            <span class="cal-day-num ${isToday ? 'today-badge' : ''}">${d}</span>
          </div>
          <div class="cal-cell-body">
            ${habitsCount > 0 ? `<div class="cal-habit-pill ${pct >= 80 ? 'pill-high' : pct >= 50 ? 'pill-med' : 'pill-low'}"><i data-lucide="check"></i><span>${habitsCount}/${habits.length}</span></div>` : '<div class="cal-habit-empty"></div>'}
          </div>
        </div>`;
    }

    // Trailing
    const total = lead + daysInMonth;
    const trail = (7 - (total % 7)) % 7;
    for (let i = 1; i <= trail; i++) {
      html += `<div class="calendar-cell is-adjacent-month"><div class="cal-cell-header"><span class="cal-day-num">${i}</span></div></div>`;
    }

    const grid = document.getElementById('calendarMonthGrid');
    if (grid) { grid.innerHTML = html; if (window.lucide) window.lucide.createIcons(); }
  }

  openDayModal(dateStr) {
    this.selectedModalDate = dateStr;
    const parts = dateStr.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const ym = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
    const day = parts[2];

    const titleEl = document.getElementById('dayModalTitle');
    if (titleEl) titleEl.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);
    let habitsCount = 0;
    habits.forEach(h => { if (habitLogs[h.id] && habitLogs[h.id][day]) habitsCount++; });

    // Update stats strip
    document.getElementById('modalHabitsCountVal').textContent = `${habitsCount} / ${habits.length}`;

    // Habit checklist
    const listEl = document.getElementById('modalHabitsCheckList');
    if (listEl) {
      listEl.innerHTML = habits.map(h => {
        const checked = !!(habitLogs[h.id] && habitLogs[h.id][day]);
        return `<div class="modal-habit-item ${checked ? 'is-checked' : ''}" onclick="window.calendarManager.toggleModalHabit('${h.id}', ${day})">
          <div class="modal-habit-check">${checked ? '<i data-lucide="check"></i>' : ''}</div>
          <div class="modal-habit-details">
            <span class="modal-habit-name">${escapeHTML(h.name)}</span>
            <span class="category-pill cat-${h.category.toLowerCase()}">${h.category}</span>
          </div>
        </div>`;
      }).join('');
    }

    const modal = document.getElementById('dayDetailModal');
    if (modal) { modal.classList.add('active'); document.body.classList.add('modal-open'); }
    if (window.lucide) window.lucide.createIcons();
  }

  toggleModalHabit(habitId, day) {
    if (!this.selectedModalDate) return;
    const parts = this.selectedModalDate.split('-').map(Number);
    const ym = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
    window.storage.toggleHabitDay(ym, habitId, day);
    this.openDayModal(this.selectedModalDate);
    this.render();
    if (window.app) window.app.refreshAllSections(false);
  }

  closeDayModal() {
    document.getElementById('dayDetailModal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
    this.selectedModalDate = null;
  }
}

window.calendarManager = new CalendarManager();
