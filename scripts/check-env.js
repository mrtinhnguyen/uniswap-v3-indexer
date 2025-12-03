#!/usr/bin/env node

/**
 * Script để kiểm tra các biến môi trường cần thiết cho Envio
 */

require('dotenv').config();

const requiredEnvVars = {
  'RPC_URL_8453': 'RPC URL cho Base Mainnet (bắt buộc)',
};

const optionalEnvVars = {
  'DATABASE_URL': 'PostgreSQL connection string',
  'ENVIO_PG_HOST': 'PostgreSQL host',
  'ENVIO_PG_PORT': 'PostgreSQL port',
  'ENVIO_PG_USER': 'PostgreSQL user',
  'ENVIO_POSTGRES_PASSWORD': 'PostgreSQL password',
  'ENVIO_PG_DATABASE': 'PostgreSQL database name',
};

console.log('🔍 Kiểm tra biến môi trường...\n');

let hasErrors = false;

// Kiểm tra required vars
console.log('📋 Biến môi trường BẮT BUỘC:');
for (const [key, description] of Object.entries(requiredEnvVars)) {
  const value = process.env[key];
  if (value) {
    console.log(`  ✅ ${key}: ${value.substring(0, 50)}...`);
  } else {
    console.log(`  ❌ ${key}: KHÔNG TÌM THẤY - ${description}`);
    hasErrors = true;
  }
}

console.log('\n📋 Biến môi trường TÙY CHỌN (Database):');
let hasDatabaseConfig = false;

if (process.env.DATABASE_URL) {
  console.log(`  ✅ DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  hasDatabaseConfig = true;
} else {
  console.log('  ⚠️  DATABASE_URL: Không tìm thấy');
  
  // Kiểm tra các biến riêng lẻ
  const dbVars = ['ENVIO_PG_HOST', 'ENVIO_PG_PORT', 'ENVIO_PG_USER', 'ENVIO_POSTGRES_PASSWORD', 'ENVIO_PG_DATABASE'];
  let hasAllDbVars = true;
  
  for (const key of dbVars) {
    const value = process.env[key];
    if (value) {
      console.log(`  ✅ ${key}: ${key.includes('PASSWORD') ? '****' : value}`);
      hasDatabaseConfig = true;
    } else {
      console.log(`  ⚠️  ${key}: Không tìm thấy`);
      hasAllDbVars = false;
    }
  }
  
  if (!hasAllDbVars && !hasDatabaseConfig) {
    console.log('  ⚠️  Cần cấu hình DATABASE_URL hoặc các biến ENVIO_PG_*');
  }
}

console.log('\n📊 Tóm tắt:');
if (hasErrors) {
  console.log('  ❌ Thiếu biến môi trường bắt buộc!');
  console.log('  💡 Tạo file .env và thêm các biến cần thiết.');
  process.exit(1);
} else {
  console.log('  ✅ Tất cả biến môi trường bắt buộc đã được cấu hình');
  if (!hasDatabaseConfig) {
    console.log('  ⚠️  Chưa cấu hình database - Envio có thể không hoạt động đúng');
  } else {
    console.log('  ✅ Database đã được cấu hình');
  }
}

