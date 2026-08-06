import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
    } else if (file.endsWith('route.ts') || file.endsWith('route.js')) { 
        results.push(file);
    }
  });
  return results;
}

const apiFiles = walk(path.join(process.cwd(), 'src/app/api'));

apiFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Comment out existing dynamic exports to avoid duplicate declarations
  if (content.match(/^export const dynamic\s*=/m)) {
    content = content.replace(/^(export const dynamic\s*=.*)$/gm, '// [TAURI_HIDDEN] $1');
    modified = true;
  }

  // Inject literal string to trick Next.js AST parser
  if (!content.includes("export const dynamic = 'force-static'; // [TAURI_INJECTED]")) {
    content = "export const dynamic = 'force-static'; // [TAURI_INJECTED]\n" + content;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log('Successfully injected force-static into API routes to bypass Next.js export errors.');
