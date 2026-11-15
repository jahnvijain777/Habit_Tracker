/**
 * habits.js - Habit Tracker Matrix, Streaks, and Habit CRUD
 */

class HabitsManager {
  constructor() {
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.editingHabitId = null;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Category filter tabs
    document.querySelectorAll('.habit-category-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.habit-category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.selectedCategory = chip.dataset.category;
        this.render();
      });
    });

    // Search input
    const searchInput = document.getElementById('habitSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Add habit modal triggers
    const openAddBtn = document.getElementById('openAddHabitBtn');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', () => this.openAddModal());
    }

    const quickAddHabitBtn = document.getElementById('quickOptAddHabit');
    if (quickAddHabitBtn) {
      quickAddHabitBtn.addEventListener('click', () => {
        if (window.app) window.app.closeAllModals();
        this.openAddModal();
      });
    }

    // Add / Edit Habit Form submit
    const habitForm = document.getElementById('habitModalForm');
    if (habitForm) {
      habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Modal cancel/close buttons
    document.querySelectorAll('[data-close-modal="habitModal"]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
  }

  render() {
    const tableContainer = document.getElementById('habitTableContainer');
    if (!tableContainer) return;

    const currentYM = window.app.activeYearMonth;
    const [yearStr, monthStr] = currentYM.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
    const todayDate = today.getDate();

    const allHabits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(currentYM);

    // Filter habits
    const filteredHabits = allHabits.filter(habit => {
      const matchesCategory = (this.selectedCategory === 'all' || habit.category.toLowerCase() === this.selectedCategory.toLowerCase());
      const matchesSearch = (!this.searchQuery || habit.name.toLowerCase().includes(this.searchQuery));
      return matchesCategory && matchesSearch;
    });

    // Empty state
    if (filteredHabits.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-icon-wrap">
            <i data-lucide="sparkles"></i>
          </div>
          <h3>No habits found</h3>
          <p>${this.searchQuery ? 'Try matching a different keyword or category.' : 'Start building your consistency by adding your first habit!'}</p>
          <button class="btn btn-primary" onclick="window.habitsManager.openAddModal()">
            <i data-lucide="plus"></i> Add New Habit
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Build the habit matrix table HTML
    let html = `
      <div class="habit-matrix-wrapper">
        <table class="habit-matrix-table" id="habitMatrixTable">
          <thead>
            <tr>
              <th class="col-sticky col-habit-info">
                <div class="th-habit-title">
                  <span>Habit & Streaks</span>
                  <span class="habit-count-badge">${filteredHabits.length}</span>
                </div>
              </th>
              <th class="col-progress-header">Progress</th>
    `;

    // Render Day Number & Day Name headers
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month - 1, d);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'narrow' });
      const isToday = (isCurrentMonth && d === todayDate);
      const isPast = isCurrentMonth ? d <= todayDate : true;

      html += `
        <th class="col-day ${isToday ? 'is-today' : ''} ${!isPast ? 'is-future' : ''}" title="${dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}">
          <div class="day-head-inner">
            <span class="day-name">${dayName}</span>
            <span class="day-num">${d}</span>
          </div>
        </th>
      `;
    }

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    // Daily totals collector
    const dailyCompletedTotals = new Array(daysInMonth + 1).fill(0);

    // Habit Rows
    filteredHabits.forEach(habit => {
      const logs = habitLogs[habit.id] || {};
      const { currentStreak, bestStreak, completedCount, completionRate } = this.calculateHabitStats(habit, logs, daysInMonth, isCurrentMonth, todayDate);

      const categoryClass = `cat-${habit.category.toLowerCase()}`;

      html += `
        <tr class="habit-row" data-habit-id="${habit.id}">
          <td class="col-sticky col-habit-info">
            <div class="habit-info-cell">
              <div class="habit-meta-main">
                <span class="habit-name" title="${habit.name}">${escapeHTML(habit.name)}</span>
                <div class="habit-tags-row">
                  <span class="category-pill ${categoryClass}">${habit.category}</span>
                  <span class="streak-pill" title="Current streak / Best streak this month">
                    <i data-lucide="flame"></i> ${currentStreak}d
                    <span class="streak-best">★ ${bestStreak}d</span>
                  </span>
                </div>
              </div>
              <div class="habit-actions-menu">
                <button class="btn-icon-tiny" title="Edit Habit" onclick="window.habitsManager.openEditModal('${habit.id}')">
                  <i data-lucide="edit-2"></i>
                </button>
                <button class="btn-icon-tiny btn-danger-hover" title="Delete Habit" onclick="window.habitsManager.confirmDeleteHabit('${habit.id}', '${escapeHTML(habit.name)}')">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>
          </td>
          <td class="col-progress-val">
            <div class="habit-rate-cell">
              <span class="rate-num">${completionRate}%</span>
              <div class="mini-progress-bar">
                <div class="mini-progress-fill ${categoryClass}" style="width: ${completionRate}%;"></div>
              </div>
              <span class="count-sub">${completedCount}/${habit.targetDays || daysInMonth}</span>
            </div>
          </td>
      `;

      // Day checkboxes
      for (let d = 1; d <= daysInMonth; d++) {
        const isCompleted = !!logs[d];
        const isToday = (isCurrentMonth && d === todayDate);
        const isFuture = isCurrentMonth && (d > todayDate);

        if (isCompleted) {
          dailyCompletedTotals[d]++;
        }

        html += `
          <td class="col-day-cell ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">
            <button 
              type="button"
              class="habit-check-btn ${isCompleted ? 'checked' : ''} ${isFuture ? 'future' : ''}" 
              data-habit-id="${habit.id}" 
              data-day="${d}"
              title="Day ${d}: ${isCompleted ? 'Completed (Click to unmark)' : 'Incomplete (Click to complete)'}"
              onclick="window.habitsManager.handleCellToggle('${habit.id}', ${d})"
            >
              ${isCompleted ? '<i data-lucide="check"></i>' : (isFuture ? '<span class="future-dot"></span>' : '<span class="empty-dot"></span>')}
            </button>
          </td>
        `;
      }

      html += `</tr>`;
    });

    // Daily Completion Summary Row at the bottom
    html += `
          </tbody>
          <tfoot>
            <tr class="daily-summary-row">
              <td class="col-sticky col-habit-info summary-title-cell">
                <div class="summary-label">
                  <i data-lucide="bar-chart-2"></i>
                  <span>Daily Habits Done</span>
                </div>
              </td>
              <td class="col-progress-val">
                <span class="summary-overall-rate">${this.calculateOverallMonthRate(dailyCompletedTotals, filteredHabits.length, daysInMonth, isCurrentMonth, todayDate)}%</span>
              </td>
    `;

    for (let d = 1; d <= daysInMonth; d++) {
      const count = dailyCompletedTotals[d];
      const total = filteredHabits.length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const isToday = (isCurrentMonth && d === todayDate);
      const isFuture = isCurrentMonth && (d > todayDate);

      html += `
        <td class="col-day-cell summary-day-cell ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">
          <div class="daily-sum-pill ${pct >= 80 ? 'high' : pct >= 50 ? 'med' : pct > 0 ? 'low' : ''}" title="Day ${d}: ${count}/${total} habits (${pct}%)">
            <span>${count}</span>
            <div class="mini-bar-indicator" style="height: ${Math.max(4, Math.round(pct * 0.18))}px;"></div>
          </div>
        </td>
      `;
    }

    html += `
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    tableContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  handleCellToggle(habitId, day) {
    const currentYM = window.app.activeYearMonth;
    const newState = window.storage.toggleHabitDay(currentYM, habitId, day);
    
    // Smooth update: re-render matrix and notify dashboard / analytics
    this.render();
    if (window.app) {
      window.app.refreshAllSections(false); // subtle refresh
    }
  }

  calculateHabitStats(habit, logs, daysInMonth, isCurrentMonth, todayDate) {
    let completedCount = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Best streak and completed count
    for (let d = 1; d <= daysInMonth; d++) {
      if (logs[d]) {
        completedCount++;
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Current streak (counting backwards from today or last recorded day)
    const endDay = isCurrentMonth ? todayDate : daysInMonth;
    for (let d = endDay; d >= 1; d--) {
      if (logs[d]) {
        currentStreak++;
      } else {
        // If today is not marked yet, check if yesterday was marked to keep streak alive
        if (d === endDay && isCurrentMonth) {
          continue;
        }
        break;
      }
    }

    const denominator = habit.targetDays ? Math.min(daysInMonth, habit.targetDays) : daysInMonth;
    const completionRate = denominator > 0 ? Math.round((completedCount / denominator) * 100) : 0;

    return {
      completedCount,
      currentStreak,
      bestStreak,
      completionRate: Math.min(100, completionRate)
    };
  }

  calculateOverallMonthRate(dailyTotals, habitCount, daysInMonth, isCurrentMonth, todayDate) {
    if (habitCount === 0) return 0;
    const evaluatedDays = isCurrentMonth ? Math.max(1, todayDate) : daysInMonth;
    let totalCompleted = 0;
    for (let d = 1; d <= evaluatedDays; d++) {
      totalCompleted += dailyTotals[d] || 0;
    }
    const possible = evaluatedDays * habitCount;
    return possible > 0 ? Math.round((totalCompleted / possible) * 100) : 0;
  }

  // --- Modals & CRUD ---
  openAddModal() {
    this.editingHabitId = null;
    const modalTitle = document.getElementById('habitModalTitle');
    const submitBtn = document.getElementById('habitModalSubmitBtn');
    const form = document.getElementById('habitModalForm');

    if (modalTitle) modalTitle.textContent = 'Add New Habit';
    if (submitBtn) submitBtn.textContent = 'Create Habit';
    if (form) form.reset();

    const targetDaysInput = document.getElementById('habitTargetDays');
    if (targetDaysInput) targetDaysInput.value = '30';

    this.showModal();
  }

  openEditModal(habitId) {
    const habits = window.storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    this.editingHabitId = habitId;
    const modalTitle = document.getElementById('habitModalTitle');
    const submitBtn = document.getElementById('habitModalSubmitBtn');

    if (modalTitle) modalTitle.textContent = 'Edit Habit';
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    document.getElementById('habitNameInput').value = habit.name;
    document.getElementById('habitCategorySelect').value = habit.category;
    document.getElementById('habitFrequencySelect').value = habit.frequency || 'daily';
    document.getElementById('habitTargetDays').value = habit.targetDays || 30;

    this.showModal();
  }

  handleFormSubmit() {
    const nameInput = document.getElementById('habitNameInput');
    const categorySelect = document.getElementById('habitCategorySelect');
    const frequencySelect = document.getElementById('habitFrequencySelect');
    const targetDaysInput = document.getElementById('habitTargetDays');

    const name = nameInput.value.trim();
    const category = categorySelect.value;
    const frequency = frequencySelect.value;
    const targetDays = parseInt(targetDaysInput.value, 10) || 30;

    if (!name) {
      window.app.showToast('Please enter a habit title', 'error');
      nameInput.focus();
      return;
    }

    if (this.editingHabitId) {
      window.storage.updateHabit({
        id: this.editingHabitId,
        name,
        category,
        frequency,
        targetDays
      });
      window.app.showToast('Habit updated successfully', 'success');
    } else {
      window.storage.addHabit({
        name,
        category,
        frequency,
        targetDays
      });
      window.app.showToast('New habit added!', 'success');
    }

    this.closeModal();
    this.render();
    if (window.app) window.app.refreshAllSections();
  }

  confirmDeleteHabit(habitId, habitName) {
    if (confirm(`Are you sure you want to delete the habit "${habitName}"? All tracking data for this habit will be removed.`)) {
      window.storage.deleteHabit(habitId);
      window.app.showToast(`Deleted "${habitName}"`, 'info');
      this.render();
      if (window.app) window.app.refreshAllSections();
    }
  }

  showModal() {
    const modal = document.getElementById('habitModal');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  }

  closeModal() {
    const modal = document.getElementById('habitModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
    this.editingHabitId = null;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Global instance
window.habitsManager = new HabitsManager();
