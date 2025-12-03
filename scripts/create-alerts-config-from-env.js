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
