/**
 * analytics.js - Chart.js Visualizations & Intelligent Data Insights Engine
 * Renders dashboard charts, dedicated analytics charts, and real calculated insights.
 */

class AnalyticsManager {
  constructor() {
    this.charts = {};
  }

  init() {
    // Chart.js default styling configuration for soft pastel theme
    if (window.Chart) {
      Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      Chart.defaults.color = '#687076';
      Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(27, 30, 35, 0.9)';
      Chart.defaults.plugins.tooltip.padding = 10;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
      Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: '600' };
      Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    }
  }

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  }

  renderAll() {
    this.renderDashboardCharts();
    this.renderAnalyticsPage();
  }

  // --- Dashboard Overview Charts ---
  renderDashboardCharts() {
    const currentYM = window.app.activeYearMonth;
    const [yearStr, monthStr] = currentYM.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(currentYM);
    const dailyLogs = window.storage.getAllDailyLogs();

    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
    const evaluatedDays = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    // 1. Dashboard Habit Trend (Line Chart)
    const habitTrendCanvas = document.getElementById('dashHabitTrendChart');
    if (habitTrendCanvas) {
      this.destroyChart('dashHabitTrend');

      const dayLabels = [];
      const dayPercentages = [];

      for (let d = 1; d <= daysInMonth; d++) {
        dayLabels.push(`${d}`);
        if (d <= evaluatedDays) {
          let count = 0;
          habits.forEach(h => {
            if (habitLogs[h.id] && habitLogs[h.id][d]) count++;
          });
          const pct = habits.length > 0 ? Math.round((count / habits.length) * 100) : 0;
          dayPercentages.push(pct);
        } else {
          dayPercentages.push(null);
        }
      }

      const ctx = habitTrendCanvas.getContext('2d');
      this.charts['dashHabitTrend'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Completion %',
            data: dayPercentages,
            borderColor: '#6B8E71',
            backgroundColor: 'rgba(107, 142, 113, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: (ctx) => (ctx.raw !== null ? 2.5 : 0),
            pointHoverRadius: 5,
            pointBackgroundColor: '#6B8E71',
            spanGaps: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Habits Done: ${ctx.raw}%`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 16 }
            },
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(0, 0, 0, 0.04)' },
              ticks: {
                callback: (val) => `${val}%`,
                stepSize: 25
              }
            }
          }
        }
      });
    }

    // 2. Dashboard Weekly Productivity Bar Chart
    const weeklyBarCanvas = document.getElementById('dashWeeklyBarChart');
    if (weeklyBarCanvas) {
      this.destroyChart('dashWeeklyBar');

      const weeks = [
        { label: 'W1 (1-7)', start: 1, end: 7 },
        { label: 'W2 (8-14)', start: 8, end: 14 },
        { label: 'W3 (15-21)', start: 15, end: 21 },
        { label: 'W4 (22-28)', start: 22, end: 28 },
        { label: 'W5 (29+)', start: 29, end: daysInMonth }
      ];

      const studyData = [];
      const codingData = [];

      weeks.forEach(w => {
        let s = 0;
        let c = 0;
        for (let d = w.start; d <= w.end; d++) {
          const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
          const l = dailyLogs[dateStr];
          if (l) {
            s += (l.studyHours || 0);
            c += (l.codingHours || 0);
          }
        }
        studyData.push(Number(s.toFixed(1)));
        codingData.push(Number(c.toFixed(1)));
      });

      const ctx = weeklyBarCanvas.getContext('2d');
      this.charts['dashWeeklyBar'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: weeks.map(w => w.label),
          datasets: [
            {
              label: 'Study (hrs)',
              data: studyData,
              backgroundColor: 'rgba(91, 130, 150, 0.8)',
              borderRadius: 6
            },
            {
              label: 'Coding (hrs)',
              data: codingData,
              backgroundColor: 'rgba(139, 126, 166, 0.8)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { boxWidth: 10, usePointStyle: true }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.04)' }
            }
          }
        }
      });
    }

    // 3. Category Productivity Chart (Doughnut)
    const categoryCanvas = document.getElementById('dashCategoryChart');
    if (categoryCanvas) {
      this.destroyChart('dashCategory');

      // Calculate time and habits by category
      const catTotals = {
        Personal: 0,
        Academic: 0,
        Technology: 0,
        Health: 0,
        Creative: 0,
        Wellbeing: 0
      };

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
        const l = dailyLogs[dateStr];
        if (l) {
          catTotals.Academic += (l.studyHours || 0) + ((l.readingMinutes || 0) / 60);
          catTotals.Technology += (l.codingHours || 0);
          catTotals.Health += ((l.exerciseMinutes || 0) / 60);
          catTotals.Creative += (l.creativeHours || 0);
          if (l.notes) catTotals.Wellbeing += 0.5;
        }
      }

      // Add weight for habits in category
      habits.forEach(h => {
        const logs = habitLogs[h.id] || {};
        let done = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          if (logs[d]) done++;
        }
        const hoursEq = done * 0.4;
        if (catTotals[h.category] !== undefined) {
          catTotals[h.category] += hoursEq;
        } else {
          catTotals.Personal += hoursEq;
        }
      });

      const labels = Object.keys(catTotals);
      const data = labels.map(k => Number(catTotals[k].toFixed(1)));
      const hasAnyData = data.some(v => v > 0);

      const ctx = categoryCanvas.getContext('2d');
      this.charts['dashCategory'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: hasAnyData ? data : [1, 1, 1, 1, 1, 1],
            backgroundColor: hasAnyData ? [
              '#D98282', // Personal (Rose)
              '#658EA9', // Academic (Blue)
              '#8B7BA7', // Technology (Violet)
              '#6E9A77', // Health (Sage)
              '#DF8C60', // Creative (Peach)
              '#5C9E9A'  // Wellbeing (Teal)
            ] : ['#E8E6E1', '#E8E6E1', '#E8E6E1', '#E8E6E1', '#E8E6E1', '#E8E6E1'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } }
            },
            tooltip: {
              enabled: hasAnyData,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} score units`
              }
            }
          }
        }
      });
    }

    // 4. Daily Activity Heatmap Blocks
    this.renderDailyActivityHeatmap(daysInMonth, evaluatedDays, currentYM, habitLogs, dailyLogs, habits);
  }

  renderDailyActivityHeatmap(daysInMonth, evaluatedDays, ym, habitLogs, dailyLogs, habits) {
    const container = document.getElementById('dashDailyHeatmap');
    if (!container) return;

    let html = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
      const log = dailyLogs[dateStr];
      let habitsCount = 0;
      habits.forEach(h => {
        if (habitLogs[h.id] && habitLogs[h.id][d]) habitsCount++;
      });

      const totalHours = log ? ((log.studyHours || 0) + (log.codingHours || 0) + (log.creativeHours || 0) + ((log.readingMinutes || 0) / 60)) : 0;
      const intensity = Math.min(4, Math.floor((habitsCount / (habits.length || 1)) * 3) + (totalHours > 2 ? 1 : 0));
      const isPastOrToday = d <= evaluatedDays;

      html += `
        <div class="heatmap-day-cell level-${isPastOrToday ? intensity : 'future'}" 
             title="Day ${d}: ${habitsCount} habits, ${totalHours.toFixed(1)}h logged"
             onclick="window.calendarManager.openDayModal('${dateStr}')">
          <span class="heatmap-day-label">${d}</span>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // --- Dedicated Analytics Page ---
  renderAnalyticsPage() {
    const currentYM = window.app.activeYearMonth;
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

    // Calculate aggregated stats
    let totalStudy = 0;
    let totalCoding = 0;
    let totalReadingMins = 0;
    let totalCreative = 0;
    let totalExerciseMins = 0;
    let totalHabitCompletions = 0;

    for (let d = 1; d <= evaluatedDays; d++) {
      const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
      const l = dailyLogs[dateStr];
      if (l) {
        totalStudy += (l.studyHours || 0);
        totalCoding += (l.codingHours || 0);
        totalReadingMins += (l.readingMinutes || 0);
        totalCreative += (l.creativeHours || 0);
        totalExerciseMins += (l.exerciseMinutes || 0);
      }
      habits.forEach(h => {
        if (habitLogs[h.id] && habitLogs[h.id][d]) totalHabitCompletions++;
      });
    }

    const totalProductiveHours = totalStudy + totalCoding + totalCreative + (totalReadingMins / 60);
    const totalPossibleHabits = habits.length * evaluatedDays;
    const habitConsistencyPct = totalPossibleHabits > 0 ? Math.round((totalHabitCompletions / totalPossibleHabits) * 100) : 0;

    // Goals stat
    const completedGoalsCount = goals.filter(g => g.status === 'completed').length;
    const goalRate = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0;

    // Update stat cards
    const elConsistency = document.getElementById('analyticsConsistencyVal');
    if (elConsistency) elConsistency.textContent = `${habitConsistencyPct}%`;

    const elTotalHours = document.getElementById('analyticsTotalHoursVal');
    if (elTotalHours) elTotalHours.textContent = `${totalProductiveHours.toFixed(1)} hrs`;

    const elStudyCoding = document.getElementById('analyticsStudyCodingRatio');
    if (elStudyCoding) {
      elStudyCoding.textContent = `${totalStudy.toFixed(1)}h / ${totalCoding.toFixed(1)}h`;
    }

    const elGoalsRate = document.getElementById('analyticsGoalsRateVal');
    if (elGoalsRate) elGoalsRate.textContent = `${completedGoalsCount} of ${goals.length} (${goalRate}%)`;

    // Habit rankings
    const habitRankings = habits.map(h => {
      const logs = habitLogs[h.id] || {};
      let done = 0;
      for (let d = 1; d <= evaluatedDays; d++) {
        if (logs[d]) done++;
      }
      const rate = evaluatedDays > 0 ? Math.round((done / evaluatedDays) * 100) : 0;
      return { id: h.id, name: h.name, category: h.category, rate, done };
    }).sort((a, b) => b.rate - a.rate);

    // Render Habit Ranking Chart
    const rankingCanvas = document.getElementById('analyticsHabitRankingChart');
    if (rankingCanvas && habitRankings.length > 0) {
      this.destroyChart('analyticsRanking');

      const ctx = rankingCanvas.getContext('2d');
      this.charts['analyticsRanking'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: habitRankings.map(h => h.name),
          datasets: [{
            label: 'Consistency %',
            data: habitRankings.map(h => h.rate),
            backgroundColor: habitRankings.map(h => {
              if (h.rate >= 80) return 'rgba(107, 142, 113, 0.85)'; // Sage
              if (h.rate >= 50) return 'rgba(101, 142, 169, 0.85)'; // Blue
              return 'rgba(216, 130, 121, 0.85)'; // Blush
            }),
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.raw}% completed (${habitRankings[ctx.dataIndex].done} days)`
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { callback: (v) => `${v}%` }
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 11 } }
            }
          }
        }
      });
    }

    // Render Weekly Productivity Trend Line Chart
    const weeklyTrendCanvas = document.getElementById('analyticsWeeklyTrendChart');
    if (weeklyTrendCanvas) {
      this.destroyChart('analyticsWeeklyTrend');

      const weeks = [1, 2, 3, 4, 5];
      const weekStudy = [0, 0, 0, 0, 0];
      const weekCoding = [0, 0, 0, 0, 0];

      for (let d = 1; d <= daysInMonth; d++) {
        const wIdx = Math.min(4, Math.floor((d - 1) / 7));
        const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
        const l = dailyLogs[dateStr];
        if (l) {
          weekStudy[wIdx] += (l.studyHours || 0);
          weekCoding[wIdx] += (l.codingHours || 0);
        }
      }

      const ctx = weeklyTrendCanvas.getContext('2d');
      this.charts['analyticsWeeklyTrend'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
          datasets: [
            {
              label: 'Study Hours',
              data: weekStudy.map(v => Number(v.toFixed(1))),
              backgroundColor: '#658EA9',
              borderRadius: 5
            },
            {
              label: 'Coding Hours',
              data: weekCoding.map(v => Number(v.toFixed(1))),
              backgroundColor: '#8B7BA7',
              borderRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 10 } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } }
          }
        }
      });
    }

    // Dynamic Intelligent Insights Generation
    this.generateSmartInsights({
      totalProductiveHours,
      totalStudy,
      totalCoding,
      totalCreative,
      totalReadingMins,
      totalExerciseMins,
      habitConsistencyPct,
      habitRankings,
      goals,
      completedGoalsCount,
      evaluatedDays,
      daysInMonth
    });
  }

  generateSmartInsights(metrics) {
    const insightsContainer = document.getElementById('smartInsightsList');
    if (!insightsContainer) return;

    const insights = [];

    // Check if there is data
    if (metrics.evaluatedDays === 0 || (metrics.totalProductiveHours === 0 && metrics.habitRankings.every(h => h.done === 0))) {
      insightsContainer.innerHTML = `
        <div class="empty-insights-state">
          <i data-lucide="info"></i>
          <p>No activity recorded yet for this month. Start marking your habits or logging daily hours to generate data-driven insights.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Insight 1: Most consistent habit
    const topHabit = metrics.habitRankings[0];
    if (topHabit && topHabit.rate > 0) {
      insights.push({
        icon: 'trophy',
        type: 'positive',
        title: 'Top Habit Consistency',
        text: `Your most consistent habit this month is <strong>${escapeHTML(topHabit.name)}</strong> with a <strong>${topHabit.rate}%</strong> completion rate across ${topHabit.done} days.`
      });
    }

    // Insight 2: Habit needing attention
    const activeLowest = metrics.habitRankings.filter(h => h.rate < 60);
    if (activeLowest.length > 0) {
      const lowest = activeLowest[activeLowest.length - 1];
      insights.push({
        icon: 'alert-circle',
        type: 'attention',
        title: 'Room for Optimization',
        text: `<strong>${escapeHTML(lowest.name)}</strong> is currently at <strong>${lowest.rate}%</strong> consistency. Consider pairing it with a morning trigger or adjusting its target frequency.`
      });
    }

    // Insight 3: Focus Distribution (Study vs Coding)
    if (metrics.totalProductiveHours > 0) {
      const codingShare = Math.round((metrics.totalCoding / metrics.totalProductiveHours) * 100);
      const studyShare = Math.round((metrics.totalStudy / metrics.totalProductiveHours) * 100);
      const creativeShare = Math.round((metrics.totalCreative / metrics.totalProductiveHours) * 100);

      insights.push({
        icon: 'pie-chart',
        type: 'neutral',
        title: 'Deep Work Breakdown',
        text: `You have logged <strong>${metrics.totalProductiveHours.toFixed(1)} total focused hours</strong> this month. Coding represents <strong>${codingShare}%</strong>, studying accounts for <strong>${studyShare}%</strong>, and creative projects represent <strong>${creativeShare}%</strong>.`
      });
    }

    // Insight 4: Goals Progress
    if (metrics.goals.length > 0) {
      const goalPct = Math.round((metrics.completedGoalsCount / metrics.goals.length) * 100);
      insights.push({
        icon: 'target',
        type: goalPct >= 50 ? 'positive' : 'neutral',
        title: 'Monthly Milestone Momentum',
        text: `You have completed <strong>${metrics.completedGoalsCount} of ${metrics.goals.length}</strong> monthly goals (<strong>${goalPct}%</strong>). ${goalPct >= 50 ? 'Great velocity towards hitting your targets!' : 'Stay disciplined on your high priority goals.'}`
      });
    }

    // Insight 5: Physical Wellbeing & Recovery
    if (metrics.totalExerciseMins > 0) {
      const hoursEx = (metrics.totalExerciseMins / 60).toFixed(1);
      insights.push({
        icon: 'heart-pulse',
        type: 'positive',
        title: 'Physical Vitality',
        text: `You have maintained active physical movement with <strong>${metrics.totalExerciseMins} total minutes (${hoursEx} hours)</strong> of workout and cardio sessions.`
      });
    }

    // Render insights list
    let html = '';
    insights.forEach(item => {
      html += `
        <div class="insight-card insight-${item.type}">
          <div class="insight-icon-box">
            <i data-lucide="${item.icon}"></i>
          </div>
          <div class="insight-content">
            <h5>${item.title}</h5>
            <p>${item.text}</p>
          </div>
        </div>
      `;
    });

    insightsContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Global instance
window.analyticsManager = new AnalyticsManager();
