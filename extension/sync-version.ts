import fs from 'fs';
import path from 'path';
import { LOG_MESSAGES } from '../shared/constants';

function syncVersion() {
  try {
    const rootPackagePath = path.resolve(__dirname, '../package.json');
    const manifestPath = path.resolve(__dirname, './public/manifest.json');

    const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    if (manifest.version !== rootPackage.version) {
      manifest.version = rootPackage.version;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      console.log(`[sync-version] Updated manifest.json version to ${rootPackage.version}`);
    }
  } catch (error) {
    console.error(LOG_MESSAGES.VERSION_SYNC_ERROR, error);
    process.exit(1);
  }
}

syncVersion();
