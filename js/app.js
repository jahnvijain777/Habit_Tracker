/**
 * app.js - Main Application Orchestrator
 * Handles navigation, month switching, settings, themes, dashboard cards, and notifications.
 */

class App {
  constructor() {
    this.activeSection = 'dashboard';
    const now = new Date();
    this.activeYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  init() {
    this.applySettingsTheme();
    this.setupNavigation();
    this.setupMonthNavigation();
    this.setupHeaderActions();
    this.setupSettingsView();
    this.setupQuickAddModal();

    // Initialize sub-managers
    window.habitsManager.init();
    window.dailyLogManager.init();
    window.calendarManager.init();
    window.weeklyManager.init();
    window.goalsManager.init();
    window.analyticsManager.init();

    // Render initial view
    this.updateMonthHeader();
    this.refreshAllSections();

    // Lucide icon generation
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  applySettingsTheme() {
    const settings = window.storage.getSettings();
    
    // Theme Mode: light or dark
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }

    // Accent theme
    const accent = settings.accentColor || 'sage';
    document.documentElement.setAttribute('data-accent', accent);
  }

  setupNavigation() {
    // Sidebar nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.dataset.section;
        this.switchSection(sectionId);

        // Close mobile drawer if open
        const sidebar = document.getElementById('appSidebar');
        const overlay = document.getElementById('mobileSidebarOverlay');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
          if (overlay) overlay.classList.remove('active');
        }
      });
    });

    // Mobile hamburger toggle
    const hamburgerBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('mobileSidebarOverlay');

    if (hamburgerBtn && sidebar) {
      hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        if (sidebar) sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    }
  }

  switchSection(sectionId) {
    this.activeSection = sectionId;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });

    // Update view panels
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `section-${sectionId}`);
    });

    // Re-render specific active views
    this.renderCurrentView();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  renderCurrentView() {
    switch (this.activeSection) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'habits':
        window.habitsManager.render();
        break;
      case 'daily-log':
        window.dailyLogManager.render();
        break;
      case 'calendar':
        window.calendarManager.render();
        break;
      case 'weekly':
        window.weeklyManager.render();
        break;
      case 'goals':
        window.goalsManager.render();
        break;
      case 'analytics':
        window.analyticsManager.renderAll();
        break;
      case 'settings':
        this.renderSettings();
        break;
    }
  }

  setupMonthNavigation() {
    // Header prev / next
    const prevBtn = document.getElementById('globalPrevMonthBtn');
    const nextBtn = document.getElementById('globalNextMonthBtn');
    const todayBtn = document.getElementById('globalTodayJumpBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.navigateMonth(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.navigateMonth(1));
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', () => this.jumpToCurrentMonth());
    }
  }

  navigateMonth(offset) {
    const [yearStr, monthStr] = this.activeYearMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + offset;

    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }

    this.setActiveMonth(`${year}-${String(month).padStart(2, '0')}`);
  }

  jumpToCurrentMonth() {
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.setActiveMonth(currentYM);
  }

  setActiveMonth(yearMonthStr, autoRender = true) {
    this.activeYearMonth = yearMonthStr;
    this.updateMonthHeader();
    if (autoRender) {
      this.refreshAllSections();
    }
  }

  updateMonthHeader() {
    const [yearStr, monthStr] = this.activeYearMonth.split('-');
    const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Update all month title elements in DOM
    document.querySelectorAll('.active-month-text').forEach(el => {
      el.textContent = monthName;
    });

    // Update greeting
    const settings = window.storage.getSettings();
    const greetingEl = document.getElementById('dashboardGreetingName');
    if (greetingEl) {
      greetingEl.textContent = settings.userName || 'Jahnvi';
    }

    const liveDateEl = document.getElementById('dashboardLiveDate');
    if (liveDateEl) {
      const now = new Date();
      liveDateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  setupHeaderActions() {
    const quickAddBtn = document.getElementById('globalQuickAddBtn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        const modal = document.getElementById('quickAddModal');
        if (modal) {
          modal.classList.add('active');
          document.body.classList.add('modal-open');
        }
      });
    }

    const settingsShortcut = document.getElementById('globalSettingsBtn');
    if (settingsShortcut) {
      settingsShortcut.addEventListener('click', () => {
        this.switchSection('settings');
      });
    }
  }

  setupQuickAddModal() {
    document.querySelectorAll('[data-close-modal="quickAddModal"]').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    const optHabit = document.getElementById('quickOptAddHabit');
    if (optHabit) {
      optHabit.addEventListener('click', () => {
        this.closeAllModals();
        window.habitsManager.openAddModal();
      });
    }

    const optLog = document.getElementById('quickOptDailyLog');
    if (optLog) {
      optLog.addEventListener('click', () => {
        this.closeAllModals();
        this.switchSection('daily-log');
      });
    }

    const optGoal = document.getElementById('quickOptAddGoal');
    if (optGoal) {
      optGoal.addEventListener('click', () => {
        this.closeAllModals();
        window.goalsManager.openAddModal();
      });
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.classList.remove('modal-open');
  }

  refreshAllSections(renderActive = true) {
    if (renderActive) {
      this.renderCurrentView();
    }
    // Also update dashboard summary metrics
    this.updateDashboardMetrics();
    this.renderDashboardTodayHabits();
  }

  // --- Dashboard Logic ---
  renderDashboard() {
    this.updateDashboardMetrics();
    this.renderDashboardTodayHabits();
    this.renderDashboardGoalsOverview();
    window.analyticsManager.renderDashboardCharts();
  }

  updateDashboardMetrics() {
    const currentYM = this.activeYearMonth;
    const [yearStr, monthStr] = currentYM.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(currentYM);
    const dailyLogs = window.storage.getAllDailyLogs();
    const goals = window.storage.getGoalsForMonth(currentYM);

    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
    const evaluatedDays = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    let totalStudyHours = 0;
    let totalCodingHours = 0;
    let totalHabitCompletions = 0;
    let bestStreak = 0;
    let bestStreakHabitName = '';

    // Calculate habits completion & streaks
    habits.forEach(h => {
      const logs = habitLogs[h.id] || {};
      let tempStreak = 0;
      let habitBestStreak = 0;

      for (let d = 1; d <= evaluatedDays; d++) {
        if (logs[d]) {
          totalHabitCompletions++;
          tempStreak++;
          if (tempStreak > habitBestStreak) habitBestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }

      if (habitBestStreak > bestStreak) {
        bestStreak = habitBestStreak;
        bestStreakHabitName = h.name;
      }
    });

    // Calculate daily logs hours
    for (let d = 1; d <= evaluatedDays; d++) {
      const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
      const log = dailyLogs[dateStr];
      if (log) {
        if (log.studyHours) totalStudyHours += log.studyHours;
        if (log.codingHours) totalCodingHours += log.codingHours;
      }
    }

    const totalPossibleHabits = habits.length * evaluatedDays;
    const habitPct = totalPossibleHabits > 0 ? Math.round((totalHabitCompletions / totalPossibleHabits) * 100) : 0;

    // Goals completed
    const completedGoals = goals.filter(g => g.status === 'completed').length;

    // Overall Monthly Performance score (composite of habits + hours consistency)
    const expectedHoursMonth = (evaluatedDays * 4); // target ~4h deep work/day
    const actualLoggedHours = totalStudyHours + totalCodingHours;
    const hourRatio = expectedHoursMonth > 0 ? Math.min(100, Math.round((actualLoggedHours / expectedHoursMonth) * 100)) : 0;
    const overallScore = Math.round((habitPct * 0.6) + (hourRatio * 0.4));

    // Update Metric Cards
    const elScore = document.getElementById('metricMonthlyScore');
    if (elScore) elScore.textContent = `${overallScore}%`;

    const elHabitPct = document.getElementById('metricHabitPct');
    if (elHabitPct) elHabitPct.textContent = `${habitPct}%`;

    const elGoals = document.getElementById('metricGoalsCompleted');
    if (elGoals) elGoals.textContent = `${completedGoals}/${goals.length}`;

    const elStudy = document.getElementById('metricStudyHours');
    if (elStudy) elStudy.textContent = `${totalStudyHours.toFixed(1)} hrs`;

    const elCoding = document.getElementById('metricCodingHours');
    if (elCoding) elCoding.textContent = `${totalCodingHours.toFixed(1)} hrs`;

    const elStreak = document.getElementById('metricBestStreak');
    if (elStreak) {
      elStreak.innerHTML = `${bestStreak}d <small class="streak-subname">${bestStreakHabitName ? escapeHTML(bestStreakHabitName) : '🔥'}</small>`;
    }
  }

  renderDashboardTodayHabits() {
    const container = document.getElementById('dashboardTodayHabitsList');
    if (!container) return;

    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = now.getDate();

    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(currentYM);

    let completedToday = 0;
    let html = '';

    habits.slice(0, 8).forEach(h => {
      const isChecked = !!(habitLogs[h.id] && habitLogs[h.id][today]);
      if (isChecked) completedToday++;

      html += `
        <div class="today-habit-card ${isChecked ? 'is-done' : ''}" onclick="window.app.toggleTodayHabit('${h.id}')">
          <div class="today-check-box">
            ${isChecked ? '<i data-lucide="check"></i>' : ''}
          </div>
          <div class="today-habit-info">
            <span class="today-habit-name">${escapeHTML(h.name)}</span>
            <span class="category-pill cat-${h.category.toLowerCase()}">${h.category}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    const todayCountEl = document.getElementById('todayHabitsDoneBadge');
    if (todayCountEl) {
      todayCountEl.textContent = `${completedToday} / ${habits.length} Done`;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  toggleTodayHabit(habitId) {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = now.getDate();

    window.storage.toggleHabitDay(ym, habitId, today);
    this.refreshAllSections(false);
    this.renderDashboardTodayHabits();
  }

  renderDashboardGoalsOverview() {
    const container = document.getElementById('dashboardGoalsOverviewList');
    if (!container) return;

    const goals = window.storage.getGoalsForMonth(this.activeYearMonth);
    const activeGoals = goals.filter(g => g.status === 'in_progress' || g.status === 'not_started').slice(0, 4);

    if (activeGoals.length === 0) {
      container.innerHTML = `
        <div class="dash-empty-goals">
          <i data-lucide="check-circle-2"></i>
          <span>All active monthly goals achieved or none set!</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let html = '';
    activeGoals.forEach(g => {
      const cur = Number(g.currentValue) || 0;
      const target = Number(g.targetValue) || 1;
      const pct = Math.min(100, Math.round((cur / target) * 100));

      html += `
        <div class="dash-goal-row">
          <div class="dash-goal-info">
            <span class="dash-goal-title">${escapeHTML(g.title)}</span>
            <span class="dash-goal-nums">${cur}/${target} ${escapeHTML(g.unit || '')}</span>
          </div>
          <div class="dash-goal-bar-wrap">
            <div class="dash-goal-bar-fill cat-${(g.category || 'personal').toLowerCase()}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  // --- Settings View Logic ---
  setupSettingsView() {
    // Theme buttons
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        window.storage.saveSettings({ theme });
        this.applySettingsTheme();
        this.showToast(`Switched to ${theme} mode`, 'info');
      });
    });

    // Accent buttons
    document.querySelectorAll('.accent-picker-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.accent-picker-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const accent = btn.dataset.accent;
        window.storage.saveSettings({ accentColor: accent });
        this.applySettingsTheme();
        this.showToast(`Accent theme updated: ${capitalize(accent)}`, 'info');
      });
    });

    // Week start radio
    document.querySelectorAll('input[name="weekStartsOn"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        window.storage.saveSettings({ weekStartsOn: val });
        this.showToast('Calendar start of week updated', 'info');
        window.calendarManager.render();
      });
    });

    // User Name Save
    const saveNameBtn = document.getElementById('saveUserNameBtn');
    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('settingUserNameInput');
        const name = nameInput.value.trim() || 'Jahnvi';
        window.storage.saveSettings({ userName: name });
        this.updateMonthHeader();
        this.showToast('Name saved successfully', 'success');
      });
    }

    // Export JSON
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const jsonStr = window.storage.exportBackupJSON();
        this.downloadFile(jsonStr, `habit_tracker_backup_${this.activeYearMonth}.json`, 'application/json');
        this.showToast('JSON backup downloaded', 'success');
      });
    }

    // Import JSON File
    const importFileInput = document.getElementById('importJsonFileInput');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          const result = window.storage.importBackupJSON(content, true);
          if (result.success) {
            this.showToast('Data restored successfully!', 'success');
            this.applySettingsTheme();
            this.refreshAllSections();
          } else {
            this.showToast(`Import error: ${result.error}`, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Export CSV
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const csv = window.storage.generateCSV(this.activeYearMonth);
        this.downloadFile(csv, `Monthly_Report_${this.activeYearMonth}.csv`, 'text/csv');
        this.showToast(`Monthly CSV exported for ${this.activeYearMonth}`, 'success');
      });
    }

    // Seed Demo Data button
    const seedBtn = document.getElementById('seedDemoDataBtn');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        if (confirm(`Seed sample data for ${this.activeYearMonth}? This will populate realistic logs, streaks, and goals.`)) {
          window.storage.seedInitialMonthData(this.activeYearMonth);
          this.refreshAllSections();
          this.showToast(`Demo data loaded for ${this.activeYearMonth}!`, 'success');
        }
      });
    }

    // Clear All Data
    const clearDataBtn = document.getElementById('clearAllDataBtn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        if (confirm('CAUTION: Are you sure you want to delete all tracker records? This cannot be undone.')) {
          window.storage.clearAllData();
          this.refreshAllSections();
          this.showToast('All application data cleared', 'info');
        }
      });
    }
  }

  renderSettings() {
    const settings = window.storage.getSettings();

    // Set user name
    const nameInput = document.getElementById('settingUserNameInput');
    if (nameInput) nameInput.value = settings.userName || '';

    // Set theme active button
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === (settings.theme || 'light'));
    });

    // Set accent active swatch
    document.querySelectorAll('.accent-picker-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.accent === (settings.accentColor || 'sage'));
    });

    // Set weekStartsOn radio
    const radio = document.querySelector(`input[name="weekStartsOn"][value="${settings.weekStartsOn ?? 1}"]`);
    if (radio) radio.checked = true;
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: 'check-circle',
      error: 'alert-circle',
      info: 'info'
    };

    toast.innerHTML = `
      <i data-lucide="${iconMap[type] || 'info'}"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Auto remove after 3.2 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Global App Instance
window.app = new App();

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
