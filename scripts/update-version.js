const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Please provide a version number (e.g., node scripts/update-version.js 0.5.2)');
  process.exit(1);
}

const packagePath = path.join(__dirname, '..', 'package.json');
const tauriConfPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');

// Update package.json
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json to ${newVersion}`);
}

// Update tauri.conf.json
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`Updated tauri.conf.json to ${newVersion}`);
}
// Update src-tauri/Cargo.toml
const cargoPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  let cargo = fs.readFileSync(cargoPath, 'utf8');
  cargo = cargo.replace(/^version = ".*"/m, `version = "${newVersion}"`);
  fs.writeFileSync(cargoPath, cargo);
  console.log(`Updated Cargo.toml to ${newVersion}`);
}
