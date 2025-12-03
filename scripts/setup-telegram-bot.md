# Hướng dẫn Setup Telegram Bot

## Bước 1: Tạo Telegram Bot

1. Mở Telegram và tìm [@BotFather](https://t.me/BotFather)
2. Gửi lệnh `/newbot`
3. Làm theo hướng dẫn:
   - Đặt tên cho bot (ví dụ: "Uniswap V3 Monitor")
   - Đặt username cho bot (phải kết thúc bằng `bot`, ví dụ: `uniswap_v3_monitor_bot`)
4. BotFather sẽ trả về **Bot Token** (dạng: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Lưu token này lại

## Bước 2: Lấy Chat ID

Có 2 cách:

### Cách 1: Chat với bot trước

1. Tìm bot bạn vừa tạo trên Telegram
2. Gửi bất kỳ message nào cho bot
3. Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Tìm `"chat":{"id":123456789}` trong response
5. Số `123456789` chính là Chat ID

### Cách 2: Dùng @userinfobot

1. Tìm [@userinfobot](https://t.me/userinfobot) trên Telegram
2. Gửi `/start`
3. Bot sẽ trả về ID của bạn (đây chính là Chat ID)

## Bước 3: Cấu hình trong dự án

1. Copy file `config/alerts.config.json`:
   ```bash
   cp config/alerts.config.json config/alerts.config.local.json
   ```

2. Chỉnh sửa `config/alerts.config.local.json`:
   ```json
   {
     "telegram": {
       "botToken": "YOUR_BOT_TOKEN_HERE",
       "chatId": "YOUR_CHAT_ID_HERE"
     },
     ...
   }
   ```

3. **QUAN TRỌNG**: Thêm vào `.gitignore`:
   ```
   config/alerts.config.local.json
   ```

4. Thêm vào `.env` (hoặc Render Dashboard):
   ```
   TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
   TELEGRAM_CHAT_ID=YOUR_CHAT_ID
   ```

## Bước 4: Test Bot

Chạy script test:
```bash
node scripts/test-telegram-bot.js
```

Nếu thành công, bạn sẽ nhận được message trên Telegram: "✅ Telegram Bot connected successfully!"

## Lưu ý bảo mật

- ⚠️ **KHÔNG** commit Bot Token lên GitHub
- ⚠️ **KHÔNG** commit Chat ID lên GitHub
- ✅ Sử dụng environment variables
- ✅ Sử dụng `.gitignore` cho config files local

