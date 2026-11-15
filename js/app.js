/**
 * app.js - Application Orchestrator v3
 * Handles navigation, month switching, settings, dashboard, toasts, and swipe navigation.
 */

class App {
  constructor() {
    this.activeSection = 'dashboard';
    const now = new Date();
    this.activeYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this._swipeStartX = 0;
    this._swipeStartY = 0;
    // Nav order for swipe gesture
    this._navOrder = ['dashboard', 'habits', 'pomodoro', 'calendar', 'weekly', 'goals', 'analytics', 'settings'];
  }

  init() {
    this.applySettingsTheme();
    this._setupNavigation();
    this._setupMonthNavigation();
    this._setupHeaderActions();
    this._setupSettingsView();
    this._setupQuickAddModal();
    this._setupSwipe();

    // Sub-managers
    window.habitsManager.init();
    window.calendarManager.init();
    window.weeklyManager.init();
    window.goalsManager.init();
    window.analyticsManager.init();
    window.pomodoroManager.init();
    window.customizeManager.init();

    this._updateMonthHeader();
    this.refreshAllSections();

    if (window.lucide) window.lucide.createIcons();
  }

  /* ======== Theme ====================================================== */
  applySettingsTheme() {
    const s = window.storage.getSettings();
    document.documentElement.classList.toggle('dark-theme', s.theme === 'dark');
    document.documentElement.setAttribute('data-accent', s.accentColor || 'sage');
  }

  /* ======== Navigation ================================================= */
  _setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        this.switchSection(item.dataset.section);
        // Close mobile sidebar
        const sidebar = document.getElementById('appSidebar');
        const overlay = document.getElementById('mobileSidebarOverlay');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
          if (overlay) overlay.classList.remove('active');
        }
      });
    });

    const hamBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('mobileSidebarOverlay');
    if (hamBtn && sidebar) {
      hamBtn.addEventListener('click', () => {
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
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.section === sectionId));
    document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === `section-${sectionId}`));
    const stickerCanvas = document.getElementById('stickerCanvas');
    if (stickerCanvas) stickerCanvas.style.display = (sectionId === 'dashboard') ? '' : 'none';
    this._renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  }

  _renderCurrentView() {
    switch (this.activeSection) {
      case 'dashboard':  this._renderDashboard(); break;
      case 'habits':     window.habitsManager.render(); break;
      case 'pomodoro':   window.pomodoroManager._updateUI(); break;
      case 'calendar':   window.calendarManager.render(); break;
      case 'weekly':     window.weeklyManager.render(); break;
      case 'goals':      window.goalsManager.render(); break;
      case 'analytics':  window.analyticsManager.renderAll(); break;
      case 'settings':   this._renderSettings(); break;
    }
  }

  /* ======== Swipe Navigation (mobile) ================================== */
  _setupSwipe() {
    const main = document.getElementById('appMainContent');
    if (!main) return;

    main.addEventListener('touchstart', e => {
      this._swipeStartX = e.touches[0].clientX;
      this._swipeStartY = e.touches[0].clientY;
    }, { passive: true });

    main.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - this._swipeStartX;
      const dy = e.changedTouches[0].clientY - this._swipeStartY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        const idx = this._navOrder.indexOf(this.activeSection);
        if (dx < 0 && idx < this._navOrder.length - 1) {
          this.switchSection(this._navOrder[idx + 1]);
        } else if (dx > 0 && idx > 0) {
          this.switchSection(this._navOrder[idx - 1]);
        }
      }
    }, { passive: true });
  }

  /* ======== Month Navigation =========================================== */
  _setupMonthNavigation() {
    document.getElementById('globalPrevMonthBtn')?.addEventListener('click', () => this.navigateMonth(-1));
    document.getElementById('globalNextMonthBtn')?.addEventListener('click', () => this.navigateMonth(1));
    document.getElementById('globalTodayJumpBtn')?.addEventListener('click', () => this.jumpToCurrentMonth());
    document.getElementById('calPrevMonthBtn')?.addEventListener('click', () => this.navigateMonth(-1));
    document.getElementById('calNextMonthBtn')?.addEventListener('click', () => this.navigateMonth(1));
    document.getElementById('calTodayBtn')?.addEventListener('click', () => this.jumpToCurrentMonth());
  }

  navigateMonth(offset) {
    let [y, m] = this.activeYearMonth.split('-').map(Number);
    m += offset;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    this.setActiveMonth(`${y}-${String(m).padStart(2, '0')}`);
  }

  jumpToCurrentMonth() {
    const now = new Date();
    this.setActiveMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }

  setActiveMonth(ym, render = true) {
    this.activeYearMonth = ym;
    this._updateMonthHeader();
    if (render) this.refreshAllSections();
  }

  _updateMonthHeader() {
    const [y, m] = this.activeYearMonth.split('-').map(Number);
    const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.querySelectorAll('.active-month-text').forEach(el => el.textContent = monthName);

    const s = window.storage.getSettings();
    const nameEls = document.querySelectorAll('#dashboardGreetingName, #headerUserName');
    nameEls.forEach(el => { if (el) el.textContent = s.userName || 'Jahnvi'; });

    const dateEl = document.getElementById('dashboardLiveDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  }

  /* ======== Header Actions ============================================= */
  _setupHeaderActions() {
    document.getElementById('globalQuickAddBtn')?.addEventListener('click', () => {
      document.getElementById('quickAddModal')?.classList.add('active');
      document.body.classList.add('modal-open');
    });
    // Mobile action bar button
    document.getElementById('mobileQuickAddBtn')?.addEventListener('click', () => {
      document.getElementById('quickAddModal')?.classList.add('active');
      document.body.classList.add('modal-open');
    });
  }

  /* ======== Quick-Add Modal =========================================== */
  _setupQuickAddModal() {
    document.querySelectorAll('[data-close-modal="quickAddModal"]').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
    document.getElementById('quickOptAddHabit')?.addEventListener('click', () => {
      this.closeAllModals();
      window.habitsManager.openAddModal();
    });
    document.getElementById('quickOptFocusTimer')?.addEventListener('click', () => {
      this.closeAllModals();
      this.switchSection('pomodoro');
    });
    document.getElementById('quickOptAddGoal')?.addEventListener('click', () => {
      this.closeAllModals();
      window.goalsManager.openAddModal();
    });
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    document.body.classList.remove('modal-open');
  }

  refreshAllSections(renderActive = true) {
    if (renderActive) this._renderCurrentView();
    this._updateDashboardMetrics();
    this._renderDashboardTodayHabits();
  }

  /* ======== Dashboard ================================================= */
  _renderDashboard() {
    this._updateDashboardMetrics();
    this._renderDashboardTodayHabits();
    this._renderDashboardGoals();
    window.analyticsManager.renderDashboardCharts();
    window.pomodoroManager._syncDashboardCount();
    window.customizeManager._renderStickers();
  }

  _updateDashboardMetrics() {
    const ym = this.activeYearMonth;
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === y && (today.getMonth() + 1) === m;
    const evalDays = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    let totalHabitDone = 0;
    habits.forEach(h => {
      const logs = habitLogs[h.id] || {};
      for (let d = 1; d <= evalDays; d++) if (logs[d]) totalHabitDone++;
    });

    const possible = habits.length * evalDays;
    const habitPct = possible > 0 ? Math.round((totalHabitDone / possible) * 100) : 0;

    // Study & focus hours (from past logs + pomodoro sessions)
    let totalStudy = 0;
    try {
      const dl = JSON.parse(localStorage.getItem('lumina_daily_logs_v3') || localStorage.getItem('habit_tracker_daily_logs_v2') || '{}');
      for (let d = 1; d <= evalDays; d++) {
        const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
        if (dl[dateStr]) totalStudy += (dl[dateStr].studyHours || 0);
      }
    } catch (e) {}

    // Pomodoro focus sessions contribution
    try {
      const pomoStats = window.storage.getPomodoroStats();
      const settings = window.storage.getSettings();
      const workMin = Number(settings.pomodoroWork) || 25;
      if (pomoStats && pomoStats.totalSessions > 0) {
        totalStudy += (pomoStats.totalSessions * workMin) / 60;
      }
    } catch (e) {}

    const goals = window.storage.getGoalsForMonth(ym);
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const goalPct = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : habitPct;

    let overallScore;
    if (totalStudy > 0) {
      const hourTarget = Math.max(1, evalDays * 2);
      const hourScore = Math.min(100, Math.round((totalStudy / hourTarget) * 100));
      overallScore = Math.round(habitPct * 0.5 + goalPct * 0.3 + hourScore * 0.2);
    } else {
      overallScore = goals.length > 0 ? Math.round(habitPct * 0.7 + goalPct * 0.3) : habitPct;
    }

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('metricMonthlyScore', `${overallScore}%`);
    setEl('metricHabitPct', `${habitPct}%`);
    setEl('metricStudyHours', totalStudy > 0 ? `${totalStudy.toFixed(1)} hrs` : '0.0 hrs');
  }

  _renderDashboardTodayHabits() {
    const container = document.getElementById('dashboardTodayHabitsList');
    if (!container) return;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = now.getDate();
    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);
    let done = 0;
    let html = '';
    habits.forEach(h => {
      const checked = !!(habitLogs[h.id] && habitLogs[h.id][today]);
      if (checked) done++;
      html += `<div class="today-habit-card ${checked ? 'is-done' : ''}" onclick="window.app.toggleTodayHabit('${h.id}')">
        <div class="today-check-box">${checked ? '<i data-lucide="check"></i>' : ''}</div>
        <div class="today-habit-info">
          <span class="today-habit-name">${escapeHTML(h.name)}</span>
          <span class="category-pill cat-${h.category.toLowerCase()}">${h.category}</span>
        </div>
      </div>`;
    });
    container.innerHTML = html;
    const badge = document.getElementById('todayHabitsDoneBadge');
    if (badge) badge.textContent = `${done} / ${habits.length} Done`;
    if (window.lucide) window.lucide.createIcons();
  }

  toggleTodayHabit(habitId) {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    window.storage.toggleHabitDay(ym, habitId, now.getDate());
    this.refreshAllSections(false);
    this._renderDashboardTodayHabits();
  }

  _renderDashboardGoals() {
    const container = document.getElementById('dashboardGoalsOverviewList');
    if (!container) return;
    const goals = window.storage.getGoalsForMonth(this.activeYearMonth);
    const active = goals.filter(g => g.status === 'in_progress' || g.status === 'not_started').slice(0, 4);
    if (!active.length) {
      container.innerHTML = `<div class="dash-empty-goals"><i data-lucide="check-circle-2"></i><span>All active goals achieved!</span></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    container.innerHTML = active.map(g => {
      const pct = Math.min(100, Math.round(((Number(g.currentValue) || 0) / (Number(g.targetValue) || 1)) * 100));
      return `<div class="dash-goal-row">
        <div class="dash-goal-info">
          <span class="dash-goal-title">${escapeHTML(g.title)}</span>
          <span class="dash-goal-nums">${g.currentValue}/${g.targetValue} ${escapeHTML(g.unit || '')}</span>
        </div>
        <div class="dash-goal-bar-wrap">
          <div class="dash-goal-bar-fill cat-${(g.category || 'personal').toLowerCase()}" style="width:${pct}%"></div>
        </div>
      </div>`;
    }).join('');
  }

  /* ======== Settings View ============================================= */
  _setupSettingsView() {
    // Theme buttons
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.storage.saveSettings({ theme: btn.dataset.theme });
        this.applySettingsTheme();
        this.showToast(`Switched to ${btn.dataset.theme} mode`, 'info');
      });
    });

    // Accent
    document.querySelectorAll('.accent-picker-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.accent-picker-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.storage.saveSettings({ accentColor: btn.dataset.accent });
        this.applySettingsTheme();
        this.showToast(`Accent: ${btn.dataset.accent}`, 'info');
      });
    });

    // Week start
    document.querySelectorAll('input[name="weekStartsOn"]').forEach(r => {
      r.addEventListener('change', e => {
        window.storage.saveSettings({ weekStartsOn: parseInt(e.target.value, 10) });
        window.calendarManager.render();
        this.showToast('Calendar preference saved', 'info');
      });
    });

    // Name
    document.getElementById('saveUserNameBtn')?.addEventListener('click', () => {
      const name = window.sanitize(document.getElementById('settingUserNameInput')?.value?.trim() || 'Jahnvi');
      window.storage.saveSettings({ userName: name });
      this._updateMonthHeader();
      this.showToast('Name saved', 'success');
    });

    // Pomodoro settings
    document.getElementById('savePomoSettingsBtn')?.addEventListener('click', () => {
      const work = parseInt(document.getElementById('pomoWorkInput')?.value, 10) || 25;
      const shortB = parseInt(document.getElementById('pomoShortInput')?.value, 10) || 5;
      const longB = parseInt(document.getElementById('pomoLongInput')?.value, 10) || 15;
      const autoAdv = document.getElementById('pomoAutoAdvanceToggle')?.checked || false;
      window.storage.saveSettings({ pomodoroWork: work, pomodoroShortBreak: shortB, pomodoroLongBreak: longB, pomodoroAutoAdvance: autoAdv });
      window.pomodoroManager._reset(true);
      this.showToast('Pomodoro settings saved', 'success');
    });

    // Export JSON
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
      const json = window.storage.exportBackupJSON();
      this._download(json, `lumina_backup_${this.activeYearMonth}.json`, 'application/json');
      this.showToast('JSON backup downloaded', 'success');
    });

    // Import JSON
    document.getElementById('importJsonFileInput')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const result = window.storage.importBackupJSON(ev.target.result, true);
        if (result.success) {
          this.applySettingsTheme();
          this.refreshAllSections();
          window.customizeManager._applyState();
          this.showToast('Data restored!', 'success');
        } else {
          this.showToast(`Import failed: ${result.error}`, 'error');
        }
      };
      reader.readAsText(file);
    });

    // Export CSV
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
      const csv = window.storage.generateCSV(this.activeYearMonth);
      this._download(csv, `Lumina_Report_${this.activeYearMonth}.csv`, 'text/csv');
      this.showToast('CSV report downloaded', 'success');
    });

    // Seed demo
    document.getElementById('seedDemoDataBtn')?.addEventListener('click', () => {
      if (confirm(`Seed sample data for ${this.activeYearMonth}?`)) {
        window.storage.seedInitialMonthData(this.activeYearMonth);
        this.refreshAllSections();
        this.showToast('Demo data loaded!', 'success');
      }
    });

    // Clear data
    document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
      if (confirm('Delete ALL application data? This cannot be undone.')) {
        window.storage.clearAllData();
        this.refreshAllSections();
        window.customizeManager._applyState();
        this.showToast('All data cleared', 'info');
      }
    });

    // Dismiss backup banner
    document.getElementById('backupBannerDismiss')?.addEventListener('click', () => {
      const banner = document.getElementById('backupReminderBanner');
      if (banner) banner.style.display = 'none';
      window.storage.updateLastBackupDate(); // silence for 7 days
    });
  }

  _renderSettings() {
    const s = window.storage.getSettings();
    const nameInput = document.getElementById('settingUserNameInput');
    if (nameInput) nameInput.value = s.userName || '';

    document.querySelectorAll('.theme-option-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.theme === (s.theme || 'light'))
    );
    document.querySelectorAll('.accent-picker-swatch').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.accent === (s.accentColor || 'sage'))
    );
    const weekRadio = document.querySelector(`input[name="weekStartsOn"][value="${s.weekStartsOn ?? 1}"]`);
    if (weekRadio) weekRadio.checked = true;

    // Pomodoro settings
    const workIn = document.getElementById('pomoWorkInput');
    const shortIn = document.getElementById('pomoShortInput');
    const longIn = document.getElementById('pomoLongInput');
    const autoAdv = document.getElementById('pomoAutoAdvanceToggle');
    if (workIn) workIn.value = s.pomodoroWork || 25;
    if (shortIn) shortIn.value = s.pomodoroShortBreak || 5;
    if (longIn) longIn.value = s.pomodoroLongBreak || 15;
    if (autoAdv) autoAdv.checked = !!s.pomodoroAutoAdvance;
  }

  /* ======== Toast Notifications ======================================= */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    const undoAction = type === 'info' && window._undoStack && window._undoStack.length > 0 ? window._undoStack[window._undoStack.length - 1] : null;

    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${escapeHTML(message)}</span>${
      undoAction && message.toLowerCase().includes('delete') ? `<button class="toast-undo-btn" onclick="window.app.performUndo(this.closest('.toast'))">Undo</button>` : ''
    }`;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3500);
  }

  performUndo(toastEl) {
    const action = window.popUndo();
    if (action) {
      action.restoreFn();
      this.refreshAllSections();
      this.showToast(`Undone: ${action.description}`, 'success');
    }
    if (toastEl) toastEl.remove();
  }

  _download(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t] || t));
}

window.app = new App();
document.addEventListener('DOMContentLoaded', () => window.app.init());
