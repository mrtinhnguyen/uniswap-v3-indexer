#!/usr/bin/env node

/**
 * Script để cập nhật config.yaml từ file pools.txt
 * Đọc danh sách địa chỉ pool từ pools.txt và inject vào config.yaml
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const POOLS_FILE = path.join(__dirname, '..', 'pools.txt');
const CONFIG_FILE = path.join(__dirname, '..', 'config.yaml');
const CONFIG_TEMPLATE = path.join(__dirname, '..', 'config.template.yaml');

// Đọc danh sách pool từ file txt
function readPoolsFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File ${filePath} không tồn tại. Tạo file mới...`);
    fs.writeFileSync(filePath, '# Danh sách địa chỉ pool Uniswap V3\n# Mỗi dòng là một địa chỉ pool\n', 'utf8');
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const addresses = [];

  for (const line of lines) {
    // Bỏ qua dòng trống và comment
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Lấy địa chỉ (bỏ comment sau dấu #)
    const address = trimmed.split('#')[0].trim();
    
    // Validate địa chỉ Ethereum (42 ký tự, bắt đầu bằng 0x)
    if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      addresses.push(address);
    } else if (address) {
      console.warn(`Địa chỉ không hợp lệ: ${address}`);
    }
  }

  return addresses;
}

// Đọc config hiện tại
function readConfig() {
  const content = fs.readFileSync(CONFIG_FILE, 'utf8');
  return yaml.load(content);
}

// Cập nhật địa chỉ pool trong config
function updateConfigAddresses(config, addresses, chainId = 8453) {
  // Tìm network với chainId tương ứng
  const network = config.networks.find(n => n.id === chainId);
  
  if (!network) {
    console.error(`Không tìm thấy network với chainId ${chainId}`);
    return false;
  }

  // Tìm contract UniswapV3Pool
  const contract = network.contracts.find(c => c.name === 'UniswapV3Pool');
  
  if (!contract) {
    console.error('Không tìm thấy contract UniswapV3Pool');
    return false;
  }

  // Cập nhật địa chỉ
  contract.address = addresses;
  console.log(`Đã cập nhật ${addresses.length} địa chỉ pool cho chainId ${chainId}`);
  return true;
}

// Ghi config mới
function writeConfig(config) {
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
  });
  fs.writeFileSync(CONFIG_FILE, content, 'utf8');
  console.log(`Đã cập nhật ${CONFIG_FILE}`);
}

// Main function
function main() {
  try {
    console.log('Đang đọc danh sách pool từ pools.txt...');
    const addresses = readPoolsFromFile(POOLS_FILE);
    
    if (addresses.length === 0) {
      console.warn('Không có địa chỉ pool nào trong pools.txt');
      return;
    }

    console.log(`Tìm thấy ${addresses.length} địa chỉ pool:`);
    addresses.forEach((addr, idx) => {
      console.log(`  ${idx + 1}. ${addr}`);
    });

    console.log('\nĐang đọc config.yaml...');
    const config = readConfig();

    console.log('Đang cập nhật config...');
    const chainId = process.argv[2] ? parseInt(process.argv[2]) : 8453;
    const updated = updateConfigAddresses(config, addresses, chainId);

    if (updated) {
      writeConfig(config);
      console.log('\n✅ Hoàn thành! Bạn có thể restart indexer để áp dụng thay đổi.');
      
      // Tự động sync alerts config
      try {
        const {execSync} = require('child_process');
        console.log('\n📱 Đang sync alerts config từ pools.txt...');
        execSync('node scripts/update-alerts-config.js', {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        });
      } catch (error) {
        // Ignore nếu script không tồn tại hoặc có lỗi
        console.log('⚠️  Không thể sync alerts config (có thể chưa setup)');
      }
    } else {
      console.error('\n❌ Không thể cập nhật config');
      process.exit(1);
    }
  } catch (error) {
    console.error('Lỗi:', error.message);
    process.exit(1);
  }
}

main();

