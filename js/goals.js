/**
 * goals.js - Monthly Goals Management
 * Tracks title, description, category, target, progress, priority, deadline reminders, and status.
 */

class GoalsManager {
  constructor() {
    this.statusFilter = 'all';
    this.categoryFilter = 'all';
    this.editingGoalId = null;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Status filter tabs
    document.querySelectorAll('.goal-status-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.goal-status-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.statusFilter = tab.dataset.status;
        this.render();
      });
    });

    // Category filter dropdown
    const catSelect = document.getElementById('goalCategoryFilter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.categoryFilter = e.target.value;
        this.render();
      });
    }

    // Add Goal modal button
    const openAddBtn = document.getElementById('openAddGoalBtn');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', () => this.openAddModal());
    }

    const quickAddGoalBtn = document.getElementById('quickOptAddGoal');
    if (quickAddGoalBtn) {
      quickAddGoalBtn.addEventListener('click', () => {
        if (window.app) window.app.closeAllModals();
        this.openAddModal();
      });
    }

    // Form submit
    const form = document.getElementById('goalModalForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Modal close buttons
    document.querySelectorAll('[data-close-modal="goalModal"]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
  }

  render() {
    const container = document.getElementById('goalsListContainer');
    if (!container) return;

    const currentYM = window.app.activeYearMonth;
    const allGoals = window.storage.getGoalsForMonth(currentYM);

    // Apply filters
    const filteredGoals = allGoals.filter(goal => {
      const matchesStatus = (this.statusFilter === 'all' || goal.status === this.statusFilter);
      const matchesCategory = (this.categoryFilter === 'all' || goal.category.toLowerCase() === this.categoryFilter.toLowerCase());
      return matchesStatus && matchesCategory;
    });

    // Update goal counts
    const totalGoals = allGoals.length;
    const completedGoals = allGoals.filter(g => g.status === 'completed').length;
    const inProgressGoals = allGoals.filter(g => g.status === 'in_progress').length;

    const summaryCountEl = document.getElementById('goalsOverallSummaryText');
    if (summaryCountEl) {
      summaryCountEl.textContent = `${completedGoals} of ${totalGoals} goals completed (${totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%)`;
    }

    if (filteredGoals.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card col-span-full">
          <div class="empty-icon-wrap">
            <i data-lucide="target"></i>
          </div>
          <h3>No goals found</h3>
          <p>${this.statusFilter !== 'all' || this.categoryFilter !== 'all' ? 'Try adjusting your filters or category selection.' : 'Set clear milestones for this month to track your personal performance.'}</p>
          <button class="btn btn-primary" onclick="window.goalsManager.openAddModal()">
            <i data-lucide="plus"></i> Add Monthly Goal
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let html = '';

    filteredGoals.forEach(goal => {
      const cur = Number(goal.currentValue) || 0;
      const target = Number(goal.targetValue) || 1;
      const pct = Math.min(100, Math.round((cur / target) * 100));

      const { deadlineText, deadlineBadgeClass } = this.calculateDeadlineStatus(goal.deadline, goal.status);
      const categoryClass = `cat-${(goal.category || 'personal').toLowerCase()}`;
      const priorityClass = `priority-${(goal.priority || 'medium').toLowerCase()}`;
      const statusClass = `status-${(goal.status || 'not_started').replace('_', '-')}`;

      const statusLabels = {
        not_started: 'Not Started',
        in_progress: 'In Progress',
        completed: 'Completed',
        paused: 'Paused'
      };

      html += `
        <div class="card goal-card ${goal.status === 'completed' ? 'goal-completed-card' : ''}">
          <div class="goal-card-top">
            <div class="goal-badges-row">
              <span class="category-pill ${categoryClass}">${goal.category}</span>
              <span class="priority-pill ${priorityClass}">${capitalize(goal.priority)} Priority</span>
            </div>
            <div class="goal-status-badge ${statusClass}">
              ${statusLabels[goal.status] || goal.status}
            </div>
          </div>

          <div class="goal-title-wrap">
            <h4 class="goal-title">${escapeHTML(goal.title)}</h4>
            ${goal.description ? `<p class="goal-desc">${escapeHTML(goal.description)}</p>` : ''}
          </div>

          <!-- Progress -->
          <div class="goal-progress-section">
            <div class="goal-progress-labels">
              <span class="goal-progress-nums"><strong>${cur}</strong> / ${target} ${escapeHTML(goal.unit || '')}</span>
              <span class="goal-pct-badge">${pct}%</span>
            </div>
            <div class="goal-bar-track">
              <div class="goal-bar-fill ${categoryClass}" style="width: ${pct}%;"></div>
            </div>

            <!-- Quick Step Controls -->
            <div class="goal-quick-steppers">
              <span class="stepper-label">Quick Log:</span>
              <button class="btn-step" title="Decrease by 1" onclick="window.goalsManager.stepProgress('${goal.id}', -1)">-1</button>
              <button class="btn-step" title="Increase by 1" onclick="window.goalsManager.stepProgress('${goal.id}', 1)">+1</button>
              ${target >= 10 ? `
                <button class="btn-step btn-step-lg" title="Increase by 5" onclick="window.goalsManager.stepProgress('${goal.id}', 5)">+5</button>
              ` : ''}
            </div>
          </div>

          <!-- Card Footer -->
          <div class="goal-card-footer">
            <div class="goal-deadline-pill ${deadlineBadgeClass}" title="Deadline: ${goal.deadline || 'None'}">
              <i data-lucide="calendar"></i>
              <span>${deadlineText}</span>
            </div>

            <div class="goal-card-actions">
              <button class="btn-icon-tiny" title="Edit Goal" onclick="window.goalsManager.openEditModal('${goal.id}')">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn-icon-tiny btn-danger-hover" title="Delete Goal" onclick="window.goalsManager.confirmDelete('${goal.id}', '${escapeHTML(goal.title)}')">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  calculateDeadlineStatus(deadlineStr, status) {
    if (status === 'completed') {
      return { deadlineText: 'Goal Achieved 🎉', deadlineBadgeClass: 'dl-completed' };
    }
    if (!deadlineStr) {
      return { deadlineText: 'No deadline', deadlineBadgeClass: 'dl-neutral' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = deadlineStr.split('-').map(Number);
    const deadlineDate = new Date(y, m - 1, d);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((deadlineDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { deadlineText: `Overdue by ${Math.abs(diffDays)}d`, deadlineBadgeClass: 'dl-overdue' };
    } else if (diffDays === 0) {
      return { deadlineText: 'Due today!', deadlineBadgeClass: 'dl-urgent' };
    } else if (diffDays === 1) {
      return { deadlineText: 'Due tomorrow', deadlineBadgeClass: 'dl-urgent' };
    } else if (diffDays <= 7) {
      return { deadlineText: `${diffDays} days left`, deadlineBadgeClass: 'dl-soon' };
    } else {
      return { deadlineText: `Due ${deadlineStr}`, deadlineBadgeClass: 'dl-normal' };
    }
  }

  stepProgress(goalId, delta) {
    const updated = window.storage.updateGoalProgress(goalId, delta);
    if (updated) {
      this.render();
      if (window.app) window.app.refreshAllSections(false);
    }
  }

  openAddModal() {
    this.editingGoalId = null;
    const form = document.getElementById('goalModalForm');
    if (form) form.reset();

    const titleEl = document.getElementById('goalModalTitle');
    const submitBtn = document.getElementById('goalModalSubmitBtn');
    if (titleEl) titleEl.textContent = 'Add Monthly Goal';
    if (submitBtn) submitBtn.textContent = 'Create Goal';

    // Set default month & deadline to active month
    const ym = window.app.activeYearMonth;
    const [y, m] = ym.split('-');
    const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();

    const startInput = document.getElementById('goalStartDateInput');
    const deadlineInput = document.getElementById('goalDeadlineInput');
    if (startInput) startInput.value = `${ym}-01`;
    if (deadlineInput) deadlineInput.value = `${ym}-${daysInMonth}`;

    this.showModal();
  }

  openEditModal(goalId) {
    const goals = window.storage.getAllGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    this.editingGoalId = goalId;
    const titleEl = document.getElementById('goalModalTitle');
    const submitBtn = document.getElementById('goalModalSubmitBtn');
    if (titleEl) titleEl.textContent = 'Edit Goal';
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    document.getElementById('goalTitleInput').value = goal.title;
    document.getElementById('goalDescInput').value = goal.description || '';
    document.getElementById('goalCategoryInput').value = goal.category;
    document.getElementById('goalTargetInput').value = goal.targetValue;
    document.getElementById('goalCurrentInput').value = goal.currentValue;
    document.getElementById('goalUnitInput').value = goal.unit || 'tasks';
    document.getElementById('goalPriorityInput').value = goal.priority || 'medium';
    document.getElementById('goalStatusInput').value = goal.status || 'not_started';
    document.getElementById('goalStartDateInput').value = goal.startDate || '';
    document.getElementById('goalDeadlineInput').value = goal.deadline || '';

    this.showModal();
  }

  handleFormSubmit() {
    const title = document.getElementById('goalTitleInput').value.trim();
    const description = document.getElementById('goalDescInput').value.trim();
    const category = document.getElementById('goalCategoryInput').value;
    const targetValue = parseFloat(document.getElementById('goalTargetInput').value) || 10;
    const currentValue = parseFloat(document.getElementById('goalCurrentInput').value) || 0;
    const unit = document.getElementById('goalUnitInput').value.trim() || 'tasks';
    const priority = document.getElementById('goalPriorityInput').value;
    const status = document.getElementById('goalStatusInput').value;
    const startDate = document.getElementById('goalStartDateInput').value;
    const deadline = document.getElementById('goalDeadlineInput').value;

    if (!title) {
      window.app.showToast('Please enter a goal title', 'error');
      return;
    }

    const ym = window.app.activeYearMonth;

    if (this.editingGoalId) {
      window.storage.updateGoal({
        id: this.editingGoalId,
        title,
        description,
        category,
        targetValue,
        currentValue,
        unit,
        priority,
        status,
        startDate,
        deadline,
        month: ym
      });
      window.app.showToast('Goal updated successfully', 'success');
    } else {
      window.storage.addGoal({
        title,
        description,
        category,
        targetValue,
        currentValue,
        unit,
        priority,
        status,
        startDate,
        deadline,
        month: ym
      });
      window.app.showToast('New goal added!', 'success');
    }

    this.closeModal();
    this.render();
    if (window.app) window.app.refreshAllSections();
  }

  confirmDelete(goalId, title) {
    if (confirm(`Are you sure you want to delete the goal "${title}"?`)) {
      window.storage.deleteGoal(goalId);
      window.app.showToast(`Deleted goal "${title}"`, 'info');
      this.render();
      if (window.app) window.app.refreshAllSections();
    }
  }

  showModal() {
    const modal = document.getElementById('goalModal');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  }

  closeModal() {
    const modal = document.getElementById('goalModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
    this.editingGoalId = null;
  }
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Global instance
window.goalsManager = new GoalsManager();
