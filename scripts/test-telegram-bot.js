#!/usr/bin/env node

/**
 * Script để test Telegram Bot connection
 */

require('dotenv').config();

// Standalone Telegram Bot implementation (không cần import TypeScript)
class TelegramBot {
  constructor(config) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(text, parseMode = 'HTML') {
    try {
      const url = `${this.apiUrl}/sendMessage`;
      const payload = {
        chat_id: this.chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error('❌ Telegram API Error:', data.description || 'Unknown error');
        console.error('   Error Code:', data.error_code);
        if (data.parameters) {
          console.error('   Parameters:', JSON.stringify(data.parameters, null, 2));
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Network Error:', error.message);
      if (error.cause) {
        console.error('   Cause:', error.cause);
      }
      return false;
    }
  }

  async getMe() {
    try {
      const url = `${this.apiUrl}/getMe`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }

  async testConnection() {
    return this.sendMessage('✅ Telegram Bot connected successfully!');
  }
}

// Load từ .env hoặc config file
let botToken = process.env.TELEGRAM_BOT_TOKEN;
let chatId = process.env.TELEGRAM_CHAT_ID;

// Nếu không có trong .env, thử load từ config file
if (!botToken || !chatId) {
  try {
    const fs = require('fs');
    const path = require('path');
    const configFile = path.join(__dirname, '..', 'config', 'alerts.config.local.json');
    const defaultConfigFile = path.join(__dirname, '..', 'config', 'alerts.config.json');
    
    const configPath = fs.existsSync(configFile) ? configFile : defaultConfigFile;
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      botToken = botToken || config.telegram?.botToken;
      chatId = chatId || config.telegram?.chatId;
    }
  } catch (error) {
    // Ignore
  }
}

if (!botToken || !chatId) {
  console.error('❌ Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID');
  console.log('\n💡 Có thể thêm vào:');
  console.log('  1. File .env:');
  console.log('     TELEGRAM_BOT_TOKEN=your_bot_token');
  console.log('     TELEGRAM_CHAT_ID=your_chat_id');
  console.log('  2. Hoặc file config/alerts.config.json');
  process.exit(1);
}

const bot = new TelegramBot({
  botToken,
  chatId,
});

console.log('🔍 Testing Telegram Bot connection...\n');
console.log(`📱 Bot Token: ${botToken.substring(0, 10)}...`);
console.log(`💬 Chat ID: ${chatId}\n`);

// Test 1: Verify bot token
console.log('1️⃣  Testing bot token...');
bot.getMe()
  .then((botInfo) => {
    if (botInfo && botInfo.ok) {
      console.log(`   ✅ Bot verified: @${botInfo.result.username} (${botInfo.result.first_name})`);
      
      // Test 2: Send message
      console.log('\n2️⃣  Sending test message...');
      return bot.testConnection();
    } else {
      console.log('   ❌ Invalid bot token!');
      console.log('   Response:', JSON.stringify(botInfo, null, 2));
      return false;
    }
  })
  .then((success) => {
    if (success) {
      console.log('   ✅ Message sent successfully!');
      console.log('\n✅ Bot connected successfully!');
      console.log('💬 Check your Telegram for the test message.');
    } else {
      console.log('   ❌ Failed to send message.');
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Đảm bảo bot token đúng');
      console.log('   2. Đảm bảo chat ID đúng (có thể là số âm cho groups)');
      console.log('   3. Nếu là group chat:');
      console.log('      - Bot phải được thêm vào group');
      console.log('      - Bot phải có quyền gửi message');
      console.log('   4. Nếu là private chat:');
      console.log('      - Bạn phải gửi /start cho bot trước');
      console.log('   5. Test chat ID bằng cách:');
      console.log(`      - Truy cập: https://api.telegram.org/bot${botToken}/getUpdates`);
      console.log('      - Tìm "chat":{"id":...} trong response');
    }
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  });

