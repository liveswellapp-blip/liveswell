#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Copy built files to correct location for production
function copyFiles() {
  const sourceDir = path.resolve('dist/public');
  const targetDir = path.resolve('server/public');
  
  console.log('Post-build: Copying static files for production...');
  
  // Ensure target directory exists
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  
  if (fs.existsSync(sourceDir)) {
    fs.cpSync(sourceDir, targetDir, { recursive: true });
    console.log(`Post-build: Copied files from ${sourceDir} to ${targetDir}`);
  } else {
    console.error(`Post-build: Source directory ${sourceDir} does not exist`);
    process.exit(1);
  }
}

try {
  copyFiles();
  console.log('Post-build: Static file setup completed successfully');
} catch (error) {
  console.error('Post-build: Error copying files:', error);
  process.exit(1);
}