window.APD14 = window.APD14 || {};

(function (NS) {
  function currentPathParts() {
    return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  }

  function printHelp() {
    [
      'help                 show this list',
      'ls                   list current directory',
      'cd <name>            enter a directory (cd .. to go back)',
      'open <name>          open a file in the current directory',
      'back                 go up one level',
      'clearance [code]     view or change your session clearance',
      'whoami               show current clearance',
      'reboot               replay the boot sequence',
      'clear                clear this log'
    ].forEach(function (l) {
      NS.ui.logLine(l, 'sys');
    });
  }

  function findDirectoryByName(query) {
    const q = query.trim().toLowerCase();
    return NS.data.getDirectories().find(function (d) {
      return d.folder.toLowerCase() === q || d.designation.toLowerCase().indexOf(q) !== -1;
    }) || null;
  }

  function findFileInDirectory(dir, query) {
    const q = query.trim().toLowerCase();
    return dir.files.find(function (f) {
      return f.id.toLowerCase() === q || f.title.toLowerCase().indexOf(q) !== -1;
    }) || null;
  }

  function run(raw) {
    const trimmed = raw.trim();
    const segments = trimmed.split(/\s+/);
    const cmd = (segments.shift() || '').toLowerCase();
    const arg = segments.join(' ');
    const parts = currentPathParts();

    if (cmd === 'help') {
      printHelp();
      return;
    }

    if (cmd === 'ls') {
      if (parts.length === 0) {
        NS.data.getDirectories().forEach(function (d) { NS.ui.logLine(d.folder, 'sys'); });
      } else {
        const dir = NS.data.getDirectory(parts[0]);
        if (dir) dir.files.forEach(function (f) { NS.ui.logLine(f.id, 'sys'); });
      }
      return;
    }

    if (cmd === 'cd') {
      if (!arg || arg === '..' || arg === '/') {
        NS.app.goRoot();
        return;
      }
      const dir = findDirectoryByName(arg);
      if (!dir) {
        NS.ui.logLine('No such directory: ' + arg, 'sys');
        return;
      }
      NS.app.enterDirectory(dir);
      return;
    }

    if (cmd === 'open') {
      if (parts.length === 0) {
        NS.ui.logLine('Enter a directory first.', 'sys');
        return;
      }
      const dir = NS.data.getDirectory(parts[0]);
      if (!dir) {
        NS.ui.logLine('Enter a directory first.', 'sys');
        return;
      }
      const file = findFileInDirectory(dir, arg);
      if (!file) {
        NS.ui.logLine('No such file: ' + arg, 'sys');
        return;
      }
      NS.app.openFile(dir, file);
      return;
    }

    if (cmd === 'back') {
      if (parts.length >= 2) {
        NS.app.enterDirectory(NS.data.getDirectory(parts[0]));
      } else {
        NS.app.goRoot();
      }
      return;
    }

    if (cmd === 'clearance') {
      if (!arg) {
        NS.ui.logLine('Current clearance: LEVEL ' + NS.data.getClearance() + ' (' + NS.data.clearanceLabel(NS.data.getClearance()) + ')', 'sys');
      } else {
        NS.app.promptClearance();
      }
      return;
    }

    if (cmd === 'whoami') {
      NS.ui.logLine('LEVEL ' + NS.data.getClearance() + ' (' + NS.data.clearanceLabel(NS.data.getClearance()) + ')', 'sys');
      return;
    }

    if (cmd === 'reboot') {
      const btn = document.getElementById('reboot-btn');
      if (btn) btn.click();
      return;
    }

    if (cmd === 'clear') {
      const log = document.getElementById('cmdlog');
      if (log) log.innerHTML = '';
      return;
    }

    NS.ui.logLine('Unknown command: ' + cmd + ' (try "help")', 'sys');
  }

  NS.commands = { run };
})(window.APD14);
