window.APD14 = window.APD14 || {};

(function (NS) {
  const TYPE_TAGS = { document: '[DOC]', game: '[GAME]', link: '[LNK]', image: '[IMG]', audio: '[AUD]' };

  function typeTag(type) {
    return TYPE_TAGS[type] || '[DOC]';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markRedactions(html) {
    return html.replace(/\u2588{3,}/g, function (match) {
      return '<span class="redacted" title="[DATA EXPUNGED]">' + match + '</span>';
    });
  }

  function fallbackMarkdown(raw) {
    const blocks = raw.split(/\n{2,}/);
    return blocks.map(function (block) {
      const trimmed = block.trim();
      const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
      let inner;
      if (heading) {
        const level = heading[1].length;
        inner = escapeHtml(heading[2]);
        return '<h' + level + '>' + inner + '</h' + level + '>';
      }
      inner = escapeHtml(trimmed)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      return '<p>' + inner + '</p>';
    }).join('');
  }

  function mdToHtml(text) {
    const raw = text || '';
    let html;
    if (window.marked) {
      html = typeof window.marked.parse === 'function' ? window.marked.parse(raw) : window.marked(raw);
    } else {
      html = fallbackMarkdown(raw);
    }
    return markRedactions(html);
  }

  function clearanceBadge(level) {
    return '<span class="clearance-badge clearance-badge--' + level + '">L' + level + '</span>';
  }

  function el(id) {
    return document.getElementById(id);
  }

  function renderRows(container, rows) {
    container.innerHTML = '';
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nothing here yet.';
      container.appendChild(empty);
      return;
    }
    rows.forEach(function (row, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'listing-row' + (row.locked ? ' listing-row--locked' : '');
      btn.style.setProperty('--i', i);
      btn.innerHTML =
        '<span class="listing-row__tag">' + row.tag + '</span>' +
        '<span class="listing-row__title"><span class="t">' + escapeHtml(row.title) + '</span>' +
        (row.summary ? '<span class="summary">' + escapeHtml(row.summary) + '</span>' : '') +
        '</span>' +
        '<span class="listing-row__meta">' + escapeHtml(row.meta || '') + '</span>' +
        row.badgeHtml;
      btn.addEventListener('click', row.onClick);
      container.appendChild(btn);
    });
  }

  function renderBreadcrumb(dir, file) {
    const node = el('breadcrumb');
    let html = '<button type="button" data-nav="root">ROOT</button>';
    if (dir) {
      html += '<span class="sep">/</span>';
      if (file) {
        html += '<button type="button" data-nav="dir" data-folder="' + escapeHtml(dir.folder) + '">' + escapeHtml(dir.designation) + '</button>';
        html += '<span class="sep">/</span><span class="current">' + escapeHtml(file.title) + '</span>';
      } else {
        html += '<span class="current">' + escapeHtml(dir.designation) + '</span>';
      }
    }
    node.innerHTML = html;
    node.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.nav === 'root') NS.app.goRoot();
        else if (btn.dataset.nav === 'dir') NS.app.enterDirectory(NS.data.getDirectory(btn.dataset.folder));
      });
    });
  }

  function renderHub() {
    el('hub-title').hidden = false;
    el('hub-subtitle').hidden = false;
    el('dir-description').hidden = true;
    el('fileview').hidden = true;
    el('listing').hidden = false;

    renderBreadcrumb(null, null);

    const rows = NS.data.getDirectories().map(function (dir) {
      const vis = NS.data.directoryVisibility(dir);
      if (vis === 'hidden') {
        return {
          tag: '[DIR]',
          title: '[REDACTED DIRECTORY]',
          summary: 'Existence classified below Level ' + dir.minClearance + '.',
          meta: '',
          badgeHtml: clearanceBadge(dir.minClearance),
          locked: true,
          onClick: function () { NS.app.enterDirectory(dir); }
        };
      }
      return {
        tag: '[DIR]',
        title: dir.designation,
        summary: dir.description || '',
        meta: dir.fileCount + (dir.fileCount === 1 ? ' file' : ' files'),
        badgeHtml: clearanceBadge(dir.minClearance),
        locked: vis === 'named-locked',
        onClick: function () { NS.app.enterDirectory(dir); }
      };
    });

    renderRows(el('listing'), rows);
  }

  function renderDirectoryListing(dir) {
    el('hub-title').hidden = true;
    el('hub-subtitle').hidden = true;
    el('fileview').hidden = true;
    el('listing').hidden = false;

    const descEl = el('dir-description');
    if (dir.description) {
      descEl.hidden = false;
      descEl.textContent = dir.description;
    } else {
      descEl.hidden = true;
    }

    renderBreadcrumb(dir, null);

    const rows = dir.files.map(function (file) {
      return {
        tag: typeTag(file.type),
        title: file.title,
        summary: file.summary || '',
        meta: file.date || '',
        badgeHtml: clearanceBadge(file.clearanceLevel),
        locked: false,
        onClick: function () { NS.app.openFile(dir, file); }
      };
    });

    renderRows(el('listing'), rows);
  }

  function launchGame(file) {
    const btn = el('launch-btn');
    if (!btn) return;
    btn.disabled = true;
    let dots = 0;
    const iv = setInterval(function () {
      dots = (dots + 1) % 4;
      btn.textContent = 'LAUNCHING' + '.'.repeat(dots);
    }, 220);
    setTimeout(function () {
      clearInterval(iv);
      if (file.url) window.open(file.url, '_blank', 'noopener');
      btn.disabled = false;
      btn.textContent = 'LAUNCH';
    }, 900);
  }

  function renderFileView(dir, file) {
    el('hub-title').hidden = true;
    el('hub-subtitle').hidden = true;
    el('dir-description').hidden = true;
    el('listing').hidden = true;

    const view = el('fileview');
    view.hidden = false;

    renderBreadcrumb(dir, file);

    const metaBits = [];
    if (file.classification) metaBits.push('<div><b>Object Class</b><br>' + escapeHtml(file.classification) + '</div>');
    metaBits.push('<div><b>Clearance</b><br>' + escapeHtml(file.clearanceLabel) + '</div>');
    if (file.author) metaBits.push('<div><b>Filed by</b><br>' + escapeHtml(file.author) + '</div>');
    if (file.date) metaBits.push('<div><b>Date</b><br>' + escapeHtml(file.date) + '</div>');

    let bodyHtml;
    if (file.type === 'game') {
      bodyHtml =
        '<div class="game-card"><p>' + escapeHtml(file.summary || '') + '</p>' +
        '<button type="button" class="launch-btn" id="launch-btn">LAUNCH</button></div>';
    } else {
      bodyHtml = mdToHtml(file.body);
    }

    view.innerHTML =
      '<button type="button" class="back-link" id="fileview-back">\u2190 BACK</button>' +
      '<div class="fileview-header">' +
        '<div class="kicker">' + typeTag(file.type) + ' ' + escapeHtml(dir.designation) + '</div>' +
        '<h2>' + escapeHtml(file.title) + '</h2>' +
        (file.subtitle ? '<div class="subtitle">' + escapeHtml(file.subtitle) + '</div>' : '') +
        '<div class="meta-grid">' + metaBits.join('') + '</div>' +
      '</div>' +
      '<div class="fileview-body">' + bodyHtml + '</div>';

    el('fileview-back').addEventListener('click', function () {
      NS.app.enterDirectory(dir);
    });

    if (file.type === 'game') {
      el('launch-btn').addEventListener('click', function () { launchGame(file); });
    }

    el('terminal-main').scrollTop = 0;
  }

  function updateStatusBar() {
    const level = NS.data.getClearance();
    const chip = el('clearance-chip');
    chip.textContent = 'CLEARANCE: L' + level + ' (' + NS.data.clearanceLabel(level) + ')';
    chip.className = 'clearance-chip clearance-badge--' + level;

    const soundBtn = el('sound-toggle');
    if (soundBtn) soundBtn.textContent = NS.fx.isSoundEnabled() ? 'SOUND: ON' : 'SOUND: OFF';
  }

  function logLine(text, cls) {
    const log = el('cmdlog');
    const line = document.createElement('div');
    line.className = cls || '';
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 60) log.removeChild(log.firstChild);
  }

  function closeModal() {
    const root = el('modal-root');
    root.hidden = true;
    root.innerHTML = '';
  }

  function showModal(cfg) {
    const root = el('modal-root');
    const variant = cfg.variant || 'default';
    const boxClass = variant === 'danger' ? ' modal-box--danger' : variant === 'caution' ? ' modal-box--caution' : '';
    const titleClass = variant === 'danger' ? ' modal-title--danger' : variant === 'caution' ? ' modal-title--caution' : '';

    root.innerHTML =
      '<div class="modal-box' + boxClass + '" role="dialog" aria-modal="true">' +
        '<h2 class="modal-title' + titleClass + '">' + (cfg.icon || '') + ' ' + escapeHtml(cfg.title || '') + '</h2>' +
        '<div class="modal-body">' + (cfg.bodyHtml || '') + '</div>' +
        (cfg.showInput ? '<input class="modal-input" id="modal-input-field" placeholder="' + escapeHtml(cfg.inputPlaceholder || '') + '" autocomplete="off" />' : '') +
        (cfg.hint ? '<p class="modal-hint">' + escapeHtml(cfg.hint) + '</p>' : '') +
        '<div class="modal-actions" id="modal-actions"></div>' +
      '</div>';

    root.hidden = false;

    const actions = el('modal-actions');
    (cfg.buttons || []).forEach(function (btnCfg) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'modal-btn' + (btnCfg.variant ? ' modal-btn--' + btnCfg.variant : '');
      b.textContent = btnCfg.label;
      b.addEventListener('click', function () {
        const inputEl = el('modal-input-field');
        const value = inputEl ? inputEl.value : undefined;
        if (typeof btnCfg.onClick === 'function') btnCfg.onClick(value);
      });
      actions.appendChild(b);
    });

    root.onclick = function (e) {
      if (e.target === root && cfg.dismissible !== false) closeModal();
    };

    root.onkeydown = function (e) {
      if (e.key === 'Enter' && el('modal-input-field') === document.activeElement && cfg.buttons && cfg.buttons[0]) {
        cfg.buttons[cfg.buttons.length - 1].onClick(el('modal-input-field').value);
      }
    };

    requestAnimationFrame(function () {
      const inputEl = el('modal-input-field');
      if (inputEl) {
        inputEl.focus();
      } else {
        const firstBtn = actions.querySelector('.modal-btn');
        if (firstBtn) firstBtn.focus();
      }
    });
  }

  NS.ui = {
    renderHub,
    renderDirectoryListing,
    renderFileView,
    updateStatusBar,
    logLine,
    showModal,
    closeModal,
    escapeHtml
  };
})(window.APD14);
