#!/usr/bin/env node

/**
 * Script để đảm bảo thư mục generated tồn tại trước khi start
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const generatedDir = path.join(__dirname, '..', 'generated');

if (!fs.existsSync(generatedDir)) {
  console.log('⚠️  Generated directory not found. Running codegen...');
  try {
    // Set memory limit để tránh out of memory
    const env = {...process.env, NODE_OPTIONS: '--max-old-space-size=512'};
    execSync('pnpm run codegen', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env,
    });
    console.log('✅ Codegen completed successfully');
  } catch (error) {
    console.error('❌ Codegen failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Generated directory exists');
}

// Verify generated directory has required files
const requiredFiles = [
  'src/Index.res.js',
  'src/Env.res.js',
  'package.json',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(generatedDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Required file not found: ${file}`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('⚠️  Some required files are missing. Running codegen again...');
  try {
    // Set memory limit để tránh out of memory
    const env = {...process.env, NODE_OPTIONS: '--max-old-space-size=512'};
    execSync('pnpm run codegen', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env,
    });
    console.log('✅ Codegen completed successfully');
  } catch (error) {
    console.error('❌ Codegen failed:', error.message);
    process.exit(1);
  }
}

console.log('✅ All required files exist in generated directory');

