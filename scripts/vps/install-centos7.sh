#!/bin/bash

# Script tự động cài đặt môi trường cho CentOS 7
# Chạy với: bash scripts/vps/install-centos7.sh

set -e

echo "🚀 Bắt đầu cài đặt môi trường cho Uniswap V3 Indexer trên CentOS 7..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Script này cần chạy với quyền root hoặc sudo"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
yum update -y
yum install -y epel-release
yum install -y git curl wget vim

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Verify Node.js
echo "✅ Node.js version:"
node --version
npm --version

# Install pnpm
echo "📦 Installing pnpm..."
npm install -g pnpm

echo "✅ pnpm version:"
pnpm --version

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
yum install -y postgresql15-server postgresql15

# Initialize PostgreSQL
echo "📦 Initializing PostgreSQL..."
/usr/pgsql-15/bin/postgresql-15-setup initdb

# Start PostgreSQL
systemctl start postgresql-15
systemctl enable postgresql-15

echo "✅ PostgreSQL installed and started"

# Create application user
echo "👤 Creating application user 'indexer'..."
if ! id "indexer" &>/dev/null; then
    useradd -m -s /bin/bash indexer
    echo "✅ User 'indexer' created"
else
    echo "⚠️  User 'indexer' already exists"
fi

echo ""
echo "✅ Cài đặt hoàn tất!"
echo ""
echo "📝 Bước tiếp theo:"
echo "1. Tạo database và user PostgreSQL:"
echo "   sudo -u postgres psql"
echo "   CREATE USER uniswap_v3_indexer WITH PASSWORD 'your_password';"
echo "   CREATE DATABASE uniswap_v3_indexer OWNER uniswap_v3_indexer;"
echo "   \\q"
echo ""
echo "2. Switch sang user indexer:"
echo "   sudo su - indexer"
echo ""
echo "3. Clone repository và setup project"
echo "4. Xem hướng dẫn chi tiết: DEPLOYMENT_VPS.md"

