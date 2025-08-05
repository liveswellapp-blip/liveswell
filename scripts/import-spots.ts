import { importSurfSpots } from '../server/spot-imports.js';

async function runImport() {
  try {
    console.log('Starting surf spot import...');
    const result = await importSurfSpots();
    console.log('Import completed successfully:', result);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

runImport();