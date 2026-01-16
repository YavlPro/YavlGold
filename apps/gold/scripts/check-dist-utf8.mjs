#!/usr/bin/env node
/**
 * YavlGold Build Guardrail: UTF-8 Verification
 * Fails the build if dist/index.html contains corrupted characters (0x3F = ?)
 * Run: node scripts/check-dist-utf8.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// dist is sibling to scripts folder
const DIST_INDEX = join(__dirname, '..', 'dist', 'index.html');

// Patterns that indicate UTF-8 corruption (? = 0x3F)
const CORRUPTION_PATTERNS = [
    'Gesti??n',
    'agr??cola',
    'tecnolog??a',
    'educaci??n'
];

// Expected correct patterns (UTF-8)
const EXPECTED_PATTERNS = [
    'Gestión',
    'agrícola',
    'tecnología'
];

function main() {
    console.log('🔍 YavlGold UTF-8 Guardrail Check');
    console.log('================================');
    console.log('Checking:', DIST_INDEX);

    if (!existsSync(DIST_INDEX)) {
        console.error('❌ ERROR: dist/index.html not found');
        process.exit(1);
    }

    const buffer = readFileSync(DIST_INDEX);
    const content = buffer.toString('utf8');

    let hasCorruption = false;

    // Check for corruption patterns
    for (const pattern of CORRUPTION_PATTERNS) {
        if (content.includes(pattern)) {
            console.error('❌ CORRUPTION: Found "' + pattern + '"');
            hasCorruption = true;
        }
    }

    // Verify expected patterns exist
    for (const pattern of EXPECTED_PATTERNS) {
        if (content.includes(pattern)) {
            console.log('✅ Found: "' + pattern + '"');
        }
    }

    // Byte-level check for 0x3F 0x3F sequence near "Gesti"
    const gestiIndex = content.indexOf('Gesti');
    if (gestiIndex > -1) {
        const slice = buffer.slice(gestiIndex, gestiIndex + 20);
        const hex = slice.toString('hex');

        if (hex.includes('3f3f')) {
            console.error('❌ BYTE CORRUPTION: 0x3F3F near "Gesti"');
            hasCorruption = true;
        } else if (hex.includes('c3b3')) {
            console.log('✅ Bytes OK (c3b3 = ó)');
        }
    }

    console.log('--------------------------------');

    if (hasCorruption) {
        console.error('❌ BUILD FAILED: UTF-8 corruption');
        process.exit(1);
    }

    console.log('✅ UTF-8 verification passed!');
    process.exit(0);
}

main();
