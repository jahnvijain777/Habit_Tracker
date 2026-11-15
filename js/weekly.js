/**
 * weekly.js - Weekly Performance Tracker & Comparison
 * Aggregates daily logs and habit tracking by calendar weeks automatically.
 */

class WeeklyManager {
  constructor() {
    this.comparisonChart = null;
  }

  init() {
    // Setup listeners if needed
  }

  render() {
    const currentYM = window.app.activeYearMonth;
    const [yearStr, monthStr] = currentYM.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const habits = window.storage.getHabits();
    const habitLogs = window.storage.getHabitLogs(currentYM);
    const dailyLogs = window.storage.getAllDailyLogs();

    // Define 5 weeks for the month
    const weeks = [
      { id: 1, name: 'Week 1', startDay: 1, endDay: 7 },
      { id: 2, name: 'Week 2', startDay: 8, endDay: 14 },
      { id: 3, name: 'Week 3', startDay: 15, endDay: 21 },
      { id: 4, name: 'Week 4', startDay: 22, endDay: 28 },
      { id: 5, name: 'Week 5', startDay: 29, endDay: daysInMonth }
    ];

    const weeklyData = weeks.map(w => {
      let studyHours = 0;
      let codingHours = 0;
      let creativeHours = 0;
      let readingMins = 0;
      let exerciseMins = 0;
      let exerciseSessions = 0;
      let habitsCompleted = 0;
      let assignmentsDone = 0;
      let loggedDaysCount = 0;

      const numDaysInThisWeek = (w.endDay - w.startDay + 1);

      for (let d = w.startDay; d <= w.endDay; d++) {
        const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
        const log = dailyLogs[dateStr];

        if (log) {
          if (log.studyHours) studyHours += log.studyHours;
          if (log.codingHours) codingHours += log.codingHours;
          if (log.creativeHours) creativeHours += log.creativeHours;
          if (log.readingMinutes) readingMins += log.readingMinutes;
          if (log.exerciseMinutes) {
            exerciseMins += log.exerciseMinutes;
            if (log.exerciseMinutes >= 20) exerciseSessions++;
          }
          if (log.assignmentsDone) assignmentsDone += log.assignmentsDone;
          if (log.studyHours > 0 || log.codingHours > 0 || log.notes) loggedDaysCount++;
        }

        habits.forEach(h => {
          if (habitLogs[h.id] && habitLogs[h.id][d]) {
            habitsCompleted++;
          }
        });
      }

      const totalHabitsPossible = habits.length * numDaysInThisWeek;
      const habitRate = totalHabitsPossible > 0 ? Math.round((habitsCompleted / totalHabitsPossible) * 100) : 0;
      const totalProductiveHours = studyHours + codingHours + creativeHours + (readingMins / 60);

      // Score 0-100 based on hours (target ~25h/week) and habit rate
      const hourScore = Math.min(100, Math.round((totalProductiveHours / 25) * 100));
      const overallScore = Math.round((habitRate * 0.5) + (hourScore * 0.5));

      return {
        ...w,
        numDays: numDaysInThisWeek,
        studyHours: Number(studyHours.toFixed(1)),
        codingHours: Number(codingHours.toFixed(1)),
        creativeHours: Number(creativeHours.toFixed(1)),
        readingMins,
        exerciseMins,
        exerciseSessions,
        habitsCompleted,
        habitRate,
        assignmentsDone,
        totalProductiveHours: Number(totalProductiveHours.toFixed(1)),
        overallScore
      };
    });

    // Find best performing week
    let bestWeek = weeklyData[0];
    weeklyData.forEach(w => {
      if (w.overallScore > bestWeek.overallScore) {
        bestWeek = w;
      }
    });

    this.renderBestWeekBanner(bestWeek, currentYM);
    this.renderWeekCards(weeklyData, bestWeek.id);
    this.renderComparisonChart(weeklyData);
  }

  renderBestWeekBanner(bestWeek, ym) {
    const bannerContainer = document.getElementById('bestWeekHighlightBanner');
    if (!bannerContainer) return;

    if (!bestWeek || bestWeek.totalProductiveHours === 0 && bestWeek.habitsCompleted === 0) {
      bannerContainer.innerHTML = `
        <div class="highlight-banner empty-banner">
          <i data-lucide="compass"></i>
          <div>
            <strong>Log your daily progress</strong> to identify your peak performance week!
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    bannerContainer.innerHTML = `
      <div class="highlight-banner pastel-card-highlight">
        <div class="banner-badge">
          <i data-lucide="crown"></i> Best Performing Week
        </div>
        <div class="banner-content">
          <div class="banner-title-row">
            <h3>${bestWeek.name} (Days ${bestWeek.startDay}–${bestWeek.endDay})</h3>
            <span class="performance-grade">${bestWeek.overallScore}% Efficiency</span>
          </div>
          <p class="banner-subtext">
            Achieved ${bestWeek.totalProductiveHours}h of focused output (${bestWeek.studyHours}h study, ${bestWeek.codingHours}h coding) and completed ${bestWeek.habitsCompleted} habits at a ${bestWeek.habitRate}% consistency rate.
          </p>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  renderWeekCards(weeklyData, bestWeekId) {
    const container = document.getElementById('weeklyCardsContainer');
    if (!container) return;

    let html = '';

    weeklyData.forEach(w => {
      const isBest = (w.id === bestWeekId && w.totalProductiveHours > 0);
      const weekKey = `${window.app.activeYearMonth}_W${w.id}`;
      const savedNote = window.storage.getWeeklyNote(weekKey);

      html += `
        <div class="card weekly-summary-card ${isBest ? 'card-best-week' : ''}">
          <div class="weekly-card-header">
            <div>
              <div class="week-title-row">
                <h4>${w.name}</h4>
                <span class="week-date-span">Days ${w.startDay}–${w.endDay}</span>
              </div>
              ${isBest ? '<span class="best-badge"><i data-lucide="award"></i> Top Week</span>' : ''}
            </div>
            <div class="score-circle" title="Overall score based on habits + focused hours">
              <span class="score-val">${w.overallScore}%</span>
              <span class="score-label">Score</span>
            </div>
          </div>

          <div class="weekly-metrics-grid">
            <div class="weekly-stat-item">
              <span class="stat-label"><i data-lucide="book-open"></i> Study Time</span>
              <span class="stat-value">${w.studyHours} hrs</span>
            </div>
            <div class="weekly-stat-item">
              <span class="stat-label"><i data-lucide="code"></i> Coding Time</span>
              <span class="stat-value">${w.codingHours} hrs</span>
            </div>
            <div class="weekly-stat-item">
              <span class="stat-label"><i data-lucide="check-circle-2"></i> Habits Done</span>
              <span class="stat-value">${w.habitsCompleted} <small>(${w.habitRate}%)</small></span>
            </div>
            <div class="weekly-stat-item">
              <span class="stat-label"><i data-lucide="activity"></i> Exercise</span>
              <span class="stat-value">${w.exerciseSessions} sessions <small>(${w.exerciseMins}m)</small></span>
            </div>
          </div>

          <div class="weekly-note-box">
            <label for="wnote_${w.id}" class="weekly-note-label">
              <i data-lucide="feather"></i> Weekly Reflection & Wins
            </label>
            <textarea 
              id="wnote_${w.id}" 
              class="weekly-textarea" 
              placeholder="What went well this week? Key achievements or adjustments..."
              onchange="window.weeklyManager.saveWeekNote('${weekKey}', this.value)"
            >${escapeHTML(savedNote.notes || '')}</textarea>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  saveWeekNote(weekKey, text) {
    window.storage.saveWeeklyNote(weekKey, { notes: text });
    window.app.showToast('Weekly reflection saved', 'success');
  }

  renderComparisonChart(weeklyData) {
    const canvas = document.getElementById('weeklyComparisonChart');
    if (!canvas) return;

    if (this.comparisonChart) {
      this.comparisonChart.destroy();
    }

    const labels = weeklyData.map(w => `${w.name} (${w.startDay}-${w.endDay})`);
    const studyData = weeklyData.map(w => w.studyHours);
    const codingData = weeklyData.map(w => w.codingHours);
    const creativeData = weeklyData.map(w => w.creativeHours);

    const ctx = canvas.getContext('2d');
    this.comparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Study Hours',
            data: studyData,
            backgroundColor: 'rgba(101, 142, 169, 0.75)',
            borderColor: '#658EA9',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Coding Hours',
            data: codingData,
            backgroundColor: 'rgba(139, 123, 167, 0.75)',
            borderColor: '#8B7BA7',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Creative Work',
            data: creativeData,
            backgroundColor: 'rgba(223, 140, 96, 0.75)',
            borderColor: '#DF8C60',
            borderWidth: 1.5,
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
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
            }
          },
          tooltip: {
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ${item.raw} hrs`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours Logged'
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
          }
        }
      }
    });
  }
}

// Global instance
window.weeklyManager = new WeeklyManager();
