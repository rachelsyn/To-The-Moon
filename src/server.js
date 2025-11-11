import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import tradingEngine from './trading/tradingEngine.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

/**
 * GET /api/status
 * Get bot status
 */
app.get('/api/status', (req, res) => {
  try {
    const status = tradingEngine.getStatus();
    res.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error('Failed to get status', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/portfolio
 * Get current portfolio
 */
app.get('/api/portfolio', async (req, res) => {
  try {
    const portfolio = await tradingEngine.fetchPortfolio();
    res.json({
      success: true,
      portfolio,
    });
  } catch (error) {
    logger.error('Failed to get portfolio', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/start
 * Start the trading bot
 */
app.post('/api/start', async (req, res) => {
  try {
    await tradingEngine.start();
    res.json({
      success: true,
      message: 'Trading bot started',
      status: tradingEngine.getStatus(),
    });
  } catch (error) {
    logger.error('Failed to start trading bot', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/stop
 * Stop the trading bot
 */
app.post('/api/stop', (req, res) => {
  try {
    tradingEngine.stop();
    res.json({
      success: true,
      message: 'Trading bot stopped',
      status: tradingEngine.getStatus(),
    });
  } catch (error) {
    logger.error('Failed to stop trading bot', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/logs
 * Get recent trading logs (simplified - returns last decision)
 */
app.get('/api/logs', (req, res) => {
  try {
    const status = tradingEngine.getStatus();
    res.json({
      success: true,
      logs: {
        lastDecision: status.lastDecision,
        cycleCount: status.cycleCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Serve frontend
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default app;

