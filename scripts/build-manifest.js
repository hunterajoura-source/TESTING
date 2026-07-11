const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRECTORIES_PATH = path.join(ROOT, 'Directories');
const OUTPUT_PATH = path.join(ROOT, 'assets', 'data', 'manifest.json');
const SITE_NAME = 'S.C.P FOUNDATION: APD-14';

const VALID_TYPES = ['document', 'game', 'link', 'audio', 'image'];
const CLEARANCE_LABELS = {
  0: 'UNRESTRICTED',
  1: 'RESTRICTED',
  2: 'CONFIDENTIAL',
  3: 'SECRET',
  4: 'TOP SECRET',
  5: 'COSMIC TOP SECRET'
};

let warnings = 0;

function warn(msg) {
  warnings += 1;
  console.warn(`  \u26A0  ${msg}`);
}

function readJSON(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    warn(`Could not parse JSON in ${path.relative(ROOT, filePath)}: ${err.message}`);
    return null;
  }
}

function titleCaseFromSlug(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function clampClearance(value) {
  const n = Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(5, Math.max(0, n));
}

function defaultDirectoryMeta(folderName) {
  return {
    id: folderName,
    designation: titleCaseFromSlug(folderName).toUpperCase(),
    description: '',
    minClearance: 0,
    order: 999
  };
}

function normalizeDirectoryMeta(meta, folderName) {
  const base = defaultDirectoryMeta(folderName);
  const merged = Object.assign({}, base, meta || {});
  merged.id = merged.id || folderName;
  merged.minClearance = clampClearance(merged.minClearance);
  merged.minClearanceLabel = CLEARANCE_LABELS[merged.minClearance];
  merged.order = Number.isFinite(merged.order) ? merged.order : 999;
  return merged;
}

function normalizeFileEntry(data, fileName, folderName) {
  if (!data || typeof data !== 'object') {
    warn(`Skipping ${folderName}/${fileName}: file does not contain a JSON object.`);
    return null;
  }

  const fallbackId = fileName.replace(/\.json$/i, '');
  const type = VALID_TYPES.includes(data.type) ? data.type : 'document';
  if (!VALID_TYPES.includes(data.type)) {
    warn(`${folderName}/${fileName}: unknown or missing "type", defaulting to "document".`);
  }

  if (!data.title) {
    warn(`${folderName}/${fileName}: missing "title", using file name instead.`);
  }

  const clearanceLevel = clampClearance(data.clearanceLevel);

  return {
    id: data.id || fallbackId,
    file: fileName,
    type,
    title: data.title || titleCaseFromSlug(fallbackId),
    subtitle: data.subtitle || '',
    classification: data.classification || '',
    clearanceLevel,
    clearanceLabel: data.clearanceLabel || CLEARANCE_LABELS[clearanceLevel],
    overridable: data.overridable !== false,
    tags: Array.isArray(data.tags) ? data.tags : [],
    date: data.date || '',
    author: data.author || '',
    summary: data.summary || '',
    body: data.body || '',
    url: data.url || '',
    order: Number.isFinite(data.order) ? data.order : 999
  };
}

function build() {
  console.log(`Building manifest for ${SITE_NAME}...`);

  if (!fs.existsSync(DIRECTORIES_PATH)) {
    warn(`No /Directories folder found -- creating an empty one.`);
    fs.mkdirSync(DIRECTORIES_PATH, { recursive: true });
  }

  const entries = fs.readdirSync(DIRECTORIES_PATH, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory());

  const directories = folders.map((folderDirent) => {
    const folderName = folderDirent.name;
    const folderPath = path.join(DIRECTORIES_PATH, folderName);

    const metaRaw = readJSON(path.join(folderPath, '_directory.json'));
    const meta = normalizeDirectoryMeta(metaRaw, folderName);

    const fileNames = fs
      .readdirSync(folderPath)
      .filter((f) => f.endsWith('.json') && f !== '_directory.json');

    const files = fileNames
      .map((fileName) => normalizeFileEntry(readJSON(path.join(folderPath, fileName)), fileName, folderName))
      .filter(Boolean)
      .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));

    if (files.length === 0) {
      warn(`Directory "${folderName}" has no valid files inside it yet.`);
    }

    return Object.assign({ folder: folderName, fileCount: files.length, files }, meta);
  }).sort((a, b) => (a.order - b.order) || a.designation.localeCompare(b.designation));

  const manifest = {
    siteName: SITE_NAME,
    generatedAt: new Date().toISOString(),
    directoryCount: directories.length,
    fileCount: directories.reduce((sum, d) => sum + d.fileCount, 0),
    directories
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`Done. ${manifest.directoryCount} director${manifest.directoryCount === 1 ? 'y' : 'ies'}, ${manifest.fileCount} file(s).`);
  if (warnings > 0) {
    console.log(`(${warnings} warning${warnings === 1 ? '' : 's'} above -- build still succeeded.)`);
  }
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

build();
