/**
 * Alert System
 * Định nghĩa các loại alerts và conditions
 */

import TelegramBot from '../telegram/bot';

export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    minVolume?: number;
    minFees?: number;
    minSwapAmount?: number; // For whale detection
    feesThreshold?: number; // For position fees alert
  };
  intervals: {
    summary?: 'daily' | 'weekly' | 'none';
    checkInterval?: number; // seconds
  };
}

export interface PoolMetrics {
  address: string;
  volume0: string;
  volume1: string;
  fees0: string;
  fees1: string;
  swapCount: number;
  liquidity: string;
  tvl0: string;
  tvl1: string;
  timestamp: number;
}

export interface PositionMetrics {
  id: string;
  owner: string;
  poolAddress: string;
  deposited0: string;
  deposited1: string;
  fees0: string;
  fees1: string;
  tokensOwed0: string;
  tokensOwed1: string;
  timestamp: number;
}

export interface SwapEvent {
  poolAddress: string;
  token0: string;
  token1: string;
  amount0: string;
  amount1: string;
  sender: string;
  recipient: string;
  txHash: string;
  timestamp: number;
}

class AlertManager {
  private telegramBot: TelegramBot;
  private config: AlertConfig;
  private lastChecked: Map<string, number> = new Map();
  private lastSummarySent: number = 0;

  constructor(telegramBot: TelegramBot, config: AlertConfig) {
    this.telegramBot = telegramBot;
    this.config = config;
  }

  /**
   * Check pool performance và gửi alert nếu đạt threshold
   */
  async checkPoolPerformance(pool: PoolMetrics): Promise<void> {
    if (!this.config.enabled) return;

    const key = `pool_perf_${pool.address}`;
    const lastCheck = this.lastChecked.get(key) || 0;
    const now = Math.floor(Date.now() / 1000);
    
    // Chỉ check theo interval
    if (now - lastCheck < (this.config.intervals.checkInterval || 300)) {
      return;
    }

    const volume0 = parseFloat(pool.volume0);
    const fees0 = parseFloat(pool.fees0);

    // Check volume threshold
    if (this.config.thresholds.minVolume && volume0 >= this.config.thresholds.minVolume) {
      await this.telegramBot.sendPoolAlert(pool.address, {
        type: 'volume',
        title: 'High Volume Alert',
        metrics: {
          'Volume (Token0)': volume0.toLocaleString(),
          'Volume (Token1)': pool.volume1,
          'Swaps': pool.swapCount.toLocaleString(),
          'Liquidity': pool.liquidity,
        },
        timestamp: pool.timestamp,
      });
    }

    // Check fees threshold
    if (this.config.thresholds.minFees && fees0 >= this.config.thresholds.minFees) {
      await this.telegramBot.sendPoolAlert(pool.address, {
        type: 'fees',
        title: 'High Fees Accumulated',
        metrics: {
          'Fees (Token0)': fees0.toLocaleString(),
          'Fees (Token1)': pool.fees1,
          'Total Swaps': pool.swapCount.toLocaleString(),
          'TVL': `${pool.tvl0} / ${pool.tvl1}`,
        },
        timestamp: pool.timestamp,
      });
    }

    this.lastChecked.set(key, now);
  }

  /**
   * Check whale activity (large swaps)
   */
  async checkWhaleActivity(swap: SwapEvent): Promise<void> {
    if (!this.config.enabled) return;

    const minAmount = this.config.thresholds.minSwapAmount || 0;
    const amount0 = Math.abs(parseFloat(swap.amount0));
    const amount1 = Math.abs(parseFloat(swap.amount1));

    if (amount0 >= minAmount || amount1 >= minAmount) {
      await this.telegramBot.sendWhaleAlert({
        poolAddress: swap.poolAddress,
        token0: swap.token0,
        token1: swap.token1,
        amount0: amount0.toLocaleString(),
        amount1: amount1.toLocaleString(),
        sender: swap.sender,
        txHash: swap.txHash,
        timestamp: swap.timestamp,
      });
    }
  }

  /**
   * Check position fees và gửi alert nếu đạt threshold
   */
  async checkPositionFees(position: PositionMetrics): Promise<void> {
    if (!this.config.enabled) return;

    const fees0 = parseFloat(position.fees0);
    const fees1 = parseFloat(position.fees1);
    const threshold = this.config.thresholds.feesThreshold || 0;

    if (fees0 >= threshold || fees1 >= threshold) {
      await this.telegramBot.sendPositionAlert(position.id, {
        owner: position.owner,
        poolAddress: position.poolAddress,
        action: 'fees_threshold',
        details: {
          'Accrued Fees (Token0)': fees0.toLocaleString(),
          'Accrued Fees (Token1)': fees1.toLocaleString(),
          'Tokens Owed (Token0)': position.tokensOwed0,
          'Tokens Owed (Token1)': position.tokensOwed1,
          'Deposited': `${position.deposited0} / ${position.deposited1}`,
        },
      });
    }
  }

  /**
   * Gửi summary theo định kỳ
   */
  async sendPeriodicSummary(pools: PoolMetrics[]): Promise<void> {
    if (!this.config.enabled || !this.config.intervals.summary) return;

    const now = Math.floor(Date.now() / 1000);
    const interval = this.config.intervals.summary === 'daily' ? 86400 : 604800; // 1 day or 1 week

    if (now - this.lastSummarySent < interval) {
      return;
    }

    await this.telegramBot.sendSummary({
      period: this.config.intervals.summary,
      pools: pools.map(p => ({
        address: p.address,
        volume0: p.volume0,
        volume1: p.volume1,
        fees0: p.fees0,
        fees1: p.fees1,
        swapCount: p.swapCount,
      })),
      timestamp: now,
    });

    this.lastSummarySent = now;
  }
}

export default AlertManager;

