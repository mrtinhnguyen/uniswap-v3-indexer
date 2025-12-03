#!/bin/bash

# Script tạo systemd service cho indexer
# Chạy với: sudo bash scripts/vps/create-systemd-service.sh

set -e

SERVICE_NAME="uniswap-v3-indexer"
USER="indexer"
WORK_DIR="/home/indexer/uniswap-v3-indexer"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "📝 Creating systemd service for ${SERVICE_NAME}..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Script này cần chạy với quyền root hoặc sudo"
    exit 1
fi

# Check if user exists
if ! id "$USER" &>/dev/null; then
    echo "❌ User '$USER' không tồn tại. Tạo user trước:"
    echo "   useradd -m -s /bin/bash $USER"
    exit 1
fi

# Check if work directory exists
if [ ! -d "$WORK_DIR" ]; then
    echo "⚠️  Directory $WORK_DIR không tồn tại"
    read -p "Bạn có muốn tiếp tục không? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create service file
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Uniswap V3 Indexer
After=network.target postgresql-15.service
Requires=postgresql-15.service

[Service]
Type=simple
User=${USER}
WorkingDirectory=${WORK_DIR}
Environment="NODE_ENV=production"
EnvironmentFile=${WORK_DIR}/.env
ExecStart=/usr/bin/env NODE_OPTIONS='--max-old-space-size=2048' /usr/bin/pnpm run start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: $SERVICE_FILE"

# Reload systemd
systemctl daemon-reload

echo "✅ Systemd daemon reloaded"

# Enable service
systemctl enable ${SERVICE_NAME}

echo "✅ Service enabled (will start on boot)"

echo ""
echo "📝 Các lệnh hữu ích:"
echo "  Start service:   sudo systemctl start ${SERVICE_NAME}"
echo "  Stop service:    sudo systemctl stop ${SERVICE_NAME}"
echo "  Restart service: sudo systemctl restart ${SERVICE_NAME}"
echo "  Status:          sudo systemctl status ${SERVICE_NAME}"
echo "  View logs:       sudo journalctl -u ${SERVICE_NAME} -f"

