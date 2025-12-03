# Hướng dẫn Deploy lên VPS CentOS 7

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn deploy Uniswap V3 Indexer lên VPS CentOS 7 với:
- ✅ Node.js 20 (LTS)
- ✅ PostgreSQL database
- ✅ Systemd service (tự động start khi reboot)
- ✅ Telegram monitoring & alerts
- ✅ Auto-restart khi crash

## 🔧 Bước 1: Chuẩn bị VPS

### 1.1. Kết nối SSH

```bash
ssh root@your_vps_ip
# hoặc
ssh your_user@your_vps_ip
```

### 1.2. Update system

```bash
sudo yum update -y
sudo yum install -y epel-release
```

### 1.3. Install các tools cần thiết

```bash
sudo yum install -y git curl wget vim
```

## 🔧 Bước 2: Cài đặt Node.js 20

### Cách 1: Sử dụng NodeSource (Khuyến nghị)

```bash
# Download và chạy NodeSource setup script
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js
sudo yum install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version
```

### Cách 2: Sử dụng NVM (Node Version Manager)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version
```

## 🔧 Bước 3: Cài đặt pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify
pnpm --version
```

## 🔧 Bước 4: Cài đặt PostgreSQL

### 4.1. Install PostgreSQL

```bash
# Install PostgreSQL repository
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL 15 (hoặc version mới nhất)
sudo yum install -y postgresql15-server postgresql15

# Initialize database
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Start và enable PostgreSQL
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15
```

### 4.2. Cấu hình PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Trong PostgreSQL shell:
CREATE USER uniswap_v3_indexer WITH PASSWORD 'your_secure_password';
CREATE DATABASE uniswap_v3_indexer OWNER uniswap_v3_indexer;
GRANT ALL PRIVILEGES ON DATABASE uniswap_v3_indexer TO uniswap_v3_indexer;
\q
```

### 4.3. Cấu hình PostgreSQL để accept connections

```bash
# Edit PostgreSQL config
sudo vim /var/lib/pgsql/15/data/postgresql.conf

# Tìm và uncomment/set:
listen_addresses = '*'

# Edit pg_hba.conf
sudo vim /var/lib/pgsql/15/data/pg_hba.conf

# Thêm dòng (cho phép connection từ localhost):
host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql-15
```

### 4.4. Test connection

```bash
psql -h localhost -U uniswap_v3_indexer -d uniswap_v3_indexer
# Nhập password khi được hỏi
```

## 🔧 Bước 5: Clone và Setup Project

### 5.1. Tạo user cho application (khuyến nghị)

```bash
# Tạo user mới
sudo useradd -m -s /bin/bash indexer
sudo su - indexer
```

### 5.2. Clone repository

```bash
# Clone repo
git clone https://github.com/your-username/uniswap-v3-indexer.git
cd uniswap-v3-indexer

# Hoặc nếu repo private, sử dụng SSH:
# git clone git@github.com:your-username/uniswap-v3-indexer.git
```

### 5.3. Install dependencies

```bash
# Install dependencies
pnpm install

# Generate code
pnpm run codegen
```

## 🔧 Bước 6: Cấu hình Environment Variables

### 6.1. Tạo file .env

```bash
# Tạo file .env
vim .env
```

Thêm nội dung:

```bash
# RPC URL cho Base Mainnet (BẮT BUỘC)
RPC_URL_8453=https://mainnet.base.org
# Hoặc RPC riêng của bạn (khuyến nghị):
# RPC_URL_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Database Configuration (BẮT BUỘC)
ENVIO_PG_HOST=localhost
ENVIO_PG_PORT=5432
ENVIO_PG_USER=uniswap_v3_indexer
ENVIO_POSTGRES_PASSWORD=your_secure_password
ENVIO_PG_DATABASE=uniswap_v3_indexer

# Telegram Bot (TÙY CHỌN - cho monitoring)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Optional: Disable Hasura (nếu không dùng)
ENVIO_HASURA=false
```

### 6.2. Setup database environment (chuyển đổi DATABASE_URL nếu cần)

```bash
# Chạy script để setup database env
pnpm run setup-db-env
```

### 6.3. Cấu hình alerts config (nếu dùng monitoring)

```bash
# Copy và chỉnh sửa alerts config
cp config/alerts.config.json config/alerts.config.local.json
vim config/alerts.config.local.json
```

## 🔧 Bước 7: Setup Database Schema

### 7.1. Chạy migrations

```bash
# Chạy database migrations
pnpm run db-setup
```

Nếu thành công, bạn sẽ thấy:
```
✅ Database migrations completed
```

## 🔧 Bước 8: Test chạy thủ công

### 8.1. Test indexer

```bash
# Chạy indexer để test
pnpm run start
```

Nếu chạy thành công, bạn sẽ thấy logs từ Envio. Nhấn `Ctrl+C` để dừng.

### 8.2. Test Telegram Bot (nếu có)

```bash
pnpm run test-telegram
```

## 🔧 Bước 9: Tạo Systemd Service

### 9.1. Tạo service file

**Cách 1: Sử dụng script tự động (Khuyến nghị)**

```bash
# Switch về root user
exit

# Chạy script tạo service
sudo bash /home/indexer/uniswap-v3-indexer/scripts/vps/create-systemd-service.sh
```

**Cách 2: Tạo thủ công**

```bash
# Switch về root user
exit
sudo vim /etc/systemd/system/uniswap-v3-indexer.service
```

Thêm nội dung:

```ini
[Unit]
Description=Uniswap V3 Indexer
After=network.target postgresql-15.service
Requires=postgresql-15.service

[Service]
Type=simple
User=indexer
WorkingDirectory=/home/indexer/uniswap-v3-indexer
Environment="NODE_ENV=production"
EnvironmentFile=/home/indexer/uniswap-v3-indexer/.env
ExecStart=/usr/bin/env NODE_OPTIONS='--max-old-space-size=2048' /usr/bin/pnpm run start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=uniswap-v3-indexer

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Lưu ý**: Điều chỉnh paths theo user và directory của bạn.

### 9.2. Reload systemd và start service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (tự động start khi reboot)
sudo systemctl enable uniswap-v3-indexer

# Start service
sudo systemctl start uniswap-v3-indexer

# Check status
sudo systemctl status uniswap-v3-indexer
```

### 9.3. Xem logs

```bash
# Xem logs real-time
sudo journalctl -u uniswap-v3-indexer -f

# Xem logs gần đây
sudo journalctl -u uniswap-v3-indexer -n 100

# Xem logs từ hôm nay
sudo journalctl -u uniswap-v3-indexer --since today
```

## 🔧 Bước 10: Cấu hình Firewall

### 10.1. Cấu hình Firewalld (nếu dùng)

```bash
# Check firewall status
sudo systemctl status firewalld

# Nếu firewall đang chạy, mở port cần thiết (nếu có)
# Indexer thường không cần expose port ra ngoài
# Chỉ cần mở nếu bạn muốn access GraphQL API hoặc metrics

# Mở port 8080 (nếu cần GraphQL API)
sudo firewall-cmd --permanent --add-port=8080/tcp

# Mở port 9898 (nếu cần metrics)
sudo firewall-cmd --permanent --add-port=9898/tcp

# Reload firewall
sudo firewall-cmd --reload
```

**Lưu ý**: Indexer không cần expose port ra ngoài nếu chỉ chạy indexing. Chỉ mở port nếu bạn cần access API.

## 🔧 Bước 11: Cấu hình Auto-update từ GitHub

### 11.1. Setup SSH key cho Git (nếu repo private)

```bash
# Tạo SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Thêm vào GitHub: Settings > SSH and GPG keys > New SSH key
```

### 11.2. Tạo script auto-update (tùy chọn)

```bash
# Tạo script update
vim /home/indexer/update-indexer.sh
```

Thêm nội dung:

```bash
#!/bin/bash
cd /home/indexer/uniswap-v3-indexer
git pull origin main
pnpm install
pnpm run codegen
pnpm run update-config
sudo systemctl restart uniswap-v3-indexer
```

```bash
# Make executable
chmod +x /home/indexer/update-indexer.sh
```

## 🔧 Bước 12: Monitoring & Maintenance

### 12.1. Check service status

```bash
# Check status
sudo systemctl status uniswap-v3-indexer

# Check if running
ps aux | grep envio
```

### 12.2. Restart service

```bash
# Restart service
sudo systemctl restart uniswap-v3-indexer

# Stop service
sudo systemctl stop uniswap-v3-indexer

# Start service
sudo systemctl start uniswap-v3-indexer
```

### 12.3. Check database

```bash
# Connect to database
psql -h localhost -U uniswap_v3_indexer -d uniswap_v3_indexer

# Check tables
\dt

# Check pool data
SELECT COUNT(*) FROM "Pool";

# Exit
\q
```

### 12.4. Check disk space

```bash
# Check disk usage
df -h

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('uniswap_v3_indexer'));"
```

## 🔧 Bước 13: Security Best Practices

### 13.1. File permissions

```bash
# Đảm bảo .env không readable bởi others
chmod 600 /home/indexer/uniswap-v3-indexer/.env

# Đảm bảo config files không readable bởi others
chmod 600 /home/indexer/uniswap-v3-indexer/config/alerts.config.local.json
```

### 13.2. Fail2ban (tùy chọn)

```bash
# Install fail2ban
sudo yum install -y fail2ban

# Start và enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 13.3. Regular updates

```bash
# Update system packages định kỳ
sudo yum update -y

# Update Node.js packages (nếu dùng NVM)
nvm install 20 --latest-npm
```

## 🐛 Troubleshooting

### Service không start

**Check logs:**
```bash
sudo journalctl -u uniswap-v3-indexer -n 50
```

**Common issues:**
- Missing environment variables → Check `.env` file
- Database connection failed → Check PostgreSQL status và credentials
- RPC connection failed → Check `RPC_URL_8453`
- Permission denied → Check file permissions và user

### Database connection failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql-15

# Check PostgreSQL logs
sudo tail -f /var/lib/pgsql/15/data/log/postgresql-*.log

# Test connection
psql -h localhost -U uniswap_v3_indexer -d uniswap_v3_indexer
```

### Out of memory

```bash
# Check memory usage
free -h

# Check process memory
ps aux --sort=-%mem | head

# Nếu cần, tăng swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Indexer chậm hoặc không index

```bash
# Check RPC connection
curl https://mainnet.base.org

# Check database performance
sudo -u postgres psql -d uniswap_v3_indexer -c "SELECT * FROM pg_stat_activity WHERE datname = 'uniswap_v3_indexer';"

# Check indexer logs
sudo journalctl -u uniswap-v3-indexer -f
```

## 📊 Monitoring Scripts

### Check indexer health

Tạo script `/home/indexer/check-indexer.sh`:

```bash
#!/bin/bash
if systemctl is-active --quiet uniswap-v3-indexer; then
    echo "✅ Indexer is running"
    ps aux | grep envio | grep -v grep
else
    echo "❌ Indexer is not running"
    sudo systemctl status uniswap-v3-indexer
fi
```

```bash
chmod +x /home/indexer/check-indexer.sh
```

### Auto-restart on failure

Systemd service đã có `Restart=always`, nhưng bạn có thể thêm monitoring script:

```bash
# Tạo cron job để check mỗi 5 phút
crontab -e

# Thêm dòng:
*/5 * * * * /home/indexer/check-indexer.sh
```

## 📝 Checklist

- [ ] Node.js 20 đã được cài đặt
- [ ] pnpm đã được cài đặt
- [ ] PostgreSQL đã được cài đặt và cấu hình
- [ ] Database đã được tạo
- [ ] Repository đã được clone
- [ ] Dependencies đã được install
- [ ] Codegen đã được chạy
- [ ] File `.env` đã được tạo và cấu hình
- [ ] Database migrations đã được chạy
- [ ] Systemd service đã được tạo và enable
- [ ] Service đang chạy và healthy
- [ ] Logs được ghi đúng
- [ ] Firewall đã được cấu hình (nếu cần)
- [ ] Security best practices đã được áp dụng

## 🚀 Quick Commands Reference

```bash
# Service management
sudo systemctl start uniswap-v3-indexer
sudo systemctl stop uniswap-v3-indexer
sudo systemctl restart uniswap-v3-indexer
sudo systemctl status uniswap-v3-indexer

# View logs
sudo journalctl -u uniswap-v3-indexer -f
sudo journalctl -u uniswap-v3-indexer -n 100

# Update và restart
cd /home/indexer/uniswap-v3-indexer
git pull
pnpm install
pnpm run codegen
pnpm run update-config
sudo systemctl restart uniswap-v3-indexer

# Check database
psql -h localhost -U uniswap_v3_indexer -d uniswap_v3_indexer

# Check disk space
df -h
du -sh /home/indexer/uniswap-v3-indexer
```

## 📚 Tài liệu tham khảo

- [CentOS 7 Documentation](https://www.centos.org/docs/)
- [Node.js Installation](https://nodejs.org/en/download/package-manager/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Systemd Service Guide](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

