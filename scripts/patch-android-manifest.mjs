import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '../src-tauri/gen/android/app/src/main/AndroidManifest.xml');

async function patchManifest() {
  console.log(`Looking for AndroidManifest at: ${manifestPath}`);
  
  if (!fs.existsSync(manifestPath)) {
    console.error('ERROR: AndroidManifest.xml does not exist at generated path!');
    process.exit(1);
  }

  let content = fs.readFileSync(manifestPath, 'utf8');
  
  const permissions = `
    <!-- Zeneva Camera Permissions for Barcode Scanning -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
`;

  if (content.includes('android.permission.CAMERA')) {
    console.log('Camera permission already exists in Manifest. Skipping.');
    return;
  }

  // Insert right before <application tag
  const patched = content.replace('<application', `${permissions}\n    <application`);
  
  fs.writeFileSync(manifestPath, patched, 'utf8');
  console.log('SUCCESS: Patched AndroidManifest.xml with Camera permissions.');
}

patchManifest().catch(console.error);
   

