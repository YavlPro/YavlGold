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

const cwd = process.cwd();
const goldRoot = fs.existsSync(path.join(cwd, 'apps', 'gold', 'package.json'))
  ? path.join(cwd, 'apps', 'gold')
  : cwd;
const repoRoot = path.basename(goldRoot) === 'gold' && path.basename(path.dirname(goldRoot)) === 'apps'
  ? path.resolve(goldRoot, '..', '..')
  : cwd;

const targets = new Set();

targets.add(path.join(repoRoot, 'package.json'));
targets.add(path.join(goldRoot, 'package.json'));

const appsGoldDir = goldRoot;
if (fs.existsSync(appsGoldDir)) {
  const entries = fs.readdirSync(appsGoldDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(appsGoldDir, entry.name, 'package.json');
    if (fs.existsSync(pkgPath)) targets.add(pkgPath);
  }
}

const hits = [];
const htmlHits = [];

const htmlRules = [
  {
    label: 'Tailwind CDN',
    pattern: /cdn\.tailwindcss\.com/i
  },
  {
    label: 'non-canonical font Montserrat',
    pattern: /Montserrat/i
  },
  {
    label: 'floating external dependency @latest',
    pattern: /https?:\/\/[^"'<>\\\s]+@latest\b/i
  }
];

function toRelative(file) {
  return path.relative(repoRoot, file).replaceAll(path.sep, '/');
}

function getActiveHtmlEntries() {
  const viteConfigPath = path.join(goldRoot, 'vite.config.js');
  if (!fs.existsSync(viteConfigPath)) return [];

  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  const entries = new Set();
  const htmlPathPattern = /['"`]([^'"`]+\.html)['"`]/g;
  let match;

  while ((match = htmlPathPattern.exec(viteConfig)) !== null) {
    entries.add(path.resolve(goldRoot, match[1]));
  }

  return Array.from(entries);
}

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

for (const file of getActiveHtmlEntries()) {
  if (!fs.existsSync(file)) continue;

  const html = fs.readFileSync(file, 'utf8');
  for (const rule of htmlRules) {
    const match = html.match(rule.pattern);
    if (match) {
      htmlHits.push({
        rule: rule.label,
        match: match[0],
        file
      });
    }
  }
}

if (hits.length > 0 || htmlHits.length > 0) {
  for (const hit of hits) {
    console.error(`agent-guard: blocked dependency "${hit.dep}" (${hit.version}) in ${hit.file}`);
  }
  for (const hit of htmlHits) {
    console.error(`agent-guard: blocked HTML "${hit.rule}" (${hit.match}) in ${toRelative(hit.file)}`);
  }
  process.exit(1);
}

console.log('agent-guard: OK');
