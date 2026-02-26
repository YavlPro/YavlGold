import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'public', 'llms.txt');
const DIST = path.join(ROOT, 'dist', 'llms.txt');
const SENTINEL = '# EOF — YavlGold llms.txt (do not truncate)';

function checkFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file: ${filePath}`);
    }

    const text = fs.readFileSync(filePath, 'utf8');
    if (!text.includes(SENTINEL)) {
        throw new Error(`Sentinel missing in: ${filePath}`);
    }

    if (!text.endsWith('\n')) {
        throw new Error(`Missing trailing newline in: ${filePath}`);
    }

    if (text.trimEnd().endsWith('`')) {
        throw new Error(`Unexpected ending backtick in: ${filePath}`);
    }

    const lines = text.split('\n').length;
    if (lines < 20) {
        throw new Error(`Too few lines (${lines}) in: ${filePath}`);
    }
}

checkFile(SRC);
if (fs.existsSync(path.join(ROOT, 'dist'))) {
    checkFile(DIST);
}

console.log('check-llms: OK');
