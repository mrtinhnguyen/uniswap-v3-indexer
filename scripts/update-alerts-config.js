#!/usr/bin/env node

/**
 * Script để cập nhật alerts.config.json từ pools.txt
 * Tự động sync danh sách pools từ pools.txt vào alerts config
 */

const fs = require('fs');
const path = require('path');

const POOLS_FILE = path.join(__dirname, '..', 'pools.txt');
const ALERTS_CONFIG_FILE = path.join(__dirname, '..', 'config', 'alerts.config.json');
const ALERTS_CONFIG_LOCAL_FILE = path.join(__dirname, '..', 'config', 'alerts.config.local.json');

// Function để đọc pools từ pools.txt
function readPoolsFile() {
  if (!fs.existsSync(POOLS_FILE)) {
    console.error(`❌ File ${POOLS_FILE} không tồn tại!`);
    process.exit(1);
  }

  const content = fs.readFileSync(POOLS_FILE, 'utf8');
  const lines = content.split('\n');
  const pools = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Bỏ qua dòng trống và comment
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Lấy địa chỉ pool (có thể có comment sau dấu #)
    const address = trimmed.split('#')[0].trim();
    
    // Validate địa chỉ (basic check)
    if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      pools.push(address);
    } else if (address) {
      console.warn(`⚠️  Bỏ qua địa chỉ không hợp lệ: ${address}`);
    }
  }

  return pools;
}

// Function để đọc alerts config
function readAlertsConfig() {
  // Ưu tiên file local nếu có
  const configFile = fs.existsSync(ALERTS_CONFIG_LOCAL_FILE) 
    ? ALERTS_CONFIG_LOCAL_FILE 
    : ALERTS_CONFIG_FILE;

  if (!fs.existsSync(configFile)) {
    console.error(`❌ File ${configFile} không tồn tại!`);
    process.exit(1);
  }

  const content = fs.readFileSync(configFile, 'utf8');
  return JSON.parse(content);
}

// Function để ghi alerts config
function writeAlertsConfig(config) {
  // Ghi vào file local nếu có, nếu không thì ghi vào file mặc định
  const configFile = fs.existsSync(ALERTS_CONFIG_LOCAL_FILE) 
    ? ALERTS_CONFIG_LOCAL_FILE 
    : ALERTS_CONFIG_FILE;

  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(configFile, content, 'utf8');
  return configFile;
}

// Main function
function main() {
  console.log('📝 Đang đọc danh sách pool từ pools.txt...');
  const pools = readPoolsFile();

  if (pools.length === 0) {
    console.warn('⚠️  Không tìm thấy pool nào trong pools.txt!');
    return;
  }

  console.log(`Tìm thấy ${pools.length} địa chỉ pool:`);
  pools.forEach((pool, index) => {
    console.log(`  ${index + 1}. ${pool}`);
  });

  console.log('\n📖 Đang đọc alerts.config.json...');
  const config = readAlertsConfig();

  // Cập nhật danh sách pools
  const oldPools = config.pools || [];
  config.pools = pools;

  // So sánh để xem có thay đổi không
  const poolsChanged = JSON.stringify(oldPools.sort()) !== JSON.stringify(pools.sort());

  if (poolsChanged) {
    console.log('\n🔄 Đang cập nhật alerts config...');
    const configFile = writeAlertsConfig(config);
    console.log(`Đã cập nhật ${pools.length} địa chỉ pool cho alerts config`);
    console.log(`Đã cập nhật ${configFile}`);
    console.log('✅ Hoàn thành! Alerts config đã được sync với pools.txt');
  } else {
    console.log('\n✅ Alerts config đã được sync (không có thay đổi)');
  }
}

// Run
try {
  main();
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
}

