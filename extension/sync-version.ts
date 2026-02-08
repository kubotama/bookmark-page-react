import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const manifestJsonPath = path.resolve(process.cwd(), 'extension/public/manifest.json');

function syncVersion() {
  try {
    if (!fs.existsSync(packageJsonPath)) {
      console.error(`[sync-version] package.json not found at: ${packageJsonPath}`);
      process.exit(1);
    }
    if (!fs.existsSync(manifestJsonPath)) {
      console.error(`[sync-version] manifest.json not found at: ${manifestJsonPath}`);
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf-8'));

    if (typeof packageJson.version !== 'string') {
      console.error(`[sync-version] 'version' field in package.json is missing or not a string.`);
      process.exit(1);
    }

    if (manifestJson.version !== packageJson.version) {
      const oldVersion = manifestJson.version;
      manifestJson.version = packageJson.version;
      fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestJson, null, 2) + '\n');
      console.log(`[sync-version] Updated manifest.json version from ${oldVersion} to ${packageJson.version}`);
    } else {
      console.log(`[sync-version] Versions are already in sync (${packageJson.version})`);
    }
  } catch (error) {
    console.error('[sync-version] Error syncing versions:', error);
    process.exit(1);
  }
}

syncVersion();
