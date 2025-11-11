import roostooClient from '../api/roostooClient.js';
import ragAgent from '../rag/ragAgent.js';
import riskManager from './riskManager.js';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * Trading Engine - Main orchestrator for trading bot
 */

class TradingEngine {
  constructor() {
    this.isRunning = false;
    this.tradingInterval = null;
    this.cycleCount = 0;
    this.lastDecision = null;
    this.portfolio = null;
  }

  /**
   * Initialize the trading engine
   */
  async initialize() {
    try {
      logger.info('Initializing trading engine...');
      
      // Test API connections
      const serverTime = await roostooClient.getServerTime();
      logger.info('Roostoo API connection successful', { serverTime });
      
      // Get initial portfolio
      this.portfolio = await this.fetchPortfolio();
      logger.info('Portfolio fetched', { balance: this.portfolio.balance });
      
      logger.info('Trading engine initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize trading engine', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch portfolio data from Roostoo
   */
  async fetchPortfolio() {
    try {
      const [balance, pendingOrders, exchangeInfo] = await Promise.all([
        roostooClient.getBalance(),
        roostooClient.getPendingOrderCount(),
        roostooClient.getExchangeInfo(),
      ]);
      
      // Get current orders
      const orders = await roostooClient.queryOrder({ pending_only: true });
      
      return {
        balance: balance.Balance || {},
        pendingOrderCount: pendingOrders.PendingOrderCount || 0,
        pendingOrders: orders.OrderMatched || [],
        exchangeInfo: exchangeInfo || {},
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to fetch portfolio', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch market data
   */
  async fetchMarketData(symbols = ['BTC/USD', 'ETH/USD']) {
    try {
      const tickers = await Promise.all(
        symbols.map(symbol => 
          roostooClient.getMarketTicker(symbol).catch(err => {
            logger.warn(`Failed to fetch ticker for ${symbol}`, { error: err.message });
            return null;
          })
        )
      );
      
      const marketData = {
        tickers: tickers.filter(t => t !== null),
        symbols,
        timestamp: Date.now(),
      };
      
      return marketData;
    } catch (error) {
      logger.error('Failed to fetch market data', { error: error.message });
      return { tickers: [], symbols, timestamp: Date.now() };
    }
  }

  /**
   * Execute a trading decision
   */
  async executeDecision(decision) {
    const { action, symbol, quantity, price, order_type = 'MARKET' } = decision;
    
    if (action === 'HOLD') {
      logger.info('Decision: HOLD - No action taken');
      return { executed: false, reason: 'HOLD decision' };
    }
    
    if (!symbol || !quantity) {
      logger.warn('Invalid decision - missing symbol or quantity', { decision });
      return { executed: false, reason: 'Invalid decision parameters' };
    }
    
    try {
      // Prepare order
      const order = {
        pair: symbol,
        side: action,
        order_type,
        quantity: parseFloat(quantity),
        ...(price && { price: parseFloat(price) }),
      };
      
      // Validate order
      const validation = riskManager.validateOrder(order, this.portfolio);
      if (!validation.valid) {
        logger.warn('Order validation failed', { order, reason: validation.reason });
        return { executed: false, reason: validation.reason };
      }
      
      // Execute order
      const result = await roostooClient.placeOrder(order);
      
      if (result.Success) {
        logger.trade('Order executed successfully', { 
          orderId: result.OrderDetail?.OrderID,
          order 
        });
        
        // Update portfolio
        this.portfolio = await this.fetchPortfolio();
        
        return {
          executed: true,
          orderId: result.OrderDetail?.OrderID,
          order,
          result,
        };
      } else {
        logger.error('Order execution failed', { 
          error: result.ErrMsg,
          order 
        });
        return { 
          executed: false, 
          reason: result.ErrMsg || 'Unknown error' 
        };
      }
    } catch (error) {
      logger.error('Failed to execute decision', { 
        error: error.message,
        decision 
      });
      return { executed: false, reason: error.message };
    }
  }

  /**
   * Run a single trading cycle
   */
  async runTradingCycle() {
    this.cycleCount++;
    logger.info(`Starting trading cycle #${this.cycleCount}`);
    
    try {
      // Step 1: Fetch portfolio data
      this.portfolio = await this.fetchPortfolio();
      logger.debug('Portfolio fetched', { 
        balance: Object.keys(this.portfolio.balance || {}).length,
        pendingOrders: this.portfolio.pendingOrderCount 
      });
      
      // Step 2: Fetch market data
      const marketData = await this.fetchMarketData();
      logger.debug('Market data fetched', { 
        tickerCount: marketData.tickers.length 
      });
      
      // Step 3: Query RAG agent for trading decision
      const symbols = marketData.symbols;
      const ragContext = {
        symbols,
        portfolio: this.portfolio,
        marketData: {
          tickers: marketData.tickers,
          description: `Market data for ${symbols.join(', ')}`,
        },
        currentPositions: this.portfolio.pendingOrders,
      };
      
      const ragResult = await ragAgent.executeWorkflow(ragContext);
      this.lastDecision = ragResult.decision;
      
      logger.info('RAG decision received', { 
        action: this.lastDecision.action,
        confidence: this.lastDecision.confidence 
      });
      
      // Step 4: Execute trade if decision made
      if (this.lastDecision.action !== 'HOLD') {
        const executionResult = await this.executeDecision(this.lastDecision);
        logger.info('Trading cycle completed', { 
          cycle: this.cycleCount,
          executed: executionResult.executed 
        });
      } else {
        logger.info('Trading cycle completed - HOLD decision', { 
          cycle: this.cycleCount 
        });
      }
      
      return {
        cycle: this.cycleCount,
        decision: this.lastDecision,
        portfolio: this.portfolio,
        executed: this.lastDecision.action !== 'HOLD',
      };
    } catch (error) {
      logger.error('Trading cycle failed', { 
        error: error.message,
        cycle: this.cycleCount 
      });
      throw error;
    }
  }

  /**
   * Start the trading bot
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Trading engine is already running');
      return;
    }
    
    try {
      await this.initialize();
      this.isRunning = true;
      
      // Run immediately
      this.runTradingCycle().catch(err => {
        logger.error('Initial trading cycle failed', { error: err.message });
      });
      
      // Then run on interval
      this.tradingInterval = setInterval(() => {
        if (this.isRunning) {
          this.runTradingCycle().catch(err => {
            logger.error('Trading cycle error', { error: err.message });
          });
        }
      }, config.trading.intervalMs);
      
      logger.info('Trading engine started', { 
        intervalMs: config.trading.intervalMs 
      });
    } catch (error) {
      logger.error('Failed to start trading engine', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the trading bot
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Trading engine is not running');
      return;
    }
    
    this.isRunning = false;
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }
    
    logger.info('Trading engine stopped', { 
      totalCycles: this.cycleCount 
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      lastDecision: this.lastDecision,
      portfolio: this.portfolio,
      intervalMs: config.trading.intervalMs,
    };
  }
}

// Singleton instance
const tradingEngine = new TradingEngine();

export default tradingEngine;

