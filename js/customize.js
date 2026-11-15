/**
 * customize.js — Dashboard Customization: Stickers, Backgrounds, Widget Visibility
 * - Drag-and-drop sticker placement with persistence
 * - Pastel background themes
 * - Widget show/hide toggles
 */

const STICKER_SET = ['🌸','🌿','🍵','🌙','✨','🎯','🔥','💡','📚','🎨','🧠','💪','🌈','🍎','🦋','🌺','🏔️','🌊','🎵','🕊️','🌻','🍃','🌟','🎀','🧘','🫧','🫶','🌷','🎋','🍄'];

const BG_THEMES = {
  cream:    { label: 'Cream White',    css: '#FAF8F5' },
  lavender: { label: 'Lavender Mist',  css: 'linear-gradient(135deg, #F5F0FB 0%, #EEF2FB 100%)' },
  sage:     { label: 'Sage Garden',    css: 'linear-gradient(135deg, #EFF6EF 0%, #F3F8F0 100%)' },
  blush:    { label: 'Blush Morning',  css: 'linear-gradient(135deg, #FEF0F0 0%, #FFF5F3 100%)' },
  sky:      { label: 'Sky Dusk',       css: 'linear-gradient(135deg, #EFF5FD 0%, #F0F4FA 100%)' }
};

class CustomizeManager {
  constructor() {
    this._dragging = null;
    this._offsetX = 0;
    this._offsetY = 0;
  }

  init() {
    this._applyState();
    this._setupPanel();
    this._setupFloatingBtn();
    this._renderStickers();
    this._checkBackupReminder();
  }

  /* ---- Apply persisted state ------------------------------------------ */
  _applyState() {
    const c = window.storage.getCustomize();
    this._applyBg(c.bg || 'cream');
    this._applyWidgets(c.widgetVisibility || {});
  }

  _applyBg(key) {
    const theme = BG_THEMES[key] || BG_THEMES['cream'];
    const main = document.getElementById('appMainContent');
    if (main) {
      main.style.background = theme.css;
    }
  }

  _applyWidgets(vis) {
    const map = {
      todayCheckIn: 'widgetTodayCheckIn',
      habitTrend:   'widgetHabitTrend',
      weeklyBar:    'widgetWeeklyBar',
      categoryChart:'widgetCategoryChart',
      goalsOverview:'widgetGoalsOverview',
      heatmap:      'widgetHeatmap'
    };
    Object.entries(map).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = (vis[key] === false) ? 'none' : '';
      }
    });
  }

  /* ---- Floating customize button ------------------------------------- */
  _setupFloatingBtn() {
    const fab = document.getElementById('customizeFab');
    if (fab) fab.addEventListener('click', () => this._openPanel());

    const closeBtn = document.getElementById('customizePanelClose');
    if (closeBtn) closeBtn.addEventListener('click', () => this._closePanel());

    const overlay = document.getElementById('customizePanelOverlay');
    if (overlay) overlay.addEventListener('click', () => this._closePanel());
  }

  _openPanel() {
    const panel = document.getElementById('customizePanel');
    const overlay = document.getElementById('customizePanelOverlay');
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('active');
    this._syncPanelState();
  }

  _closePanel() {
    const panel = document.getElementById('customizePanel');
    const overlay = document.getElementById('customizePanelOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }

  /* ---- Panel Setup --------------------------------------------------- */
  _setupPanel() {
    // Background theme buttons
    document.querySelectorAll('.bg-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bg = btn.dataset.bg;
        document.querySelectorAll('.bg-theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._applyBg(bg);
        window.storage.saveCustomize({ bg });
        if (window.app) window.app.showToast(`Background changed to ${BG_THEMES[bg].label}`, 'info');
      });
    });

    // Widget toggles
    document.querySelectorAll('.widget-toggle-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.widget;
        const c = window.storage.getCustomize();
        c.widgetVisibility = c.widgetVisibility || {};
        c.widgetVisibility[key] = cb.checked;
        window.storage.saveCustomize({ widgetVisibility: c.widgetVisibility });
        this._applyWidgets(c.widgetVisibility);
      });
    });

    // Sticker palette
    const palette = document.getElementById('stickerPaletteGrid');
    if (palette) {
      palette.innerHTML = STICKER_SET.map(e =>
        `<button class="sticker-palette-btn" data-emoji="${e}" title="Add ${e}">${e}</button>`
      ).join('');
      palette.addEventListener('click', e => {
        const btn = e.target.closest('.sticker-palette-btn');
        if (btn) this._addSticker(btn.dataset.emoji);
      });
    }

    // Clear stickers
    const clearBtn = document.getElementById('clearStickersBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (confirm('Remove all stickers from the dashboard?')) {
        window.storage.saveCustomize({ stickers: [] });
        this._renderStickers();
        if (window.app) window.app.showToast('All stickers cleared', 'info');
      }
    });
  }

  _syncPanelState() {
    const c = window.storage.getCustomize();
    // Sync bg buttons
    document.querySelectorAll('.bg-theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === (c.bg || 'cream'));
    });
    // Sync widget toggles
    document.querySelectorAll('.widget-toggle-cb').forEach(cb => {
      const key = cb.dataset.widget;
      const vis = c.widgetVisibility || {};
      cb.checked = vis[key] !== false;
    });
  }

  /* ---- Sticker System ----------------------------------------------- */
  _addSticker(emoji) {
    const c = window.storage.getCustomize();
    const stickers = c.stickers || [];
    const id = 'stk_' + Date.now();
    // Place near center of main content area with slight random offset
    const x = 200 + Math.random() * 400;
    const y = 100 + Math.random() * 300;
    stickers.push({ id, emoji, x, y });
    window.storage.saveCustomize({ stickers });
    this._renderStickers();
    if (window.app) window.app.showToast(`${emoji} placed on dashboard`, 'info');
  }

  _renderStickers() {
    const canvas = document.getElementById('stickerCanvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    const c = window.storage.getCustomize();
    (c.stickers || []).forEach(s => this._createStickerEl(s, canvas));
  }

  _createStickerEl(sticker, canvas) {
    const el = document.createElement('div');
    el.className = 'sticker-el';
    el.dataset.id = sticker.id;
    el.textContent = sticker.emoji;
    el.style.left = sticker.x + 'px';
    el.style.top = sticker.y + 'px';
    el.title = 'Right-click or long-press to delete';

    // Drag (mouse)
    el.addEventListener('mousedown', e => this._startDrag(e, el, sticker.id));

    // Right-click to delete
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      this._deleteSticker(sticker.id);
    });

    // Long-press to delete (mobile)
    let pressTimer;
    el.addEventListener('touchstart', e => {
      pressTimer = setTimeout(() => this._deleteSticker(sticker.id), 600);
    }, { passive: true });
    el.addEventListener('touchend', () => clearTimeout(pressTimer));
    el.addEventListener('touchmove', () => clearTimeout(pressTimer));

    // Touch drag
    el.addEventListener('touchstart', e => this._startTouchDrag(e, el, sticker.id), { passive: false });

    canvas.appendChild(el);
  }

  _startDrag(e, el, stickerId) {
    e.preventDefault();
    this._dragging = { el, stickerId };
    this._offsetX = e.clientX - el.getBoundingClientRect().left;
    this._offsetY = e.clientY - el.getBoundingClientRect().top;
    el.classList.add('dragging');

    const onMove = e => {
      if (!this._dragging) return;
      const canvas = document.getElementById('stickerCanvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left - this._offsetX;
      let y = e.clientY - rect.top - this._offsetY;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    };

    const onUp = e => {
      if (!this._dragging) return;
      el.classList.remove('dragging');
      const canvas = document.getElementById('stickerCanvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - this._offsetX;
        const y = e.clientY - rect.top - this._offsetY;
        this._savePosition(stickerId, x, y);
      }
      this._dragging = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  _startTouchDrag(e, el, stickerId) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this._offsetX = touch.clientX - el.getBoundingClientRect().left;
    this._offsetY = touch.clientY - el.getBoundingClientRect().top;
    el.classList.add('dragging');

    const onMove = e => {
      e.preventDefault();
      const t = e.touches[0];
      const canvas = document.getElementById('stickerCanvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      el.style.left = (t.clientX - rect.left - this._offsetX) + 'px';
      el.style.top = (t.clientY - rect.top - this._offsetY) + 'px';
    };

    const onEnd = e => {
      el.classList.remove('dragging');
      const canvas = document.getElementById('stickerCanvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = parseFloat(el.style.left);
        const y = parseFloat(el.style.top);
        this._savePosition(stickerId, x, y);
      }
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };

    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
  }

  _savePosition(stickerId, x, y) {
    const c = window.storage.getCustomize();
    const stickers = (c.stickers || []).map(s =>
      s.id === stickerId ? { ...s, x, y } : s
    );
    window.storage.saveCustomize({ stickers });
  }

  _deleteSticker(stickerId) {
    const c = window.storage.getCustomize();
    const stickers = (c.stickers || []).filter(s => s.id !== stickerId);
    window.storage.saveCustomize({ stickers });
    this._renderStickers();
    if (window.app) window.app.showToast('Sticker removed', 'info');
  }

  /* ---- Backup reminder ----------------------------------------------- */
  _checkBackupReminder() {
    if (window.storage.needsBackupReminder()) {
      const banner = document.getElementById('backupReminderBanner');
      if (banner) banner.style.display = '';
    }
  }
}

window.customizeManager = new CustomizeManager();
