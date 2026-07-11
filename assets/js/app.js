window.APD14 = window.APD14 || {};

(function (NS) {
  function el(id) {
    return document.getElementById(id);
  }

  function setHash(path) {
    history.pushState(null, '', '#' + path);
  }

  function logIncident() {
    const id = Math.floor(10000 + Math.random() * 89999);
    NS.ui.logLine('UNAUTHORIZED ACCESS LOGGED. Incident #' + id + ' recorded.', 'sys');
  }

  function goRoot() {
    setHash('/');
    NS.ui.renderHub();
  }

  function enterDirectory(dir) {
    if (!dir) {
      goRoot();
      return;
    }
    const vis = NS.data.directoryVisibility(dir);

    if (vis === 'open') {
      setHash('/' + dir.folder);
      NS.ui.renderDirectoryListing(dir);
      NS.fx.beep('open');
      return;
    }

    setHash('/');
    NS.ui.renderHub();

    if (vis === 'hidden') {
      NS.fx.beep('deny');
      NS.ui.showModal({
        variant: 'danger',
        icon: '\u26D4',
        title: 'ACCESS DENIED',
        bodyHtml:
          '<p>The existence of this directory is classified.</p>' +
          '<p class="clearance-line">REQUIRED CLEARANCE: <b>LEVEL ' + dir.minClearance + '</b></p>' +
          '<p>Raise your session clearance and try again.</p>',
        buttons: [{ label: 'ACKNOWLEDGE', variant: 'danger', onClick: function () { NS.ui.closeModal(); } }]
      });
      return;
    }

    NS.fx.beep('deny');
    NS.ui.showModal({
      variant: 'caution',
      icon: '\u26A0',
      title: 'RESTRICTED ACCESS',
      bodyHtml:
        '<p>DIRECTORY: <b>' + NS.ui.escapeHtml(dir.designation) + '</b></p>' +
        '<p class="clearance-line">REQUIRED CLEARANCE: <b>LEVEL ' + dir.minClearance +
        '</b> &middot; YOUR CLEARANCE: <b>LEVEL ' + NS.data.getClearance() + '</b></p>' +
        '<p>Unauthorized access is a violation of Foundation Protocol 14-B. Attempts are logged.</p>',
      buttons: [
        { label: 'ABORT', variant: 'ghost', onClick: function () { NS.ui.closeModal(); } },
        {
          label: 'ENTER ANYWAY',
          variant: 'danger',
          onClick: function () {
            NS.ui.closeModal();
            logIncident();
            setHash('/' + dir.folder);
            NS.ui.renderDirectoryListing(dir);
            NS.fx.beep('confirm');
          }
        }
      ]
    });
  }

  function openFile(dir, file) {
    const access = NS.data.fileAccess(file);

    if (access === 'granted') {
      setHash('/' + dir.folder + '/' + file.id);
      NS.ui.renderFileView(dir, file);
      NS.fx.beep('open');
      return;
    }

    setHash('/' + dir.folder);
    NS.ui.renderDirectoryListing(dir);

    if (access === 'deny') {
      NS.fx.beep('deny');
      NS.ui.showModal({
        variant: 'danger',
        icon: '\u26D4',
        title: 'ACCESS DENIED',
        bodyHtml:
          '<p>FILE: <b>' + NS.ui.escapeHtml(file.title) + '</b></p>' +
          '<p class="clearance-line">REQUIRED CLEARANCE: <b>LEVEL ' + file.clearanceLevel +
          ' (' + NS.ui.escapeHtml(file.clearanceLabel) + ')</b></p>' +
          '<p>This file cannot be overridden. Contact O5 Command for authorization.</p>',
        buttons: [{ label: 'ACKNOWLEDGE', variant: 'danger', onClick: function () { NS.ui.closeModal(); } }]
      });
      return;
    }

    NS.fx.beep('deny');
    NS.ui.showModal({
      variant: 'caution',
      icon: '\u26A0',
      title: 'RESTRICTED FILE',
      bodyHtml:
        '<p>FILE: <b>' + NS.ui.escapeHtml(file.title) + '</b></p>' +
        '<p class="clearance-line">REQUIRED CLEARANCE: <b>LEVEL ' + file.clearanceLevel +
        ' (' + NS.ui.escapeHtml(file.clearanceLabel) + ')</b> &middot; YOUR CLEARANCE: <b>LEVEL ' +
        NS.data.getClearance() + '</b></p>' +
        '<p>Unauthorized access to this file is a violation of Foundation Protocol 14-B. Attempts will be logged.</p>',
      buttons: [
        { label: 'ABORT', variant: 'ghost', onClick: function () { NS.ui.closeModal(); } },
        {
          label: 'ATTEMPT OVERRIDE',
          variant: 'danger',
          onClick: function () {
            NS.ui.closeModal();
            logIncident();
            setHash('/' + dir.folder + '/' + file.id);
            NS.ui.renderFileView(dir, file);
            NS.fx.beep('confirm');
          }
        }
      ]
    });
  }

  function applyClearanceCode(raw) {
    const level = raw === '' || raw == null ? 0 : NS.data.resolveClearanceCode(raw);
    if (level === null) {
      NS.ui.logLine('Unrecognized clearance code.', 'sys');
      NS.fx.beep('deny');
      return;
    }
    NS.data.setClearance(level);
    NS.ui.updateStatusBar();
    NS.ui.closeModal();
    NS.ui.logLine('Session clearance set to LEVEL ' + level + ' (' + NS.data.clearanceLabel(level) + ').', 'sys');
    NS.fx.beep('confirm');
    routeFromHash();
  }

  function promptClearance() {
    NS.ui.showModal({
      variant: 'default',
      icon: '\u25B6',
      title: 'AUTHENTICATE',
      bodyHtml: '<p>Enter a clearance code (0-5), or leave blank for Level 0.</p>',
      showInput: true,
      inputPlaceholder: 'clearance code',
      buttons: [
        { label: 'CANCEL', variant: 'ghost', onClick: function () { NS.ui.closeModal(); } },
        { label: 'SUBMIT', variant: 'default', onClick: function (value) { applyClearanceCode(value); } }
      ]
    });
  }

  function parseHash() {
    return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  }

  function routeFromHash() {
    const parts = parseHash();
    if (parts.length === 0) {
      NS.ui.renderHub();
      return;
    }
    const dir = NS.data.getDirectory(parts[0]);
    if (!dir) {
      goRoot();
      return;
    }
    if (parts.length === 1) {
      enterDirectory(dir);
      return;
    }
    const file = NS.data.getFile(parts[0], parts[1]);
    if (!file) {
      enterDirectory(dir);
      return;
    }
    openFile(dir, file);
  }

  function showApp() {
    el('intro').hidden = true;
    const app = el('app');
    app.hidden = false;
    app.classList.remove('view-fade-in');
    void app.offsetWidth;
    app.classList.add('view-fade-in');
  }

  function runReboot() {
    NS.ui.logLine('rebooting terminal...', 'sys');
    NS.intro.run(function () {
      showApp();
      goRoot();
    });
  }

  function updateClock() {
    const clockEl = el('status-clock');
    if (!clockEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = h + ':' + m + ':' + s;
  }

  function wireGlobalControls() {
    el('reboot-btn').addEventListener('click', runReboot);
    el('clearance-chip').addEventListener('click', promptClearance);
    el('sound-toggle').addEventListener('click', function () {
      NS.fx.setSoundEnabled(!NS.fx.isSoundEnabled());
      NS.ui.updateStatusBar();
    });

    const input = el('cmd-input');
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      const raw = input.value;
      input.value = '';
      if (raw.trim() === '') return;
      NS.ui.logLine('APD14> ' + raw, 'echo');
      NS.commands.run(raw);
    });

    document.addEventListener('keydown', function (e) {
      if (document.activeElement === input) return;
      if (!el('modal-root').hidden) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const rows = Array.prototype.slice.call(document.querySelectorAll('.listing-row'));
      if (rows.length === 0) return;
      e.preventDefault();
      const idx = rows.indexOf(document.activeElement);
      const nextIdx = e.key === 'ArrowDown' ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx - 1);
      rows[nextIdx].focus();
      NS.fx.beep('move');
    });

    window.addEventListener('popstate', routeFromHash);
    setInterval(updateClock, 1000);
    updateClock();
  }

  async function boot() {
    try {
      await NS.data.loadManifest();
    } catch (err) {
      el('hub-title').textContent = 'ARCHIVE OFFLINE';
      el('hub-subtitle').textContent = 'Could not load assets/data/manifest.json -- run "node scripts/build-manifest.js" and serve over http, not file://.';
    }
    wireGlobalControls();
    NS.ui.updateStatusBar();
    NS.intro.run(function () {
      showApp();
      routeFromHash();
    });
  }

  NS.app = { goRoot, enterDirectory, openFile, promptClearance };

  document.addEventListener('DOMContentLoaded', boot);
})(window.APD14);
