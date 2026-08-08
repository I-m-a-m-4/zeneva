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
      // Skip node_modules/target/.git for speed, and `build` because Gradle
      // writes a merged AndroidManifest.xml there. Patching that copy is
      // useless - it is regenerated from source on every build.
      if (file === 'node_modules' || file === 'target' || file === '.git' || file === 'build') continue;
      const found = findFile(fullPath, fileName);
      if (found) return found;
    } else if (file === fileName) {
      return fullPath;
    }
  }
  return null;
}

async function patchManifest() {
  // The canonical source manifest. Prefer it outright rather than trusting a
  // directory walk, which previously resolved to Gradle's merged copy under
  // app/build/intermediates/ and silently patched a throwaway file.
  const canonical = path.join(__dirname, '../src-tauri/gen/android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(canonical)) {
    processManifest(canonical);
    return;
  }

  const searchRoot = path.join(__dirname, '../src-tauri');
  console.log(`Canonical manifest not found. Scanning recursively from: ${searchRoot}`);

  const manifestPath = findFile(searchRoot, 'AndroidManifest.xml');

  if (!manifestPath) {
    console.error('CRITICAL ERROR: Cannot locate AndroidManifest.xml. Direct integration aborted.');
    process.exit(1);
  }

  processManifest(manifestPath);
}

function processManifest(filePath) {
  console.log(`Found AndroidManifest.xml at: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Each entry is checked and injected independently so that adding a new
  // permission later is not skipped just because an earlier one is present.
  const entries = [
    { match: 'android.permission.CAMERA', tag: '<uses-permission android:name="android.permission.CAMERA" />' },
    { match: 'android.permission.RECORD_AUDIO', tag: '<uses-permission android:name="android.permission.RECORD_AUDIO" />' },
    { match: 'android.permission.MODIFY_AUDIO_SETTINGS', tag: '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />' },
    { match: 'android.hardware.camera"', tag: '<uses-feature android:name="android.hardware.camera" android:required="false" />' },
    { match: 'android.hardware.camera.autofocus', tag: '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />' },
    { match: 'android.hardware.microphone', tag: '<uses-feature android:name="android.hardware.microphone" android:required="false" />' },
  ];

  const missing = entries.filter((e) => !content.includes(e.match));

  if (missing.length === 0) {
    console.log('SUCCESS: All hardware permissions already defined in Manifest. Skipping injection.');
    return;
  }

  if (!content.includes('<application')) {
    console.error('CRITICAL ERROR: AndroidManifest formatting corrupted. No <application> anchor tag present.');
    process.exit(1);
  }

  const block = `
    <!-- Zeneva System-level Hardware Integrations -->
${missing.map((e) => `    ${e.tag}`).join('\n')}
`;

  const patched = content.replace('<application', `${block}\n    <application`);
  fs.writeFileSync(filePath, patched, 'utf8');
  console.log(`SUCCESS: Patched AndroidManifest.xml with ${missing.length} hardware entr${missing.length === 1 ? 'y' : 'ies'}:`);
  missing.forEach((e) => console.log(`  + ${e.match}`));
}

patchManifest().catch(console.error);
