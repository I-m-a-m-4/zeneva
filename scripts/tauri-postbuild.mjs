import fs from 'fs';
import path from 'path';

const apiPath = path.join(process.cwd(), 'src/app/api');
const hiddenApiPath = path.join(process.cwd(), 'src/app/_api');

if (fs.existsSync(hiddenApiPath)) {
  fs.renameSync(hiddenApiPath, apiPath);
  console.log('Successfully restored src/app/api after Next.js static export.');
}
