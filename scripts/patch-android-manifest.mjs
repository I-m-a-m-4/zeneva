import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findFile(dir, fileName) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Avoid recursive node_modules or target folders to speed up
      if (file === 'node_modules' || file === 'target' || file === '.git') continue;
      const found = findFile(fullPath, fileName);
      if (found) return found;
    } else if (file === fileName) {
      return fullPath;
    }
  }
  return null;
}

async function patchManifest() {
  const searchRoot = path.join(__dirname, '../src-tauri');
  console.log(`Scanning recursively for AndroidManifest.xml starting from: ${searchRoot}`);
  
  const manifestPath = findFile(searchRoot, 'AndroidManifest.xml');
  
  if (!manifestPath) {
    console.warn('WARNING: AndroidManifest.xml was not found in src-tauri subtree. Tauri might not have fully generated android project directories yet. Looking in fallback path.');
    const fallbackPath = path.join(__dirname, '../src-tauri/gen/android/app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(fallbackPath)) {
      console.error('CRITICAL ERROR: Cannot locate AndroidManifest.xml. Direct integration aborted.');
      process.exit(1);
    }
    processManifest(fallbackPath);
  } else {
    processManifest(manifestPath);
  }
}

function processManifest(filePath) {
  console.log(`Found AndroidManifest.xml at: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const permissions = `
    <!-- Zeneva System-level Hardware Integrations -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
`;

  if (content.includes('android.permission.CAMERA')) {
    console.log('SUCCESS: Camera permissions already defined in Manifest. Skipping injection.');
    return;
  }

  if (!content.includes('<application')) {
    console.error('CRITICAL ERROR: AndroidManifest formatting corrupted. No <application> anchor tag present.');
    process.exit(1);
  }

  const patched = content.replace('<application', `${permissions}\n    <application`);
  fs.writeFileSync(filePath, patched, 'utf8');
  console.log('SUCCESS: Successfully patched AndroidManifest.xml with system-level camera and autofocus hardware support!');
}

patchManifest().catch(console.error);
