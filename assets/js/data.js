window.APD14 = window.APD14 || {};

(function (NS) {
  const CLEARANCE_LABELS = {
    0: 'UNRESTRICTED',
    1: 'RESTRICTED',
    2: 'CONFIDENTIAL',
    3: 'SECRET',
    4: 'TOP SECRET',
    5: 'COSMIC TOP SECRET'
  };

  const CLEARANCE_CODES = {
    '0': 0, 'visitor': 0, 'guest': 0, 'unrestricted': 0,
    '1': 1, 'restricted': 1,
    '2': 2, 'confidential': 2,
    '3': 3, 'secret': 3,
    '4': 4, 'topsecret': 4, 'top-secret': 4,
    '5': 5, 'o5': 5, 'overseer': 5, 'cosmic': 5
  };

  const state = {
    manifest: null,
    dirIndex: new Map(),
    fileIndex: new Map(),
    clearance: 0,
    path: []
  };

  function readStoredClearance() {
    try {
      const v = sessionStorage.getItem('apd14_clearance');
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0;
    } catch (err) {
      return 0;
    }
  }

  function storeClearance(level) {
    try {
      sessionStorage.setItem('apd14_clearance', String(level));
    } catch (err) {
      return;
    }
  }

  async function loadManifest() {
    const res = await fetch('assets/data/manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest fetch failed: ' + res.status);
    const manifest = await res.json();
    state.manifest = manifest;
    state.dirIndex = new Map();
    state.fileIndex = new Map();
    for (const dir of manifest.directories) {
      state.dirIndex.set(dir.folder, dir);
      const fmap = new Map();
      for (const file of dir.files) fmap.set(file.id, file);
      state.fileIndex.set(dir.folder, fmap);
    }
    state.clearance = readStoredClearance();
    return manifest;
  }

  function getDirectories() {
    return state.manifest ? state.manifest.directories : [];
  }

  function getDirectory(folder) {
    return state.dirIndex.get(folder) || null;
  }

  function getFile(folder, fileId) {
    const fmap = state.fileIndex.get(folder);
    return fmap ? (fmap.get(fileId) || null) : null;
  }

  function getClearance() {
    return state.clearance;
  }

  function setClearance(level) {
    const n = Math.min(5, Math.max(0, level | 0));
    state.clearance = n;
    storeClearance(n);
    return n;
  }

  function resolveClearanceCode(raw) {
    const key = String(raw || '').trim().toLowerCase();
    if (key in CLEARANCE_CODES) return CLEARANCE_CODES[key];
    return null;
  }

  function clearanceLabel(level) {
    return CLEARANCE_LABELS[level] || CLEARANCE_LABELS[0];
  }

  function directoryVisibility(dir) {
    const c = state.clearance;
    if (dir.minClearance <= c) return 'open';
    if (dir.minClearance >= 4) return 'hidden';
    return 'named-locked';
  }

  function fileAccess(file) {
    const c = state.clearance;
    if (file.clearanceLevel <= c) return 'granted';
    return file.overridable ? 'warn' : 'deny';
  }

  NS.data = {
    loadManifest,
    getDirectories,
    getDirectory,
    getFile,
    getClearance,
    setClearance,
    resolveClearanceCode,
    clearanceLabel,
    directoryVisibility,
    fileAccess,
    CLEARANCE_LABELS
  };
})(window.APD14);
