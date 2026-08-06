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
    } else if (file.endsWith('route.ts')) { 
        results.push(file);
    }
  });
  return results;
}

const apiFiles = walk(path.join(process.cwd(), 'src/app/api'));

apiFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.startsWith("export const dynamic = 'force-static';\n")) {
    content = content.replace("export const dynamic = 'force-static';\n", "");
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log('Successfully cleaned up force-static injections from API routes.');
