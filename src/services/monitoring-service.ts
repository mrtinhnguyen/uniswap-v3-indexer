/**
 * Monitoring Service
 * Tự động khởi động monitoring khi indexer start
 */

import PoolMonitor from '../monitoring/monitor';
import {handlerContext} from 'generated';
import * as fs from 'fs';
import * as path from 'path';

let monitorInstance: PoolMonitor | null = null;

/**
 * Khởi động monitoring service
 */
export async function startMonitoringService(context: handlerContext): Promise<void> {
  try {
    // Load config từ alerts.config.local.json hoặc alerts.config.json
    const configPath = path.join(__dirname, '..', '..', 'config', 'alerts.config.local.json');
    const defaultConfigPath = path.join(__dirname, '..', '..', 'config', 'alerts.config.json');
    
    const configFile = fs.existsSync(configPath) ? configPath : defaultConfigPath;
    
    if (!fs.existsSync(configFile)) {
      console.log('⚠️  Monitoring config not found. Skipping monitoring service.');
      return;
    }

    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

    // Kiểm tra nếu monitoring được enable
    if (!config.alerts?.enabled) {
      console.log('ℹ️  Monitoring is disabled in config.');
      return;
    }

    // Kiểm tra telegram config
    if (!config.telegram?.botToken || !config.telegram?.chatId) {
      console.log('⚠️  Telegram bot token or chat ID not configured. Skipping monitoring.');
      return;
    }

    console.log('🚀 Starting monitoring service...');
    
    // Khởi tạo monitor
    monitorInstance = new PoolMonitor(config);
    monitorInstance.setContext(context);

    // Test connection
    const connected = await monitorInstance.testConnection();
    if (connected) {
      console.log('✅ Telegram Bot connected successfully!');
    } else {
      console.log('⚠️  Telegram Bot connection failed. Monitoring will continue but alerts may not work.');
    }

    // Start monitoring loop
    const checkInterval = config.alerts?.intervals?.checkInterval || 300;
    monitorInstance.startMonitoring(checkInterval);
    
    console.log(`✅ Monitoring service started (check interval: ${checkInterval}s)`);
  } catch (error) {
    console.error('❌ Failed to start monitoring service:', error);
    // Không throw error để không block indexer
  }
}

/**
 * Get monitor instance (nếu cần dùng trong handlers)
 */
export function getMonitor(): PoolMonitor | null {
  return monitorInstance;
}

