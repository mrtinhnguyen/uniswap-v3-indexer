#!/usr/bin/env node

/**
 * Script để start indexer với đầy đủ setup:
 * 1. Update config từ pools.txt
 * 2. Setup database (migrations)
 * 3. Start indexer
 */

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

console.log('🚀 Bắt đầu setup và start indexer...\n');

try {
  // Step 1: Update config
  console.log('📝 Bước 1: Cập nhật config từ pools.txt...');
  execSync('node scripts/update-config.js', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  console.log('✅ Config đã được cập nhật\n');

  // Step 2: Setup database (migrations)
  console.log('🗄️  Bước 2: Chạy database migrations...');
  try {
    execSync('cd generated && pnpm run db-setup', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log('✅ Database migrations đã hoàn thành\n');
  } catch (error) {
    console.log('⚠️  Lỗi khi chạy migrations (có thể database đã được setup):', error.message);
    console.log('💡 Tiếp tục start indexer...\n');
  }

  // Step 3: Start indexer
  console.log('🚀 Bước 3: Khởi động indexer...');
  console.log('💡 Envio sẽ bắt đầu index blocks. Có thể mất vài giây để hiển thị output...\n');
  
  execSync('envio start', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
}

