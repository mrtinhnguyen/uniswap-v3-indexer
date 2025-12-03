#!/usr/bin/env node

/**
 * File watcher để tự động cập nhật config.yaml khi pools.txt thay đổi
 * Chạy script này trong một terminal riêng để tự động sync
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const POOLS_FILE = path.join(__dirname, '..', 'pools.txt');
const UPDATE_SCRIPT = path.join(__dirname, 'update-config.js');

let lastModified = null;

function checkFile() {
  try {
    if (!fs.existsSync(POOLS_FILE)) {
      console.log('⏳ Đang chờ file pools.txt được tạo...');
      return;
    }

    const stats = fs.statSync(POOLS_FILE);
    const currentModified = stats.mtime.getTime();

    if (lastModified === null) {
      lastModified = currentModified;
      console.log('👀 Đang theo dõi file pools.txt...');
      console.log('   Chỉnh sửa file pools.txt và script sẽ tự động cập nhật config.yaml\n');
      return;
    }

    if (currentModified > lastModified) {
      console.log('\n📝 Phát hiện thay đổi trong pools.txt');
      console.log('🔄 Đang cập nhật config.yaml...\n');
      
      lastModified = currentModified;
      
      // Chạy update script
      const updateProcess = spawn('node', [UPDATE_SCRIPT], {
        stdio: 'inherit',
        shell: true,
      });

      updateProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Đã cập nhật config.yaml thành công!');
          console.log('   ⚠️  Lưu ý: Bạn cần restart indexer để áp dụng thay đổi\n');
        } else {
          console.log('\n❌ Có lỗi khi cập nhật config.yaml\n');
        }
      });
    }
  } catch (error) {
    console.error('Lỗi:', error.message);
  }
}

// Kiểm tra mỗi 1 giây
setInterval(checkFile, 1000);

// Kiểm tra ngay lần đầu
checkFile();

console.log('🚀 File watcher đã khởi động');
console.log('   Nhấn Ctrl+C để dừng\n');

