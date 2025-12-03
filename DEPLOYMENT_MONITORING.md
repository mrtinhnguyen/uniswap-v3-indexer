# Hướng dẫn Deploy với Monitoring & Telegram Alerts

## ✅ Hệ thống đã tự động hóa

Hệ thống monitoring đã được tích hợp tự động vào indexer. Khi deploy lên Render, chỉ cần:

1. ✅ **Config pools từ `pools.txt`** - Tự động sync vào `config.yaml` và `alerts.config.json`
2. ✅ **Monitoring tự động start** - Khi indexer khởi động, monitoring service sẽ tự động chạy
3. ✅ **Telegram alerts** - Tự động gửi alerts khi có events

## 🚀 Deploy lên Render

### Bước 1: Setup Telegram Bot (Nếu chưa có)

1. Tạo bot qua [@BotFather](https://t.me/BotFather)
2. Lấy Bot Token và Chat ID
3. Xem chi tiết: [scripts/setup-telegram-bot.md](./scripts/setup-telegram-bot.md)

### Bước 2: Cấu hình Config

**Option 1: Commit config vào repo (Không khuyến nghị cho production)**

Tạo file `config/alerts.config.local.json` và commit:
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  },
  "alerts": {
    "enabled": true,
    "thresholds": {
      "minVolume": 1000000,
      "minFees": 10000,
      "minSwapAmount": 100000,
      "feesThreshold": 1000
    },
    "intervals": {
      "summary": "daily",
      "checkInterval": 300
    }
  },
  "pools": []
}
```

**Option 2: Sử dụng Environment Variables (Khuyến nghị)**

Không commit config file, thay vào đó set trong Render Dashboard.

### Bước 3: Deploy lên Render

1. **Kết nối GitHub repo**:
   - Vào [Render Dashboard](https://dashboard.render.com)
   - New > Blueprint (nếu có file `render.yaml`)
   - Connect GitHub repo

2. **Cấu hình Environment Variables trong Render Dashboard**:
   ```
   # RPC URL (BẮT BUỘC)
   RPC_URL_8453=https://mainnet.base.org
   # Hoặc RPC riêng của bạn
   
   # Database (BẮT BUỘC)
   ENVIO_PG_HOST=your_db_host
   ENVIO_PG_PORT=5432
   ENVIO_PG_USER=your_db_user
   ENVIO_POSTGRES_PASSWORD=your_db_password
   ENVIO_PG_DATABASE=your_db_name
   
   # Telegram Bot (Nếu muốn dùng monitoring)
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

3. **Tạo config file từ environment variables** (nếu dùng Option 2):

   Thêm vào `render.yaml` hoặc tạo script build:
   ```yaml
   buildCommand: |
     corepack enable && corepack prepare pnpm@latest --activate && 
     pnpm install && 
     pnpm run codegen &&
     node scripts/create-alerts-config-from-env.js
   ```

   Tạo file `scripts/create-alerts-config-from-env.js`:
   ```javascript
   const fs = require('fs');
   const path = require('path');
   
   const config = {
     telegram: {
       botToken: process.env.TELEGRAM_BOT_TOKEN || '',
       chatId: process.env.TELEGRAM_CHAT_ID || '',
     },
     alerts: {
       enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
       thresholds: {
         minVolume: parseInt(process.env.MIN_VOLUME || '1000000'),
         minFees: parseInt(process.env.MIN_FEES || '10000'),
         minSwapAmount: parseInt(process.env.MIN_SWAP_AMOUNT || '100000'),
         feesThreshold: parseInt(process.env.FEES_THRESHOLD || '1000'),
       },
       intervals: {
         summary: process.env.ALERT_SUMMARY || 'daily',
         checkInterval: parseInt(process.env.CHECK_INTERVAL || '300'),
       },
     },
     pools: [],
     positions: [],
   };
   
   const configPath = path.join(__dirname, '..', 'config', 'alerts.config.local.json');
   fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
   console.log('✅ Created alerts.config.local.json from environment variables');
   ```

4. **Deploy**:
   - Render sẽ tự động detect `render.yaml`
   - Build command sẽ chạy `update-config` (sync pools từ `pools.txt`)
   - Start command sẽ start indexer + monitoring service

### Bước 4: Verify

1. **Check logs trong Render Dashboard**:
   - Bạn sẽ thấy: `🚀 Starting monitoring service...`
   - Nếu thành công: `✅ Telegram Bot connected successfully!`
   - Nếu không: `⚠️  Telegram Bot connection failed...`

2. **Test Telegram**:
   - Gửi message test trong Telegram
   - Hoặc đợi alert đầu tiên

## 📋 Checklist trước khi Deploy

- [ ] Telegram Bot đã được tạo và có token
- [ ] Chat ID đã được lấy (test bằng `pnpm run test-telegram`)
- [ ] `pools.txt` đã có danh sách pools cần monitor
- [ ] Environment variables đã được set trong Render Dashboard:
  - [ ] `RPC_URL_8453`
  - [ ] `ENVIO_PG_*` (database config)
  - [ ] `TELEGRAM_BOT_TOKEN` (nếu dùng monitoring)
  - [ ] `TELEGRAM_CHAT_ID` (nếu dùng monitoring)
- [ ] Database đã được setup và accessible từ Render

## 🔧 Tự động hóa

### 1. Auto-sync Pools

Khi bạn cập nhật `pools.txt` trên GitHub:
1. GitHub Action tự động cập nhật `config.yaml`
2. GitHub Action tự động cập nhật `alerts.config.json`
3. Render tự động detect commit mới và rebuild
4. Indexer restart với pools mới

### 2. Auto-start Monitoring

Khi indexer start:
1. Tự động load config từ `alerts.config.local.json` hoặc `alerts.config.json`
2. Tự động load pools từ `pools.txt` nếu pools array trống
3. Tự động start monitoring service nếu enabled
4. Tự động test Telegram connection
5. Tự động start monitoring loop

### 3. Auto-alerts

Khi có events:
1. Swap events → Tự động check whale activity
2. Pool metrics → Tự động check performance thresholds
3. Position fees → Tự động check fees thresholds
4. Periodic → Tự động gửi daily/weekly summary

## 🐛 Troubleshooting

### Monitoring không start

**Kiểm tra:**
1. Config file có tồn tại không: `config/alerts.config.local.json` hoặc `config/alerts.config.json`
2. `alerts.enabled` có = `true` không
3. Telegram bot token và chat ID có đúng không
4. Check logs trong Render Dashboard

### Alerts không gửi được

**Kiểm tra:**
1. Telegram bot connection: `✅ Telegram Bot connected successfully!`
2. Chat ID đúng (test bằng `pnpm run test-telegram`)
3. Bot đã được thêm vào group (nếu là group chat)
4. Bot có quyền gửi message

### Pools không được monitor

**Kiểm tra:**
1. `pools.txt` có pools không
2. Pools array trong config có đúng không
3. Pools có trong database không (indexer đã index chưa)

## 📝 Lưu ý

- ⚠️ **KHÔNG** commit bot token vào GitHub (dùng environment variables)
- ✅ Pools tự động sync từ `pools.txt`
- ✅ Monitoring tự động start khi indexer start
- ✅ Alerts tự động gửi khi có events

## 🎯 Kết luận

**Chỉ cần deploy lên Render là chạy!** Hệ thống đã được tự động hóa hoàn toàn:
- ✅ Auto-sync pools từ `pools.txt`
- ✅ Auto-start monitoring
- ✅ Auto-send alerts

Bạn chỉ cần:
1. Setup Telegram Bot
2. Set environment variables trong Render
3. Deploy!

