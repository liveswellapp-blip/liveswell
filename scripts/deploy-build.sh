#!/bin/bash

echo "Starting deployment build process..."

# Run the original build command
echo "Building client and server..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed!"
  exit 1
fi

# Run post-build script
echo "Running post-build script..."
node scripts/post-build.js

# Check if post-build was successful
if [ $? -ne 0 ]; then
  echo "Post-build failed!"
  exit 1
fi

echo "Deployment build completed successfully!"