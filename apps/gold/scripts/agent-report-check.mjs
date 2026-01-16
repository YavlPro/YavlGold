import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const reportCandidates = [
  path.join(cwd, 'docs', 'AGENT_REPORT.md'),
  path.join(cwd, 'apps', 'gold', 'docs', 'AGENT_REPORT.md')
];
const reportPath = reportCandidates.find((p) => fs.existsSync(p));
const errorMessage = 'Falta AGENT_REPORT.md con Diagn\u00f3stico y Plan';
const minLines = 30;

if (!reportPath) {
  console.error(errorMessage);
  process.exit(1);
}

const content = fs.readFileSync(reportPath, 'utf8');
const normalized = content
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const hasDiagnostico = normalized.includes('diagnostico');
const hasPlan = normalized.includes('plan');
const lineCount = content.split(/\r?\n/).length;

if (!hasDiagnostico || !hasPlan || lineCount < minLines) {
  console.error(errorMessage);
  process.exit(1);
}

console.log('agent-report-check: OK');
