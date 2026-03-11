/* ================================================================
   custom-select.js  —  iOS / macOS style frosted-glass dropdown
   Intercepts all <select> elements (including dynamically added)
   and replaces them with a smooth overlay picker.
   ================================================================ */
(function () {
  'use strict';

  /* ── DOM helpers ── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const make = (tag, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; return el; };

  /* ── Singleton overlay nodes ── */
  let backdrop = null;
  let panel    = null;
  let titleEl  = null;
  let listEl   = null;
  let activeSelect = null;

  /* ── Build overlay once ── */
  function buildOverlay() {
    if (backdrop) return;

    /* Backdrop */
    backdrop = make('div', 'csd-backdrop');
    backdrop.addEventListener('click', closeDropdown);

    /* Panel */
    panel = make('div', 'csd-panel');
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-modal', 'true');

    /* Panel header */
    const header = make('div', 'csd-header');
    titleEl = make('span', 'csd-title');
    const closeBtn = make('button', 'csd-close');
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.setAttribute('aria-label', 'ปิด');
    closeBtn.addEventListener('click', closeDropdown);
    header.append(titleEl, closeBtn);

    /* Options list */
    listEl = make('div', 'csd-list');

    panel.append(header, listEl);
    document.body.append(backdrop, panel);
  }

  /* ── Position panel near the trigger element ── */
  function positionPanel(trigger) {
    // On mobile: CSS handles bottom-sheet positioning
    if (window.innerWidth <= 600) return;

    const rect    = trigger.getBoundingClientRect();
    const vw      = window.innerWidth;
    const vh      = window.innerHeight;
    const GAP     = 6;
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Match panel width exactly to trigger width
    const panelW  = Math.min(Math.max(rect.width, 220), 460);
    const panelH  = Math.min(vh * 0.72, 480);
    const opensUp = rect.bottom + GAP + panelH > vh;

    // panel is position:absolute inside body (static) = relative to document
    // getBoundingClientRect gives viewport coords → add scroll to get doc coords
    let top  = opensUp
      ? rect.top    + scrollY - panelH - GAP
      : rect.bottom + scrollY + GAP;

    // Align left with trigger, then clamp to stay inside viewport
    let leftVP = rect.left;
    if (leftVP + panelW > vw - 8) leftVP = vw - panelW - 8;
    if (leftVP < 8)                leftVP = 8;
    const left = leftVP + scrollX;

    panel.style.width           = panelW + 'px';
    panel.style.top             = top    + 'px';
    panel.style.left            = left   + 'px';
    panel.style.bottom          = '';
    panel.style.right           = '';
    panel.style.transformOrigin = opensUp ? 'bottom center' : 'top center';
  }

  /* ── Get human-readable label for a select ── */
  function getSelectLabel(sel) {
    const lbl = document.querySelector(`label[for="${sel.id}"]`);
    if (lbl) return lbl.textContent.trim().replace(/:$/, '');
    const parent = sel.closest('.form-group');
    if (parent) {
      const l = parent.querySelector('label');
      if (l) return l.textContent.trim().replace(/:$/, '');
    }
    return 'เลือก';
  }

  /* ── Build the options list ── */
  function buildList(sel) {
    listEl.innerHTML = '';
    const options    = Array.from(sel.options);
    let   lastGroup  = null;
    let   firstItem  = true;

    options.forEach((opt, idx) => {
      const group = opt.closest('optgroup');
      const groupLabel = group ? group.label : '';

      // Group header
      if (groupLabel && groupLabel !== lastGroup) {
        if (!firstItem) {
          const sep = make('div', 'csd-sep');
          listEl.append(sep);
        }
        const gh = make('div', 'csd-group');
        gh.textContent = groupLabel;
        listEl.append(gh);
        lastGroup = groupLabel;
      }

      // Option row
      const row = make('div', 'csd-option');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
      row.dataset.index = idx;
      row.dataset.value = opt.value;

      if (opt.disabled || (idx === 0 && opt.value === '')) {
        row.classList.add('csd-placeholder');
        if (opt.disabled && opt.value !== '') row.style.opacity = '0.4';
      }
      if (opt.selected) row.classList.add('csd-selected');

      row.textContent = opt.text;

      row.addEventListener('click', () => {
        if (opt.disabled && idx !== 0) return;
        selectOption(sel, idx);
      });

      // Hover highlight for keyboard-style feel
      row.addEventListener('mouseenter', () => {
        row.style.background = '';
      });

      listEl.append(row);
      firstItem = false;
    });
  }

  /* ── Select an option and close ── */
  function selectOption(sel, idx) {
    sel.selectedIndex = idx;

    // Fire both input and change so script.js picks it up
    sel.dispatchEvent(new Event('input',  { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));

    closeDropdown();
  }

  /* ── Open the dropdown ── */
  function openDropdown(sel) {
    buildOverlay();

    if (activeSelect && activeSelect !== sel) {
      activeSelect.classList.remove('csd-open');
    }
    activeSelect = sel;
    sel.classList.add('csd-open');

    titleEl.textContent = getSelectLabel(sel);
    buildList(sel);
    positionPanel(sel);

    // Force reflow before adding .csd-visible so transition fires
    backdrop.classList.add('csd-visible');
    panel.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add('csd-visible');
      });
    });

    // Scroll selected option into view
    const selectedRow = listEl.querySelector('.csd-selected');
    if (selectedRow) {
      setTimeout(() => selectedRow.scrollIntoView({ block: 'nearest' }), 80);
    }

    // Escape key
    document.addEventListener('keydown', onKeydown);
  }

  /* ── Close the dropdown ── */
  function closeDropdown() {
    if (!backdrop) return;

    backdrop.classList.remove('csd-visible');
    panel.classList.remove('csd-visible');

    if (activeSelect) {
      activeSelect.classList.remove('csd-open');
      activeSelect = null;
    }

    document.removeEventListener('keydown', onKeydown);

    // Hide after transition
    setTimeout(() => {
      if (!panel.classList.contains('csd-visible')) {
        panel.style.display = 'none';
      }
    }, 320);
  }

  /* ── Keyboard handler ── */
  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDropdown(); }
    if ((e.key === 'Enter' || e.key === ' ') && activeSelect) {
      const focused = listEl.querySelector('.csd-focus');
      if (focused) {
        e.preventDefault();
        selectOption(activeSelect, parseInt(focused.dataset.index, 10));
      }
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateOptions(e.key === 'ArrowDown' ? 1 : -1);
    }
  }

  /* ── Arrow-key navigation ── */
  function navigateOptions(dir) {
    const rows = Array.from(listEl.querySelectorAll('.csd-option:not(.csd-placeholder)'));
    const cur  = listEl.querySelector('.csd-focus');
    let   idx  = cur ? rows.indexOf(cur) : -1;
    if (cur) cur.classList.remove('csd-focus');

    idx = Math.max(0, Math.min(rows.length - 1, idx + dir));
    const next = rows[idx];
    if (next) {
      next.classList.add('csd-focus');
      next.scrollIntoView({ block: 'nearest' });
    }
  }

  /* ── Intercept mousedown on any <select> ── */
  function handleSelectMousedown(e) {
    const sel = e.target.closest('select');
    if (!sel) return;

    // Don't intercept if select is inside the custom panel itself
    if (panel && panel.contains(sel)) return;

    e.preventDefault();
    e.stopPropagation();

    if (activeSelect === sel && panel && panel.classList.contains('csd-visible')) {
      closeDropdown();
    } else {
      openDropdown(sel);
    }
  }

  /* ── Watch for dynamically added selects (script.js adds cards) ── */
  function refreshSelectListeners() {
    // Event delegation handles all selects — no per-element binding needed
  }

  /* ── Init: use capture-phase delegation so we catch all selects ── */
  function init() {
    document.addEventListener('mousedown', handleSelectMousedown, true);
    document.addEventListener('touchstart', handleSelectMousedown, { capture: true, passive: false });

    // Prevent native dropdown from showing via keyboard on focused selects
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName !== 'SELECT') return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!activeSelect) openDropdown(e.target);
      }
    }, true);

    // Re-position on resize; close on scroll (absolute panel moves with page)
    window.addEventListener('resize', () => { if (activeSelect) positionPanel(activeSelect); });
    window.addEventListener('scroll', () => { if (activeSelect) closeDropdown(); }, { passive: true });
  }

  /* ── Wait for DOM ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();