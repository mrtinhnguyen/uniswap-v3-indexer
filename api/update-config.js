/**
 * API endpoint để cập nhật config.yaml từ pools.txt
 * Có thể được gọi từ GitHub webhook hoặc thủ công
 * 
 * Lưu ý: Vercel không phù hợp để chạy indexer (long-running process)
 * Endpoint này chỉ để trigger update, không chạy indexer
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  // Chỉ cho phép POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Kiểm tra secret token (nếu có)
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  const expectedToken = process.env.UPDATE_CONFIG_SECRET;

  if (expectedToken && authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Lưu ý: Vercel là serverless, không thể chạy long-running processes
    // Endpoint này chỉ để thông báo, thực tế cần dùng GitHub Actions
    
    return res.status(200).json({
      success: true,
      message: 'Use GitHub Actions to update config.yaml automatically',
      note: 'Vercel is not suitable for running blockchain indexers. Use Railway, Render, or VPS instead.',
      workflow: 'When you push pools.txt to GitHub, the GitHub Action will automatically update config.yaml',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Failed',
      message: error.message,
    });
  }
}

