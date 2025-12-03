#!/usr/bin/env node

/**
 * Script để chuyển đổi DATABASE_URL thành các biến môi trường riêng lẻ cho Envio
 * Envio không đọc DATABASE_URL trực tiếp, cần các biến ENVIO_PG_*
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');

function parseDatabaseUrl(url) {
  // Format: postgresql://user:password@host:port/database
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database');
  }
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

function updateEnvFile() {
  if (!fs.existsSync(envFile)) {
    console.error('❌ File .env không tồn tại!');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const lines = envContent.split('\n');
  
  let hasDatabaseUrl = false;
  let hasEnvioVars = false;
  const newLines = [];
  const envioVars = {};

  // Parse DATABASE_URL nếu có
  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      hasDatabaseUrl = true;
      const url = line.split('=')[1].trim();
      try {
        const parsed = parseDatabaseUrl(url);
        envioVars.ENVIO_PG_HOST = parsed.host;
        envioVars.ENVIO_PG_PORT = parsed.port.toString();
        envioVars.ENVIO_PG_USER = parsed.user;
        envioVars.ENVIO_POSTGRES_PASSWORD = parsed.password;
        envioVars.ENVIO_PG_DATABASE = parsed.database;
        console.log('✅ Đã parse DATABASE_URL thành công');
      } catch (error) {
        console.error(`❌ Lỗi parse DATABASE_URL: ${error.message}`);
        process.exit(1);
      }
      // Giữ lại DATABASE_URL (có thể dùng cho mục đích khác)
      newLines.push(line);
    } else if (line.startsWith('ENVIO_PG_') || line.startsWith('ENVIO_POSTGRES_PASSWORD')) {
      hasEnvioVars = true;
      newLines.push(line);
    } else {
      newLines.push(line);
    }
  }

  // Thêm các biến ENVIO_PG_* nếu chưa có
  if (hasDatabaseUrl && Object.keys(envioVars).length > 0) {
    console.log('\n📝 Thêm các biến môi trường ENVIO_PG_* vào .env:');
    
    // Kiểm tra xem đã có chưa
    const existingVars = new Set();
    for (const line of newLines) {
      for (const key of Object.keys(envioVars)) {
        if (line.startsWith(`${key}=`)) {
          existingVars.add(key);
        }
      }
    }

    // Thêm các biến chưa có
    let added = false;
    for (const [key, value] of Object.entries(envioVars)) {
      if (!existingVars.has(key)) {
        newLines.push(`\n# Envio Database Config (từ DATABASE_URL)`);
        newLines.push(`${key}=${value}`);
        console.log(`  ✅ ${key}=${key.includes('PASSWORD') ? '****' : value}`);
        added = true;
      } else {
        console.log(`  ⚠️  ${key} đã tồn tại, bỏ qua`);
      }
    }

    if (added) {
      // Ghi lại file
      fs.writeFileSync(envFile, newLines.join('\n'), 'utf8');
      console.log('\n✅ Đã cập nhật file .env');
      console.log('💡 Chạy lại: pnpm run start');
    } else {
      console.log('\n✅ Tất cả biến đã được cấu hình');
    }
  } else if (!hasDatabaseUrl && !hasEnvioVars) {
    console.log('⚠️  Không tìm thấy DATABASE_URL hoặc ENVIO_PG_* trong .env');
    console.log('💡 Thêm DATABASE_URL hoặc các biến ENVIO_PG_* vào .env');
  } else if (hasEnvioVars) {
    console.log('✅ Các biến ENVIO_PG_* đã được cấu hình');
  }
}

// Main
try {
  updateEnvFile();
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
}

