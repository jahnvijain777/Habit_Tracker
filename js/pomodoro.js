/**
 * pomodoro.js — Focus Timer: Pomodoro + Stopwatch
 * Uses Web Audio API for end-of-session tones (no external files).
 * SVG ring animation for visual countdown.
 */

class PomodoroManager {
  constructor() {
    // Timer state
    this.mode = 'pomodoro'; // 'pomodoro' | 'short' | 'long' | 'stopwatch'
    this.phase = 'work';    // 'work' | 'short' | 'long'
    this.state = 'idle';    // 'idle' | 'running' | 'paused'
    this.sessionCount = 0;
    this.sessionsUntilLong = 4;

    // Times in seconds
    this.remaining = 0;
    this.elapsed = 0;        // stopwatch
    this.laps = [];

    this._interval = null;
    this._audioCtx = null;

    // Swipe tracking
    this._swipeStartX = 0;
  }

  get settings() {
    const s = window.storage.getSettings();
    return {
      work:  (s.pomodoroWork || 25) * 60,
      short: (s.pomodoroShortBreak || 5) * 60,
      long:  (s.pomodoroLongBreak || 15) * 60,
      autoAdvance: !!s.pomodoroAutoAdvance
    };
  }

  init() {
    this._setupModeButtons();
    this._setupControls();
    this._reset(false);
    this._syncDashboardCount();
  }

  /* ---------- Setup -------------------------------------------------- */
  _setupModeButtons() {
    document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.mode;
        this.mode = m;
        document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._reset(false);
        this._updateUI();
      });
    });
  }

  _setupControls() {
    const startPauseBtn = document.getElementById('pomoStartPauseBtn');
    const resetBtn = document.getElementById('pomoResetBtn');
    const lapBtn = document.getElementById('pomoLapBtn');
    const skipBtn = document.getElementById('pomoSkipBtn');

    if (startPauseBtn) startPauseBtn.addEventListener('click', () => this.toggleStartPause());
    if (resetBtn) resetBtn.addEventListener('click', () => this._reset(true));
    if (lapBtn) lapBtn.addEventListener('click', () => this._addLap());
    if (skipBtn) skipBtn.addEventListener('click', () => this._skipPhase());
  }

  /* ---------- Controls ----------------------------------------------- */
  toggleStartPause() {
    if (this.state === 'idle' || this.state === 'paused') {
      this.state = 'running';
      this._startTick();
    } else {
      this.state = 'paused';
      this._stopTick();
    }
    this._updateUI();
  }

  _reset(updateUI = true) {
    this._stopTick();
    this.state = 'idle';
    this.laps = [];
    if (this.mode === 'stopwatch') {
      this.elapsed = 0;
    } else {
      const dur = this._currentDuration();
      this.remaining = dur;
    }
    if (updateUI) this._updateUI();
  }

  _skipPhase() {
    if (this.mode !== 'pomodoro') return;
    this._stopTick();
    this._onPhaseComplete(false);
  }

  _addLap() {
    if (this.mode !== 'stopwatch' || this.state !== 'running') return;
    const lapEl = document.getElementById('pomoLapsList');
    if (!lapEl) return;
    const t = this._fmtTime(this.elapsed);
    this.laps.push(t);
    const li = document.createElement('li');
    li.className = 'lap-entry';
    li.textContent = `Lap ${this.laps.length}  —  ${t}`;
    lapEl.prepend(li);
  }

  /* ---------- Tick --------------------------------------------------- */
  _startTick() {
    this._stopTick();
    this._interval = setInterval(() => {
      if (this.mode === 'stopwatch') {
        this.elapsed++;
      } else {
        this.remaining--;
        if (this.remaining <= 0) {
          this.remaining = 0;
          this._onPhaseComplete(true);
          return;
        }
      }
      this._updateUI();
    }, 1000);
  }

  _stopTick() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  /* ---------- Phase Management --------------------------------------- */
  _currentDuration() {
    const s = this.settings;
    if (this.mode === 'pomodoro') return this.phase === 'work' ? s.work : (this.phase === 'long' ? s.long : s.short);
    if (this.mode === 'short') return s.short;
    if (this.mode === 'long') return s.long;
    return s.work;
  }

  _onPhaseComplete(playSound) {
    this.state = 'idle';
    this._stopTick();
    if (playSound) this._playTone();

    if (this.mode === 'pomodoro') {
      if (this.phase === 'work') {
        this.sessionCount++;
        window.storage.incrementPomodoroSession();
        this._syncDashboardCount();
        if (window.app) window.app.showToast(`🍅 Session ${this.sessionCount} complete! Take a break.`, 'success');

        const sessLeft = this.sessionsUntilLong - (this.sessionCount % this.sessionsUntilLong);
        if (sessLeft === 0 || this.sessionCount % this.sessionsUntilLong === 0) {
          this.phase = 'long';
        } else {
          this.phase = 'short';
        }
      } else {
        this.phase = 'work';
        if (window.app) window.app.showToast('Break over — time to focus! 🧠', 'info');
      }
      this.remaining = this._currentDuration();
    }

    this._updateUI();

    if (this.settings.autoAdvance && this.mode === 'pomodoro') {
      setTimeout(() => { this.state = 'running'; this._startTick(); this._updateUI(); }, 1500);
    }
  }

  /* ---------- Audio -------------------------------------------------- */
  _getAudioCtx() {
    if (!this._audioCtx) {
      try { this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    return this._audioCtx;
  }

  _playTone(frequency = 528, duration = 0.6) {
    const ctx = this._getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
      // Double tone for distinction
      setTimeout(() => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.setValueAtTime(frequency * 1.25, ctx.currentTime);
        o2.type = 'sine';
        g2.gain.setValueAtTime(0.3, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        o2.start(ctx.currentTime); o2.stop(ctx.currentTime + duration);
      }, 350);
    } catch (e) {}
  }

  /* ---------- UI ----------------------------------------------------- */
  _syncDashboardCount() {
    const stats = window.storage.getPomodoroStats();
    const el = document.getElementById('dashPomodoroCount');
    if (el) el.textContent = `🍅 ${stats.todaySessions} session${stats.todaySessions !== 1 ? 's' : ''} today`;
    const sideDaily = document.getElementById('pomoDailyCountSide');
    if (sideDaily) sideDaily.textContent = stats.todaySessions;
    const sideTotal = document.getElementById('pomoTotalCountSide');
    if (sideTotal) sideTotal.textContent = stats.totalSessions;
  }

  _updateUI() {
    const isStopwatch = this.mode === 'stopwatch';
    const displaySecs = isStopwatch ? this.elapsed : this.remaining;
    const totalSecs = isStopwatch ? null : this._currentDuration();

    // Time display
    const timeEl = document.getElementById('pomoTimeDisplay');
    if (timeEl) timeEl.textContent = this._fmtTime(displaySecs);

    // Phase label
    const phaseEl = document.getElementById('pomoPhaseLabel');
    if (phaseEl) {
      if (isStopwatch) {
        phaseEl.textContent = this.state === 'running' ? '⏱ Stopwatch Running' : (this.state === 'paused' ? '⏸ Paused' : '⏱ Stopwatch');
      } else {
        const phaseMap = { work: '🍅 Focus Session', short: '☕ Short Break', long: '🌿 Long Break' };
        phaseEl.textContent = phaseMap[this.phase] || '🍅 Focus';
      }
    }

    // Session counter badge
    const sessEl = document.getElementById('pomoSessionCount');
    if (sessEl) {
      if (isStopwatch) {
        sessEl.textContent = `Lap ${this.laps.length}`;
      } else {
        sessEl.textContent = `Session ${this.sessionCount + 1}`;
      }
    }

    // SVG ring
    this._updateRing(displaySecs, totalSecs);

    // Start/pause button
    const btn = document.getElementById('pomoStartPauseBtn');
    if (btn) {
      btn.innerHTML = this.state === 'running'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Pause'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg> ' + (this.state === 'paused' ? 'Resume' : 'Start');
      btn.className = this.state === 'running' ? 'btn btn-pomo-pause' : 'btn btn-pomo-start';
    }

    // Skip/Lap button visibility
    const lapBtn = document.getElementById('pomoLapBtn');
    const skipBtn = document.getElementById('pomoSkipBtn');
    if (lapBtn) lapBtn.style.display = isStopwatch ? '' : 'none';
    if (skipBtn) skipBtn.style.display = (!isStopwatch && this.mode === 'pomodoro') ? '' : 'none';

    // Lap list visibility
    const lapList = document.getElementById('pomoLapsContainer');
    if (lapList) lapList.style.display = isStopwatch ? '' : 'none';
  }

  _updateRing(elapsed, total) {
    const circle = document.getElementById('pomoRingProgress');
    if (!circle) return;
    const r = parseFloat(circle.getAttribute('r') || 90);
    const circumference = 2 * Math.PI * r;
    circle.style.strokeDasharray = circumference;

    if (total === null) {
      // Stopwatch — spinning fill
      const pct = (elapsed % 60) / 60;
      circle.style.strokeDashoffset = circumference * (1 - pct);
    } else {
      const pct = total > 0 ? elapsed / total : 0;
      circle.style.strokeDashoffset = circumference * (1 - pct);
    }
  }

  _fmtTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
}

window.pomodoroManager = new PomodoroManager();
