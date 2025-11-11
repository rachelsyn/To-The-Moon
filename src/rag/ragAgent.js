import vectorStore from './vectorStore.js';
import gpt5Client from '../ai/gpt5Client.js';
import deepSeekClient from '../ai/deepSeekClient.js';
import logger from '../utils/logger.js';

/**
 * RAG Agent - Central orchestrator for trading decisions
 * Retrieves strategies, collects market data, performs calculations, and synthesizes decisions
 */

class RAGAgent {
  /**
   * Retrieve relevant trading strategies
   */
  async retrieveStrategies(context) {
    const {
      marketConditions = '',
      portfolio = {},
      currentPositions = [],
      marketData = {},
    } = context;
    
    try {
      // 1. Search vector store for similar past strategies
      const query = `${marketConditions} ${JSON.stringify(portfolio)} ${JSON.stringify(marketData)}`;
      const similarStrategies = vectorStore.searchSimilar(query, 5);
      
      logger.info('Retrieved similar strategies from vector store', { 
        count: similarStrategies.length 
      });
      
      // 2. Query DeepSeek for new strategy recommendations
      const deepSeekStrategies = await deepSeekClient.getTradingStrategies(context);
      
      // Store new strategies in vector store
      if (deepSeekStrategies.strategies) {
        const strategyId = vectorStore.addStrategy(deepSeekStrategies.strategies, {
          source: 'deepseek',
          context: marketConditions,
        });
        logger.info('Stored new strategy from DeepSeek', { strategyId });
      }
      
      return {
        similarStrategies: similarStrategies.map(s => s.strategy),
        newStrategies: deepSeekStrategies.strategies,
        allStrategies: [...similarStrategies.map(s => s.strategy), deepSeekStrategies.strategies],
      };
    } catch (error) {
      logger.error('Failed to retrieve strategies', { error: error.message });
      // Fallback to vector store only
      const similarStrategies = vectorStore.searchSimilar(JSON.stringify(context), 5);
      return {
        similarStrategies: similarStrategies.map(s => s.strategy),
        newStrategies: '',
        allStrategies: similarStrategies.map(s => s.strategy),
      };
    }
  }

  /**
   * Collect market data from GPT-5
   */
  async collectMarketData(symbols) {
    try {
      const [news, stockData, sentiment] = await Promise.all([
        gpt5Client.getFinancialNews(symbols),
        gpt5Client.getStockData(symbols),
        gpt5Client.getMarketSentiment(symbols),
      ]);
      
      return {
        news: news.news || news,
        stockData: stockData.data || stockData,
        sentiment,
      };
    } catch (error) {
      logger.error('Failed to collect market data', { error: error.message });
      return {
        news: '',
        stockData: '',
        sentiment: '',
      };
    }
  }

  /**
   * Perform quantitative calculations with DeepSeek
   */
  async calculateMetrics(data, calculations = []) {
    try {
      const calculationsList = calculations.length > 0 
        ? calculations 
        : ['RSI', 'MACD', 'Bollinger Bands', 'Moving Averages', 'Risk Metrics'];
      
      const results = await deepSeekClient.performCalculations(data, calculationsList);
      
      return {
        calculations: results.calculations || results,
        raw: results.raw,
      };
    } catch (error) {
      logger.error('Failed to calculate metrics', { error: error.message });
      return {
        calculations: '',
        raw: null,
      };
    }
  }

  /**
   * Synthesize strategy from all inputs
   */
  async synthesizeStrategy(strategies, marketData, metrics) {
    const synthesisPrompt = `Synthesize a unified trading strategy from the following inputs:

Trading Strategies:
${JSON.stringify(strategies, null, 2)}

Market Data:
${JSON.stringify(marketData, null, 2)}

Quantitative Metrics:
${JSON.stringify(metrics, null, 2)}

Create a coherent trading strategy that:
1. Integrates insights from all sources
2. Resolves any conflicts between signals
3. Provides clear entry/exit conditions
4. Includes risk management parameters
5. Has a confidence score (0-1)

Format as structured JSON with: strategy, entry, exit, risk, confidence.`;

    try {
      // Use DeepSeek to synthesize the strategy
      const synthesized = await deepSeekClient.analyzeScenario({
        strategies,
        marketData,
        metrics,
        prompt: synthesisPrompt,
      });
      
      logger.info('Synthesized trading strategy', { 
        synthesisLength: synthesized.length 
      });
      
      return synthesized;
    } catch (error) {
      logger.error('Failed to synthesize strategy', { error: error.message });
      // Fallback: simple combination
      return {
        strategy: 'Combined strategy from multiple sources',
        entry: 'Based on technical indicators and market sentiment',
        exit: 'Based on risk metrics',
        risk: 'Medium',
        confidence: 0.5,
        sources: {
          strategies: strategies.length,
          marketData: Object.keys(marketData).length,
          metrics: Object.keys(metrics).length,
        },
      };
    }
  }

  /**
   * Make final trading decision
   */
  async makeDecision(synthesizedStrategy, portfolio) {
    const decisionPrompt = `Based on this synthesized strategy and current portfolio, make a trading decision:

Synthesized Strategy:
${typeof synthesizedStrategy === 'string' ? synthesizedStrategy : JSON.stringify(synthesizedStrategy, null, 2)}

Current Portfolio:
${JSON.stringify(portfolio, null, 2)}

Provide a decision with:
1. Action: BUY, SELL, or HOLD
2. Symbol (if BUY/SELL)
3. Quantity (if BUY/SELL)
4. Confidence level (0-1)
5. Reasoning
6. Risk assessment

Format as structured JSON.`;

    try {
      const decision = await deepSeekClient.analyzeScenario({
        strategy: synthesizedStrategy,
        portfolio,
        prompt: decisionPrompt,
      });
      
      // Parse decision if it's JSON
      let parsedDecision;
      try {
        parsedDecision = typeof decision === 'string' 
          ? JSON.parse(decision) 
          : decision;
      } catch (parseError) {
        logger.warn('DeepSeek decision was not valid JSON', { decisionPreview: decision?.slice?.(0, 200) || decision });
        throw new Error('Invalid decision format received from DeepSeek');
      }
      
      const normalizedDecision = this.normalizeDecision(parsedDecision);
      
      logger.info('Trading decision made', { 
        action: normalizedDecision.action,
        confidence: normalizedDecision.confidence 
      });
      
      return normalizedDecision;
    } catch (error) {
      logger.error('Failed to make trading decision', { error: error.message });
      return {
        action: 'HOLD',
        reasoning: 'Error in decision making, defaulting to HOLD',
        confidence: 0.0,
      };
    }
  }

  /**
   * Extract action from text decision
   */
  extractAction(text) {
    const upperText = text.toUpperCase();
    if (upperText.includes('BUY')) return 'BUY';
    if (upperText.includes('SELL')) return 'SELL';
    return 'HOLD';
  }

  /**
   * Validate and normalize decision payloads
   */
  normalizeDecision(decision) {
    if (!decision || typeof decision !== 'object') {
      throw new Error('Decision payload must be an object');
    }
    
    const candidate =
      (typeof decision.decision === 'object' && decision.decision !== null)
        ? decision.decision
        : decision;
    
    const action = (candidate.action || '').toString().trim().toUpperCase();
    if (!action) {
      throw new Error('Decision is missing an action');
    }
    
    if (!['BUY', 'SELL', 'HOLD'].includes(action)) {
      throw new Error(`Unsupported decision action: ${action}`);
    }
    
    const normalized = {
      ...candidate,
      action,
      reasoning: candidate.reasoning ?? candidate.explanation ?? '',
    };
    
    const confidenceValue = Number.parseFloat(candidate.confidence ?? 0);
    if (Number.isFinite(confidenceValue)) {
      normalized.confidence = Math.max(0, Math.min(1, confidenceValue));
    } else {
      normalized.confidence = 0;
    }
    
    if (action === 'BUY' || action === 'SELL') {
      const symbol = (candidate.symbol || candidate.ticker || '').toString().trim();
      if (!symbol) {
        throw new Error(`Decision action ${action} requires a symbol`);
      }
      
      const rawQuantity = candidate.quantity ?? candidate.size ?? candidate.amount;
      let quantity = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) : rawQuantity;
      
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Decision action ${action} requires a positive quantity`);
      }
      
      normalized.symbol = symbol;
      normalized.quantity = quantity;
    } else {
      normalized.symbol = candidate.symbol ?? null;
      normalized.quantity = 0;
    }
    
    return normalized;
  }

  /**
   * Complete RAG workflow - orchestrate all steps
   */
  async executeWorkflow(context) {
    const {
      symbols = [],
      portfolio = {},
      marketData = {},
      currentPositions = [],
    } = context;
    
    logger.info('Starting RAG workflow', { symbols });
    
    try {
      // Step 1: Retrieve strategies
      const strategies = await this.retrieveStrategies({
        marketConditions: marketData.description || '',
        portfolio,
        currentPositions,
        marketData,
      });
      
      // Step 2: Collect market data
      const collectedData = await this.collectMarketData(symbols);
      
      // Step 3: Calculate metrics
      const metrics = await this.calculateMetrics({
        ...marketData,
        ...collectedData,
      });
      
      // Step 4: Synthesize strategy
      const synthesized = await this.synthesizeStrategy(
        strategies.allStrategies,
        collectedData,
        metrics
      );
      
      // Step 5: Make decision
      const decision = await this.makeDecision(synthesized, portfolio);
      
      logger.info('RAG workflow completed', { 
        action: decision.action,
        confidence: decision.confidence 
      });
      
      return {
        decision,
        synthesized,
        strategies,
        marketData: collectedData,
        metrics,
      };
    } catch (error) {
      logger.error('RAG workflow failed', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
const ragAgent = new RAGAgent();

export default ragAgent;

