/**
 * Monitoring Service
 * Theo dõi pools và positions, gửi alerts qua Telegram
 */

import {handlerContext, Pool, Position, Swap} from 'generated';
import TelegramBot from '../telegram/bot';
import AlertManager, {AlertConfig, PoolMetrics, PositionMetrics, SwapEvent} from './alerts';

interface MonitorConfig {
  telegram: {
    botToken: string;
    chatId: string;
  };
  alerts: AlertConfig;
  pools: string[]; // Pool addresses to monitor
  positions?: string[]; // Position owners to monitor (optional)
}

class PoolMonitor {
  private telegramBot: TelegramBot;
  private alertManager: AlertManager;
  private config: MonitorConfig;
  private context: handlerContext | null = null;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.telegramBot = new TelegramBot({
      botToken: config.telegram.botToken,
      chatId: config.telegram.chatId,
    });
    this.alertManager = new AlertManager(this.telegramBot, config.alerts);
    
    // Auto-load pools from pools.txt if pools array is empty
    if (config.pools.length === 0) {
      this.loadPoolsFromFile();
    }
  }

  /**
   * Load pools from pools.txt file
   */
  private loadPoolsFromFile(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const poolsFile = path.join(__dirname, '..', '..', 'pools.txt');
      
      if (fs.existsSync(poolsFile)) {
        const content = fs.readFileSync(poolsFile, 'utf8');
        const lines = content.split('\n');
        const pools: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const address = trimmed.split('#')[0].trim();
          if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
            pools.push(address);
          }
        }

        if (pools.length > 0) {
          this.config.pools = pools;
          console.log(`📝 Loaded ${pools.length} pools from pools.txt`);
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load pools from pools.txt:', error);
    }
  }

  /**
   * Initialize với Envio context
   */
  setContext(context: handlerContext) {
    this.context = context;
  }

  /**
   * Monitor pool metrics
   */
  async monitorPool(poolAddress: string): Promise<void> {
    if (!this.context) {
      console.error('Context not set. Call setContext() first.');
      return;
    }

    const poolId = `${this.context.chainId}-${poolAddress.toLowerCase()}`;
    const pool = await this.context.Pool.get(poolId);

    if (!pool) {
      console.warn(`Pool ${poolAddress} not found`);
      return;
    }

    const metrics: PoolMetrics = {
      address: poolAddress,
      volume0: pool.volume0.toString(),
      volume1: pool.volume1.toString(),
      fees0: pool.fees0.toString(),
      fees1: pool.fees1.toString(),
      swapCount: Number(pool.swapCount),
      liquidity: pool.liquidity.toString(),
      tvl0: pool.tvl0.toString(),
      tvl1: pool.tvl1.toString(),
      timestamp: Math.floor(Date.now() / 1000),
    };

    await this.alertManager.checkPoolPerformance(metrics);
  }

  /**
   * Monitor tất cả pools trong config
   */
  async monitorAllPools(): Promise<void> {
    for (const poolAddress of this.config.pools) {
      try {
        await this.monitorPool(poolAddress);
      } catch (error) {
        console.error(`Error monitoring pool ${poolAddress}:`, error);
      }
    }

    // Send periodic summary
    const pools: PoolMetrics[] = [];
    for (const poolAddress of this.config.pools) {
      if (!this.context) continue;
      const poolId = `${this.context.chainId}-${poolAddress.toLowerCase()}`;
      const pool = await this.context.Pool.get(poolId);
      if (pool) {
        pools.push({
          address: poolAddress,
          volume0: pool.volume0.toString(),
          volume1: pool.volume1.toString(),
          fees0: pool.fees0.toString(),
          fees1: pool.fees1.toString(),
          swapCount: Number(pool.swapCount),
          liquidity: pool.liquidity.toString(),
          tvl0: pool.tvl0.toString(),
          tvl1: pool.tvl1.toString(),
          timestamp: Math.floor(Date.now() / 1000),
        });
      }
    }
    await this.alertManager.sendPeriodicSummary(pools);
  }

  /**
   * Monitor position của một owner
   */
  async monitorPosition(positionId: string): Promise<void> {
    if (!this.context) {
      console.error('Context not set. Call setContext() first.');
      return;
    }

    const position = await this.context.Position.get(positionId);

    if (!position) {
      console.warn(`Position ${positionId} not found`);
      return;
    }

    const metrics: PositionMetrics = {
      id: positionId,
      owner: position.owner,
      poolAddress: position.pool_id.split('-')[1], // Extract address from pool_id
      deposited0: position.deposited0.toString(),
      deposited1: position.deposited1.toString(),
      fees0: position.fees0.toString(),
      fees1: position.fees1.toString(),
      tokensOwed0: position.tokensOwed0.toString(),
      tokensOwed1: position.tokensOwed1.toString(),
      timestamp: Math.floor(Date.now() / 1000),
    };

    await this.alertManager.checkPositionFees(metrics);
  }

  /**
   * Monitor swap events (for whale detection)
   */
  async monitorSwap(swap: Swap): Promise<void> {
    if (!this.context) return;

    // Get pool info
    const pool = await this.context.Pool.get(swap.pool_id);
    if (!pool) return;

    const token0 = await this.context.Token.get(pool.token0_id);
    const token1 = await this.context.Token.get(pool.token1_id);

    const swapEvent: SwapEvent = {
      poolAddress: swap.pool_id.split('-')[1],
      token0: token0?.symbol || 'Unknown',
      token1: token1?.symbol || 'Unknown',
      amount0: swap.amount0.toString(),
      amount1: swap.amount1.toString(),
      sender: swap.sender,
      recipient: swap.recipient,
      txHash: swap.transaction_id,
      timestamp: swap.timestamp,
    };

    await this.alertManager.checkWhaleActivity(swapEvent);
  }

  /**
   * Start monitoring loop
   */
  startMonitoring(intervalSeconds: number = 300): void {
    console.log(`Starting monitoring with ${intervalSeconds}s interval...`);
    
    // Initial check
    this.monitorAllPools().catch(console.error);

    // Periodic checks
    setInterval(() => {
      this.monitorAllPools().catch(console.error);
    }, intervalSeconds * 1000);
  }

  /**
   * Test Telegram connection
   */
  async testConnection(): Promise<boolean> {
    return this.telegramBot.testConnection();
  }
}

export default PoolMonitor;

