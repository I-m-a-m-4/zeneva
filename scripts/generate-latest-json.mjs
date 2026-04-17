
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TAURI_CONFIG_PATH = 'src-tauri/tauri.conf.json';
const OUTPUT_FILE = 'latest.json';

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(TAURI_CONFIG_PATH, 'utf8'));
    const version = config.version || config.package?.version;
    const tagName = `v${version}`;

    console.log(`Generating ${OUTPUT_FILE} for version ${version}...`);

    const latestJson = {
      version: tagName,
      notes: `Zeneva Desktop v${version} release.`,
      pub_date: new Date().toISOString(),
      platforms: {}
    };

    // We assume the artifacts are in src-tauri/target/release/bundle/
    // This script should be run AFTER the tauri build.
    // However, on GitHub Actions, the paths might be different or artifacts might be uploaded already.
    
    // A better approach for CI is to fetch the release assets after they are uploaded 
    // or use the local files if they exist.
    
    const bundleDir = 'src-tauri/target/release/bundle';
    
    // Windows
    const msiPath = findFile(bundleDir, /\.msi$/);
    const msiSigPath = findFile(bundleDir, /\.msi\.sig$/);
    const nsisZipPath = findFile(bundleDir, /\.nsis\.zip$/);
    const nsisZipSigPath = findFile(bundleDir, /\.nsis\.zip\.sig$/);
    
    if (nsisZipPath && nsisZipSigPath) {
      console.log('Found NSIS Zip artifact:', nsisZipPath);
      const fileName = path.basename(nsisZipPath);
      const signature = fs.readFileSync(nsisZipSigPath, 'utf8').trim();
      latestJson.platforms['windows-x86_64'] = {
        signature,
        url: `https://github.com/I-m-a-m-4/zeneva/releases/download/${tagName}/${fileName}`
      };
    } else if (msiPath && msiSigPath) {
      console.log('Found MSI artifact:', msiPath);
      const fileName = path.basename(msiPath);
      const signature = fs.readFileSync(msiSigPath, 'utf8').trim();
      latestJson.platforms['windows-x86_64'] = {
        signature,
        url: `https://github.com/I-m-a-m-4/zeneva/releases/download/${tagName}/${fileName}`
      };
    } else {
      console.warn('No Windows artifacts found in', bundleDir);
    }

    // MacOS (Universal/Intel/ARM)
    const dmgPath = findFile(bundleDir, /\.dmg$/);
    const appPath = findFile(bundleDir, /\.app\.tar\.gz$/);
    const appSigPath = findFile(bundleDir, /\.app\.tar\.gz\.sig$/);

    if (appPath && appSigPath) {
        const fileName = path.basename(appPath);
        const signature = fs.readFileSync(appSigPath, 'utf8').trim();
        latestJson.platforms['darwin-x86_64'] = {
            signature,
            url: `https://github.com/I-m-a-m-4/zeneva/releases/download/${tagName}/${fileName}`
        };
        latestJson.platforms['darwin-aarch64'] = {
            signature,
            url: `https://github.com/I-m-a-m-4/zeneva/releases/download/${tagName}/${fileName}`
        };
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(latestJson, null, 2));
    console.log(`Successfully generated ${OUTPUT_FILE}`);
    
    // Optional: Upload/Merge if GH_TOKEN is available
    if (process.env.GITHUB_TOKEN) {
        console.log(`Checking for existing ${OUTPUT_FILE} in release ${tagName}...`);
        try {
            execSync(`gh release download ${tagName} -p ${OUTPUT_FILE} --clobber`, { stdio: 'ignore' });
            const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
            console.log('Merging with existing manifest...');
            latestJson.platforms = { ...existing.platforms, ...latestJson.platforms };
        } catch (e) {
            console.log('No existing manifest found or failed to download. Creating new one.');
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(latestJson, null, 2));
        console.log(`Uploading ${OUTPUT_FILE} to release ${tagName}...`);
        execSync(`gh release upload ${tagName} ${OUTPUT_FILE} --clobber`, { stdio: 'inherit' });
    }

  } catch (error) {
    console.error('Failed to generate latest.json:', error);
    process.exit(1);
  }
}

function findFile(dir, pattern) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (pattern.test(file) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }
  return null;
}

main();
