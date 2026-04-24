#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const STAGING_NAME_PATTERN = /staging|dev/i;
const REQUIRED_REF_ENV = 'SUPABASE_PROJECT_REF_STAGING';

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function fail(message, details = []) {
  console.error(`staging-guard: BLOCKED - ${message}`);
  for (const detail of details) {
    console.error(`- ${detail}`);
  }
  process.exit(1);
}

function parseProjectsJson(rawOutput) {
  const clean = stripAnsi(rawOutput).trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    return null;
  }

  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}

function listProjects() {
  const result = spawnSync('supabase', ['projects', 'list', '--output', 'json'], {
    encoding: 'utf8',
    shell: false
  });

  if (result.error) {
    fail('could not execute Supabase CLI', [result.error.message]);
  }

  if (result.status !== 0) {
    fail('supabase projects list failed', [
      stripAnsi(result.stderr || result.stdout).trim() || `exit code ${result.status}`
    ]);
  }

  const projects = parseProjectsJson(result.stdout) || parseProjectsJson(result.stderr);
  if (!Array.isArray(projects)) {
    fail('could not parse supabase projects list output');
  }

  return projects.map((project) => ({
    ref: String(project.ref || project.id || '').trim(),
    name: String(project.name || '').trim()
  })).filter((project) => project.ref && project.name);
}

function runSupabase(args) {
  const result = spawnSync('supabase', args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    fail(`could not execute supabase ${args.join(' ')}`, [result.error.message]);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function usage() {
  return [
    'usage: node tools/supabase-staging-guard.mjs [--dry-run|--apply]',
    '',
    `required env: ${REQUIRED_REF_ENV}`,
    'policy: target project name must contain staging or dev'
  ].join('\n');
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');

if (args.includes('--help') || args.includes('-h')) {
  console.log(usage());
  process.exit(0);
}

if (dryRun && apply) {
  fail('choose only one mode: --dry-run or --apply');
}

const targetRef = String(process.env[REQUIRED_REF_ENV] || '').trim();
if (!targetRef) {
  fail(`missing ${REQUIRED_REF_ENV}`, [
    'Set it locally to the confirmed staging/dev project ref.',
    'Do not use production refs or commit this value.'
  ]);
}

const projects = listProjects();
const target = projects.find((project) => project.ref === targetRef);
const knownProjects = projects.map((project) => `${project.name} (${project.ref})`);

if (!target) {
  fail('target project ref was not found in supabase projects list', [
    `target ref: ${targetRef}`,
    `known projects: ${knownProjects.length ? knownProjects.join(', ') : 'none'}`
  ]);
}

if (!STAGING_NAME_PATTERN.test(target.name)) {
  fail('target project name does not confirm staging/dev', [
    `target name: ${target.name}`,
    `target ref: ${target.ref}`,
    'Rename/create a staging project whose name contains staging or dev before linking or pushing.'
  ]);
}

console.log(`staging-guard: PASS - confirmed ${target.name} (${target.ref})`);

if (dryRun || apply) {
  runSupabase(['link', '--project-ref', target.ref, '--workdir', '.']);
  runSupabase(['db', 'push', '--workdir', '.', ...(dryRun ? ['--dry-run'] : [])]);
}
