/**
 * analytics.js - Chart.js Visualizations & Smart Insights (v3)
 * Charts based solely on habit logs (daily log removed).
 */

class AnalyticsManager {
  constructor() { this.charts = {}; }

  init() {
    if (window.Chart) {
      Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, sans-serif";
      Chart.defaults.color = '#687076';
      Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(27,30,35,0.9)';
      Chart.defaults.plugins.tooltip.padding = 10;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
    }
  }

  destroyChart(id) {
    if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; }
  }

  renderAll() {
    this.renderDashboardCharts();
    this.renderAnalyticsPage();
  }

  /* ======== Dashboard Charts ======================================== */
  renderDashboardCharts() {
    const ym = window.app.activeYearMonth;
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);
    const today = new Date();
    const isCurrent = today.getFullYear() === y && (today.getMonth() + 1) === m;
    const evalDays = isCurrent ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    /* 1 — Habit Trend Line */
    const trendCanvas = document.getElementById('dashHabitTrendChart');
    if (trendCanvas) {
      this.destroyChart('dashHabitTrend');
      const labels = [], data = [];
      for (let d = 1; d <= daysInMonth; d++) {
        labels.push(String(d));
        if (d <= evalDays) {
          let count = 0;
          habits.forEach(h => { if (habitLogs[h.id] && habitLogs[h.id][d]) count++; });
          data.push(habits.length > 0 ? Math.round((count / habits.length) * 100) : 0);
        } else {
          data.push(null);
        }
      }
      this.charts['dashHabitTrend'] = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets: [{ label: 'Completion %', data, borderColor: '#6B8E71', backgroundColor: 'rgba(107,142,113,0.12)', fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2.5, pointHoverRadius: 5, pointBackgroundColor: '#6B8E71', spanGaps: false }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Habits Done: ${c.raw}%` } } },
          scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 16 } }, y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => `${v}%`, stepSize: 25 } } }
        }
      });
    }

    /* 2 — Weekly Habit Completion Bar (replace study/coding since daily log removed) */
    const weeklyCanvas = document.getElementById('dashWeeklyBarChart');
    if (weeklyCanvas) {
      this.destroyChart('dashWeeklyBar');
      const weeks = [
        { label: 'W1 (1-7)', start: 1, end: 7 },
        { label: 'W2 (8-14)', start: 8, end: 14 },
        { label: 'W3 (15-21)', start: 15, end: 21 },
        { label: 'W4 (22-28)', start: 22, end: 28 },
        { label: 'W5 (29+)', start: 29, end: daysInMonth }
      ];
      const rateData = weeks.map(w => {
        let done = 0, possible = 0;
        for (let d = w.start; d <= w.end; d++) {
          habits.forEach(h => {
            possible++;
            if (habitLogs[h.id] && habitLogs[h.id][d]) done++;
          });
        }
        return possible > 0 ? Math.round((done / possible) * 100) : 0;
      });
      this.charts['dashWeeklyBar'] = new Chart(weeklyCanvas.getContext('2d'), {
        type: 'bar',
        data: { labels: weeks.map(w => w.label), datasets: [{ label: 'Habit Rate %', data: rateData, backgroundColor: 'rgba(107,142,113,0.75)', borderRadius: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => `${v}%` } } }
        }
      });
    }

    /* 3 — Category Doughnut */
    const catCanvas = document.getElementById('dashCategoryChart');
    if (catCanvas) {
      this.destroyChart('dashCategory');
      const catTotals = { Personal: 0, Academic: 0, Technology: 0, Health: 0, Creative: 0, Wellbeing: 0 };
      habits.forEach(h => {
        const logs = habitLogs[h.id] || {};
        let done = 0;
        for (let d = 1; d <= evalDays; d++) if (logs[d]) done++;
        const key = catTotals[h.category] !== undefined ? h.category : 'Personal';
        catTotals[key] += done;
      });
      const labels = Object.keys(catTotals);
      const data = labels.map(k => catTotals[k]);
      const hasData = data.some(v => v > 0);
      this.charts['dashCategory'] = new Chart(catCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: hasData ? data : [1,1,1,1,1,1],
            backgroundColor: hasData ? ['#D98282','#658EA9','#8B7BA7','#6E9A77','#DF8C60','#5C9E9A'] : Array(6).fill('#E8E6E1'),
            borderWidth: 2, borderColor: '#FFFFFF'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } } } }
      });
    }

    /* 4 — Heatmap */
    this._renderHeatmap(daysInMonth, evalDays, ym, habitLogs, habits);
  }

  _renderHeatmap(daysInMonth, evalDays, ym, habitLogs, habits) {
    const container = document.getElementById('dashDailyHeatmap');
    if (!container) return;
    let html = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
      let count = 0;
      habits.forEach(h => { if (habitLogs[h.id] && habitLogs[h.id][d]) count++; });
      const pct = habits.length > 0 ? count / habits.length : 0;
      const level = d <= evalDays ? (pct >= 0.8 ? 4 : pct >= 0.6 ? 3 : pct >= 0.4 ? 2 : pct > 0 ? 1 : 0) : 'future';
      html += `<div class="heatmap-day-cell level-${level}" title="Day ${d}: ${count}/${habits.length} habits" onclick="window.calendarManager.openDayModal('${dateStr}')"><span class="heatmap-day-label">${d}</span></div>`;
    }
    container.innerHTML = html;
  }

  /* ======== Analytics Page =========================================== */
  renderAnalyticsPage() {
    const ym = window.app.activeYearMonth;
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(ym);
    const goals = window.storage.getGoalsForMonth(ym);
    const today = new Date();
    const isCurrent = today.getFullYear() === y && (today.getMonth() + 1) === m;
    const evalDays = isCurrent ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    let totalHabitDone = 0;
    const habitRankings = habits.map(h => {
      const logs = habitLogs[h.id] || {};
      let done = 0;
      for (let d = 1; d <= evalDays; d++) if (logs[d]) { done++; totalHabitDone++; }
      return { id: h.id, name: h.name, category: h.category, rate: evalDays > 0 ? Math.round((done / evalDays) * 100) : 0, done };
    }).sort((a, b) => b.rate - a.rate);

    const possible = habits.length * evalDays;
    const consistency = possible > 0 ? Math.round((totalHabitDone / possible) * 100) : 0;
    const pomStats = window.storage.getPomodoroStats();
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const goalRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('analyticsConsistencyVal', `${consistency}%`);
    setEl('analyticsTotalHoursVal', `${evalDays} tracked days`);
    setEl('analyticsPomodoroTotal', `${pomStats.totalSessions} sessions`);
    setEl('analyticsGoalsRateVal', `${completedGoals} of ${goals.length} (${goalRate}%)`);

    /* Habit Ranking Horizontal Bar */
    const rankCanvas = document.getElementById('analyticsHabitRankingChart');
    if (rankCanvas && habitRankings.length > 0) {
      this.destroyChart('analyticsRanking');
      this.charts['analyticsRanking'] = new Chart(rankCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: habitRankings.map(h => h.name),
          datasets: [{ label: 'Consistency %', data: habitRankings.map(h => h.rate), backgroundColor: habitRankings.map(h => h.rate >= 80 ? 'rgba(107,142,113,0.85)' : h.rate >= 50 ? 'rgba(101,142,169,0.85)' : 'rgba(216,130,121,0.85)'), borderRadius: 4 }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw}% (${habitRankings[c.dataIndex].done} days)` } } },
          scales: { x: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => `${v}%` } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
        }
      });
    }

    /* Weekly Habit Consistency Trend */
    const weeklyCanvas = document.getElementById('analyticsWeeklyTrendChart');
    if (weeklyCanvas) {
      this.destroyChart('analyticsWeeklyTrend');
      const weeks = [1,2,3,4,5];
      const weekRates = weeks.map(wk => {
        const start = (wk - 1) * 7 + 1;
        const end = Math.min(wk * 7, daysInMonth);
        let done = 0, poss = 0;
        for (let d = start; d <= end; d++) {
          habits.forEach(h => {
            poss++;
            if (habitLogs[h.id] && habitLogs[h.id][d]) done++;
          });
        }
        return poss > 0 ? Math.round((done / poss) * 100) : 0;
      });
      this.charts['analyticsWeeklyTrend'] = new Chart(weeklyCanvas.getContext('2d'), {
        type: 'bar',
        data: { labels: ['Week 1','Week 2','Week 3','Week 4','Week 5'], datasets: [{ label: 'Habit Rate %', data: weekRates, backgroundColor: '#8B7BA7', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => `${v}%` } } } }
      });
    }

    /* Smart Insights */
    this._generateInsights({ consistency, habitRankings, goals, completedGoals, evalDays, pomStats });
  }

  _generateInsights({ consistency, habitRankings, goals, completedGoals, evalDays, pomStats }) {
    const container = document.getElementById('smartInsightsList');
    if (!container) return;

    if (evalDays === 0 || habitRankings.every(h => h.done === 0)) {
      container.innerHTML = `<div class="empty-insights-state"><i data-lucide="info"></i><p>Start marking habits to generate real data insights.</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const insights = [];
    const top = habitRankings[0];
    if (top && top.rate > 0) {
      insights.push({ icon: 'trophy', type: 'positive', title: 'Most Consistent Habit', text: `<strong>${escapeHTML(top.name)}</strong> leads at <strong>${top.rate}%</strong> consistency across ${top.done} days this month.` });
    }
    const weak = habitRankings.filter(h => h.rate < 60);
    if (weak.length > 0) {
      insights.push({ icon: 'alert-circle', type: 'attention', title: 'Needs Attention', text: `<strong>${escapeHTML(weak[weak.length - 1].name)}</strong> is at <strong>${weak[weak.length - 1].rate}%</strong>. Try habit stacking or pairing it with an existing trigger.` });
    }
    if (goals.length > 0) {
      const goalPct = Math.round((completedGoals / goals.length) * 100);
      insights.push({ icon: 'target', type: goalPct >= 50 ? 'positive' : 'neutral', title: 'Monthly Milestones', text: `<strong>${completedGoals} of ${goals.length}</strong> goals completed (<strong>${goalPct}%</strong>). ${goalPct >= 50 ? 'Excellent momentum!' : 'Focus on high-priority items.'}` });
    }
    if (pomStats.totalSessions > 0) {
      insights.push({ icon: 'clock', type: 'positive', title: 'Focus Sessions', text: `You have completed <strong>${pomStats.totalSessions} Pomodoro sessions</strong> in total — <strong>${pomStats.todaySessions}</strong> today.` });
    }
    insights.push({ icon: 'bar-chart-2', type: 'neutral', title: 'Overall Consistency', text: `Your habit consistency this month is <strong>${consistency}%</strong> across all tracked days.` });

    container.innerHTML = insights.map(i => `
      <div class="insight-card insight-${i.type}">
        <div class="insight-icon-box"><i data-lucide="${i.icon}"></i></div>
        <div class="insight-content"><h5>${i.title}</h5><p>${i.text}</p></div>
      </div>`).join('');
    if (window.lucide) window.lucide.createIcons();
  }
}

window.analyticsManager = new AnalyticsManager();
