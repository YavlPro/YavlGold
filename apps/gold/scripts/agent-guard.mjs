import fs from 'fs';
import path from 'path';

const banned = new Set([
  'react',
  'react-dom',
  'vue',
  'svelte',
  '@angular/core',
  'next',
  'nuxt',
  'astro'
].map((name) => name.toLowerCase()));

const depKeys = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

const root = process.cwd();
const targets = new Set();

targets.add(path.join(root, 'package.json'));
targets.add(path.join(root, 'apps', 'gold', 'package.json'));

const appsGoldDir = path.join(root, 'apps', 'gold');
if (fs.existsSync(appsGoldDir)) {
  const entries = fs.readdirSync(appsGoldDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(appsGoldDir, entry.name, 'package.json');
    if (fs.existsSync(pkgPath)) targets.add(pkgPath);
  }
}

const hits = [];

for (const file of targets) {
  if (!fs.existsSync(file)) continue;

  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`agent-guard: failed to parse ${file}: ${err.message}`);
    process.exit(1);
  }

  for (const key of depKeys) {
    const deps = json[key];
    if (!deps || typeof deps !== 'object') continue;

    for (const depName of Object.keys(deps)) {
      const depLower = depName.toLowerCase();
      if (banned.has(depLower)) {
        hits.push({ dep: depName, version: deps[depName], file });
      }
    }
  }
}

if (hits.length > 0) {
  for (const hit of hits) {
    console.error(`agent-guard: blocked dependency "${hit.dep}" (${hit.version}) in ${hit.file}`);
  }
  process.exit(1);
}

console.log('agent-guard: OK');
