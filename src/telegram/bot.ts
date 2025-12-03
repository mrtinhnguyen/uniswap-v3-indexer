/**
 * Telegram Bot Service
 * Gửi thông báo real-time qua Telegram Bot API
 */

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

class TelegramBot {
  private botToken: string;
  private chatId: string;
  private apiUrl: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Gửi message đơn giản
   */
  async sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      const data = await response.json() as {ok: boolean};
      return data.ok === true;
    } catch (error) {
      console.error('Telegram sendMessage error:', error);
      return false;
    }
  }

  /**
   * Gửi message với format đẹp cho pool alerts
   */
  async sendPoolAlert(poolAddress: string, data: {
    type: 'performance' | 'whale' | 'volume' | 'fees';
    title: string;
    metrics: Record<string, string | number>;
    timestamp: number;
  }): Promise<boolean> {
    const emoji = {
      performance: '📈',
      whale: '🐋',
      volume: '💹',
      fees: '💰',
    }[data.type];

    const message = `
${emoji} <b>${data.title}</b>

📍 <b>Pool:</b> <code>${poolAddress}</code>
⏰ <b>Time:</b> ${new Date(data.timestamp * 1000).toLocaleString()}

${Object.entries(data.metrics)
  .map(([key, value]) => `• <b>${key}:</b> ${value}`)
  .join('\n')}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Gửi alert về position
   */
  async sendPositionAlert(positionId: string, data: {
    owner: string;
    poolAddress: string;
    action: 'mint' | 'burn' | 'collect' | 'fees_threshold';
    details: Record<string, string | number>;
  }): Promise<boolean> {
    const emoji = {
      mint: '➕',
      burn: '➖',
      collect: '💵',
      fees_threshold: '💰',
    }[data.action];

    const message = `
${emoji} <b>Position Alert</b>

👤 <b>Owner:</b> <code>${data.owner.slice(0, 10)}...${data.owner.slice(-8)}</code>
📍 <b>Pool:</b> <code>${data.poolAddress}</code>
🆔 <b>Position:</b> <code>${positionId}</code>

${Object.entries(data.details)
  .map(([key, value]) => `• <b>${key}:</b> ${value}`)
  .join('\n')}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Gửi alert về whale activity
   */
  async sendWhaleAlert(data: {
    poolAddress: string;
    token0: string;
    token1: string;
    amount0: string;
    amount1: string;
    sender: string;
    txHash: string;
    timestamp: number;
  }): Promise<boolean> {
    const message = `
🐋 <b>Whale Activity Detected!</b>

📍 <b>Pool:</b> <code>${data.poolAddress}</code>
💱 <b>Pair:</b> ${data.token0} / ${data.token1}

💰 <b>Amount:</b>
  • Token0: ${data.amount0}
  • Token1: ${data.amount1}

👤 <b>Sender:</b> <code>${data.sender.slice(0, 10)}...${data.sender.slice(-8)}</code>
🔗 <b>TX:</b> <code>${data.txHash}</code>
⏰ <b>Time:</b> ${new Date(data.timestamp * 1000).toLocaleString()}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Gửi daily/weekly summary
   */
  async sendSummary(data: {
    period: 'daily' | 'weekly';
    pools: Array<{
      address: string;
      volume0: string;
      volume1: string;
      fees0: string;
      fees1: string;
      swapCount: number;
    }>;
    timestamp: number;
  }): Promise<boolean> {
    const periodText = data.period === 'daily' ? 'Daily' : 'Weekly';
    const totalVolume0 = data.pools.reduce((sum, p) => sum + parseFloat(p.volume0), 0);
    const totalFees0 = data.pools.reduce((sum, p) => sum + parseFloat(p.fees0), 0);
    const totalSwaps = data.pools.reduce((sum, p) => sum + p.swapCount, 0);

    const message = `
📊 <b>${periodText} Summary</b>

⏰ <b>Period:</b> ${new Date(data.timestamp * 1000).toLocaleDateString()}
📈 <b>Total Pools:</b> ${data.pools.length}
💹 <b>Total Volume:</b> ${totalVolume0.toLocaleString()}
💰 <b>Total Fees:</b> ${totalFees0.toLocaleString()}
🔄 <b>Total Swaps:</b> ${totalSwaps.toLocaleString()}

${data.pools.slice(0, 5).map((pool, idx) => `
<b>${idx + 1}. Pool ${pool.address.slice(0, 10)}...</b>
  • Volume: ${pool.volume0}
  • Fees: ${pool.fees0}
  • Swaps: ${pool.swapCount}
`).join('\n')}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    return this.sendMessage('✅ Telegram Bot connected successfully!');
  }
}

export default TelegramBot;

