const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  '.vercel',
  'netlify',
]);

const MARKER_PATTERN = /^(<<<<<<< |=======|>>>>>>> )/m;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (entry.name.startsWith('.')) {
      // Skip hidden folders except files at the root level.
      if (entry.isDirectory()) return [];
    }

    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
      return [];
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return [fullPath];
  });
}

function collectConflicts(files) {
  const conflicts = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    const flagged = lines
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => MARKER_PATTERN.test(line));

    if (flagged.length > 0) {
      conflicts.push({ file, lines: flagged.map((l) => l.number) });
    }
  }
  return conflicts;
}

function main() {
  const files = walk(process.cwd());
  const conflicts = collectConflicts(files);

  if (conflicts.length === 0) {
    console.log('No se encontraron marcadores de conflicto.');
    return;
  }

  console.error('Se detectaron posibles marcadores de conflicto de merge:');
  conflicts.forEach(({ file, lines }) => {
    console.error(`- ${file}: líneas ${lines.join(', ')}`);
  });
  process.exitCode = 1;
}

main();
