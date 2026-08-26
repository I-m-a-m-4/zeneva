import * as path from 'path';
import { scanFile } from './tmp-detector';
const ROOT = path.resolve(__dirname, '..');
for (const rel of process.argv.slice(2)) {
  const f = scanFile(path.join(ROOT, rel));
  console.log(`\n### ${rel}  (${f.length})`);
  for (const x of f) console.log(`  ${String(x.line).padStart(4)} [${x.kind}] ${x.text}`);
}
