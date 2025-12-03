# Hướng dẫn Monitoring và Alerts qua Telegram

## 📋 Tổng quan

Hệ thống monitoring cho phép bạn:
- ✅ Theo dõi performance của pools
- ✅ Phát hiện whale activity (large swaps)
- ✅ Monitor positions và fees
- ✅ Nhận alerts real-time qua Telegram
- ✅ Nhận summary hàng ngày/tuần

## 🚀 Setup

### 1. Tạo Telegram Bot

Xem file [scripts/setup-telegram-bot.md](./scripts/setup-telegram-bot.md) để biết chi tiết.

Tóm tắt:
1. Tạo bot qua [@BotFather](https://t.me/BotFather)
2. Lấy Bot Token
3. Lấy Chat ID của bạn
4. Thêm vào `.env`:
   ```bash
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

### 2. Test Connection

```bash
pnpm run test-telegram
```

Nếu thành công, bạn sẽ nhận message trên Telegram.

### 3. Cấu hình Alerts

Tạo file `config/alerts.config.local.json`:

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
  "pools": [],
  "positions": []
}
```

**Lưu ý quan trọng**: 
- Để `pools` array trống `[]` - pools sẽ tự động được load từ `pools.txt`
- Hoặc chạy script để sync: `pnpm run update-alerts-config`
- Script `update-config` sẽ tự động sync alerts config khi cập nhật `pools.txt`

**Giải thích thresholds:**
- `minVolume`: Volume tối thiểu (token0) để trigger alert
- `minFees`: Fees tối thiểu (token0) để trigger alert
- `minSwapAmount`: Swap amount tối thiểu để phát hiện whale
- `feesThreshold`: Fees tối thiểu trong position để alert

**Giải thích intervals:**
- `summary`: `"daily"` (hàng ngày), `"weekly"` (hàng tuần), hoặc `"none"` (tắt)
- `checkInterval`: Khoảng thời gian check (giây), mặc định 300 (5 phút)

**Tự động sync pools từ pools.txt:**
- Để `pools` array trống `[]` - hệ thống sẽ tự động load từ `pools.txt`
- Hoặc chạy: `pnpm run update-alerts-config` để sync thủ công
- Script `update-config` sẽ tự động sync alerts config khi cập nhật `pools.txt`

## 📊 Các loại Alerts

### 1. Pool Performance Alerts

**Khi nào trigger:**
- Volume vượt quá `minVolume`
- Fees vượt quá `minFees`

**Ví dụ message:**
```
💹 High Volume Alert

📍 Pool: 0x16905890A1D02b6F824387419319Bf4188B961b0
⏰ Time: 12/25/2024, 10:30:00 AM

• Volume (Token0): 1,500,000
• Volume (Token1): 2,300,000
• Swaps: 1,234
• Liquidity: 5,000,000
```

### 2. Whale Activity Alerts

**Khi nào trigger:**
- Swap amount vượt quá `minSwapAmount`

**Ví dụ message:**
```
🐋 Whale Activity Detected!

📍 Pool: 0x16905890A1D02b6F824387419319Bf4188B961b0
💱 Pair: USDC / ETH

💰 Amount:
  • Token0: 1,000,000
  • Token1: 500

👤 Sender: 0x1234...5678
🔗 TX: 0xabcd...efgh
⏰ Time: 12/25/2024, 10:30:00 AM
```

### 3. Position Fees Alerts

**Khi nào trigger:**
- Position fees vượt quá `feesThreshold`

**Ví dụ message:**
```
💰 Position Alert

👤 Owner: 0x1234...5678
📍 Pool: 0x16905890A1D02b6F824387419319Bf4188B961b0
🆔 Position: 0xpool...owner...tickLower...tickUpper

• Accrued Fees (Token0): 5,000
• Accrued Fees (Token1): 10
• Tokens Owed (Token0): 5,000
• Tokens Owed (Token1): 10
• Deposited: 100,000 / 50
```

### 4. Daily/Weekly Summary

**Khi nào gửi:**
- Hàng ngày (nếu `summary: "daily"`)
- Hàng tuần (nếu `summary: "weekly"`)

**Ví dụ message:**
```
📊 Daily Summary

⏰ Period: 12/25/2024
📈 Total Pools: 3
💹 Total Volume: 5,000,000
💰 Total Fees: 50,000
🔄 Total Swaps: 10,000

1. Pool 0x1690589...
  • Volume: 2,000,000
  • Fees: 20,000
  • Swaps: 4,000
...
```

## 🔧 Tích hợp vào Indexer

### Cách 1: Tích hợp vào Event Handlers

Thêm vào `src/handlers/swap.ts`:

```typescript
import PoolMonitor from '../monitoring/monitor';

// Khởi tạo monitor (chỉ một lần)
let monitor: PoolMonitor | null = null;

function getMonitor(): PoolMonitor {
  if (!monitor) {
    const config = require('../../config/alerts.config.local.json');
    monitor = new PoolMonitor(config);
    monitor.setContext(context);
  }
  return monitor;
}

UniswapV3Pool.Swap.handler(async ({event, context}) => {
  // ... existing code ...

  // Monitor swap for whale detection
  const monitor = getMonitor();
  await monitor.monitorSwap(swapEntity);
});
```

### Cách 2: Chạy Monitoring Service riêng

Tạo file `src/services/monitoring-service.ts`:

```typescript
import PoolMonitor from '../monitoring/monitor';
import {handlerContext} from 'generated';

async function startMonitoringService(context: handlerContext) {
  const config = require('../../config/alerts.config.local.json');
  const monitor = new PoolMonitor(config);
  monitor.setContext(context);

  // Test connection
  await monitor.testConnection();

  // Start monitoring loop (check every 5 minutes)
  monitor.startMonitoring(300);
}

export default startMonitoringService;
```

Sau đó gọi trong `generated/src/Index.res.js` hoặc tạo script riêng.

## 📝 Use Cases

### Use Case 1: Monitor Pool Riêng

```json
{
  "pools": ["0xYourPoolAddress"],
  "alerts": {
    "thresholds": {
      "minVolume": 500000,
      "minFees": 5000
    }
  }
}
```

**Lợi ích:**
- ✅ Biết khi pool có volume cao
- ✅ Biết khi fees đã tích lũy đủ để collect
- ✅ Track performance real-time

### Use Case 2: Monitor Pool Người Khác

```json
{
  "pools": [
    "0xCompetitorPool1",
    "0xCompetitorPool2",
    "0xCompetitorPool3"
  ],
  "alerts": {
    "thresholds": {
      "minSwapAmount": 1000000
    }
  }
}
```

**Lợi ích:**
- ✅ Phát hiện whale activity
- ✅ Market intelligence
- ✅ Arbitrage opportunities

### Use Case 3: Monitor Positions

```json
{
  "positions": [
    "0xYourAddress"
  ],
  "alerts": {
    "thresholds": {
      "feesThreshold": 1000
    }
  }
}
```

**Lợi ích:**
- ✅ Biết khi nào nên collect fees
- ✅ Track performance của positions
- ✅ Optimize capital allocation

## 🚨 Troubleshooting

### Bot không gửi message

1. **Kiểm tra Bot Token và Chat ID:**
   ```bash
   pnpm run test-telegram
   ```

2. **Kiểm tra bot đã được start chưa:**
   - Gửi `/start` cho bot trên Telegram

3. **Kiểm tra Chat ID đúng chưa:**
   - Truy cập: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Tìm chat ID trong response

### Alerts không trigger

1. **Kiểm tra thresholds:**
   - Có thể thresholds quá cao
   - Giảm thresholds để test

2. **Kiểm tra enabled:**
   - Đảm bảo `"enabled": true` trong config

3. **Kiểm tra intervals:**
   - `checkInterval` có thể quá dài
   - Giảm xuống 60 giây để test

### Too many alerts

1. **Tăng thresholds:**
   - Tăng `minVolume`, `minFees`, `minSwapAmount`

2. **Tăng checkInterval:**
   - Tăng `checkInterval` để check ít hơn

3. **Tắt summary:**
   - Set `"summary": "none"`

## 🔐 Security

- ⚠️ **KHÔNG** commit Bot Token lên GitHub
- ⚠️ **KHÔNG** commit Chat ID lên GitHub
- ✅ Sử dụng environment variables
- ✅ Sử dụng `.gitignore` cho config files
- ✅ Sử dụng secrets trong Render Dashboard

## 📚 Tài liệu tham khảo

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Setup Telegram Bot](./scripts/setup-telegram-bot.md)
- [Use Cases](./USE_CASES.md)

