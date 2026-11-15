/**
 * weekly.js - Weekly Performance (habit-only, no daily log dependency) v3
 */

class WeeklyManager {
  constructor() { this.comparisonChart = null; }
  init() {}

  render() {
    const ym = window.app.activeYearMonth;
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);

    const weeks = [
      { id: 1, name: 'Week 1', startDay: 1,  endDay: 7 },
      { id: 2, name: 'Week 2', startDay: 8,  endDay: 14 },
      { id: 3, name: 'Week 3', startDay: 15, endDay: 21 },
      { id: 4, name: 'Week 4', startDay: 22, endDay: 28 },
      { id: 5, name: 'Week 5', startDay: 29, endDay: daysInMonth }
    ];

    const weeklyData = weeks.map(w => {
      let done = 0;
      const days = w.endDay - w.startDay + 1;
      for (let d = w.startDay; d <= w.endDay; d++) {
        habits.forEach(h => { if (habitLogs[h.id] && habitLogs[h.id][d]) done++; });
      }
      const possible = habits.length * days;
      const rate = possible > 0 ? Math.round((done / possible) * 100) : 0;
      return { ...w, done, possible, rate, days };
    });

    const best = weeklyData.reduce((a, b) => a.rate > b.rate ? a : b, weeklyData[0]);

    this._renderBestWeekBanner(best);
    this._renderWeekCards(weeklyData, best.id, ym);
    this._renderComparisonChart(weeklyData);
  }

  _renderBestWeekBanner(best) {
    const container = document.getElementById('bestWeekHighlightBanner');
    if (!container) return;
    if (!best || best.done === 0) {
      container.innerHTML = `<div class="highlight-banner empty-banner"><i data-lucide="compass"></i><div>Mark your habits daily to see your best performing week.</div></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    container.innerHTML = `
      <div class="highlight-banner pastel-card-highlight">
        <div class="banner-badge"><i data-lucide="crown"></i> Best Week</div>
        <div class="banner-content">
          <div class="banner-title-row">
            <h3>${best.name} (Days ${best.startDay}–${best.endDay})</h3>
            <span class="performance-grade">${best.rate}% Consistency</span>
          </div>
          <p class="banner-subtext">Completed ${best.done} habit checks out of ${best.possible} possible in this week.</p>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
  }

  _renderWeekCards(weeklyData, bestId, ym) {
    const container = document.getElementById('weeklyCardsContainer');
    if (!container) return;
    container.innerHTML = weeklyData.map(w => {
      const isBest = w.id === bestId && w.done > 0;
      const weekKey = `${ym}_W${w.id}`;
      const note = window.storage.getWeeklyNote(weekKey);
      return `
        <div class="card weekly-summary-card ${isBest ? 'card-best-week' : ''}">
          <div class="weekly-card-header">
            <div>
              <div class="week-title-row">
                <h4>${w.name}</h4>
                <span class="week-date-span">Days ${w.startDay}–${w.endDay}</span>
              </div>
              ${isBest ? '<span class="best-badge"><i data-lucide="award"></i> Top Week</span>' : ''}
            </div>
            <div class="score-circle" title="Habit consistency rate">
              <span class="score-val">${w.rate}%</span>
              <span class="score-label">Rate</span>
            </div>
          </div>
          <div class="weekly-metrics-grid">
            <div class="weekly-stat-item">
              <span class="stat-label"><i data-lucide="check-circle-2"></i> Habits Done</span>
              <span class="stat-value">${w.done}</span>
            </div>
            <div class="weekly-stat-item">
              <span class="stat-label"><i data-lucide="target"></i> Possible</span>
              <span class="stat-value">${w.possible}</span>
            </div>
          </div>
          <div class="weekly-note-box">
            <label class="weekly-note-label"><i data-lucide="feather"></i> Weekly Reflections</label>
            <textarea class="weekly-textarea" placeholder="Key wins and observations..." onchange="window.weeklyManager.saveNote('${weekKey}', this.value)">${escapeHTML(note.notes || '')}</textarea>
          </div>
        </div>`;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  saveNote(weekKey, text) {
    window.storage.saveWeeklyNote(weekKey, { notes: text });
    if (window.app) window.app.showToast('Reflection saved', 'success');
  }

  _renderComparisonChart(weeklyData) {
    const canvas = document.getElementById('weeklyComparisonChart');
    if (!canvas) return;
    if (this.comparisonChart) { this.comparisonChart.destroy(); }
    this.comparisonChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: weeklyData.map(w => `${w.name} (${w.startDay}-${w.endDay})`),
        datasets: [{
          label: 'Habit Consistency %',
          data: weeklyData.map(w => w.rate),
          backgroundColor: 'rgba(107,142,113,0.75)',
          borderColor: '#6B8E71',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => `${v}%` } }
        }
      }
    });
  }
}

window.weeklyManager = new WeeklyManager();
