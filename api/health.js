/**
 * Health check endpoint cho Render
 * Render sẽ check endpoint này để đảm bảo service đang chạy
 */

export default async function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'uniswap-v3-indexer',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
