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

const specialFiles = ['src/app/robots.ts', 'src/app/sitemap.ts'];
specialFiles.forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    apiFiles.push(path.join(process.cwd(), file));
  }
});

apiFiles.forEach(file => {
  fs.renameSync(file, file + '.bak');
});

console.log('Successfully renamed API routes to .bak to bypass Next.js static export errors completely.');
