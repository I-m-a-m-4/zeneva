import fs from 'fs';
import path from 'path';

const apiPath = path.join(process.cwd(), 'src/app/api');
const hiddenApiPath = path.join(process.cwd(), 'src/app/_api');

if (fs.existsSync(apiPath)) {
  fs.renameSync(apiPath, hiddenApiPath);
  console.log('Successfully hid src/app/api to bypass Next.js static export errors.');
}
