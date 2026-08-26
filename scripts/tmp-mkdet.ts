import * as fs from 'fs';
import * as path from 'path';
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'scripts/check-i18n.ts'), 'utf8');
const head = src.slice(0, src.indexOf('// Assertion 0'));
fs.writeFileSync(path.join(ROOT, 'scripts/tmp-detector.ts'), head + '\nexport { scanFile };\n');
