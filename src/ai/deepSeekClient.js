import axios from 'axios';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

const { apiKey } = config.ai.deepseek;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

/**
 * DeepSeek Client for trading intelligence
 */

/**
 * Retrieve trading strategies from DeepSeek
 */
export async function getTradingStrategies(context = {}) {
  const {
    marketConditions = '',
    portfolio = {},
    currentPositions = [],
    marketData = {},
  } = context;

  const prompt = `You are an expert trading strategist. Analyze the following market context and provide trading strategies:

Market Conditions: ${marketConditions}
Current Portfolio: ${JSON.stringify(portfolio)}
Active Positions: ${JSON.stringify(currentPositions)}
Market Data: ${JSON.stringify(marketData)}

Provide 3-5 specific trading strategies with:
1. Strategy name and description
2. Entry conditions
3. Exit conditions
4. Risk management parameters
5. Expected outcomes

Format the response as structured JSON with clear strategy definitions.`;

  try {
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert trading strategist. Provide actionable, risk-aware strategies in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const strategiesText = response.data.choices[0].message.content;
    logger.info('Retrieved trading strategies from DeepSeek', {
      strategyCount: (strategiesText.match(/Strategy/i) || []).length,
    });

    return {
      strategies: strategiesText,
      raw: response.data,
    };
  } catch (error) {
    logger.error('Failed to get trading strategies from DeepSeek', {
      error: error.message,
      response: error.response?.data,
    });
    throw error;
  }
}

/**
 * Analyze trading scenario with DeepSeek
 */
export async function analyzeScenario(scenario) {
  const prompt = `Analyze this trading scenario and provide recommendations:

${JSON.stringify(scenario, null, 2)}

Provide a detailed analysis with buy/hold/sell recommendation and reasoning.`;

  try {
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a senior trading strategist. Provide concise, numerically grounded recommendations in JSON when possible.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error('Failed to analyze scenario with DeepSeek', { error: error.message });
    throw error;
  }
}

/**
 * Perform quantitative calculations on market data
 */
export async function performCalculations(data, calculations = []) {
  const calculationsList = Array.isArray(calculations) 
    ? calculations.join(', ') 
    : calculations || 'Calculate RSI, MACD, Bollinger Bands, and risk metrics';
  
  const prompt = `You are a quantitative analyst. Perform the following calculations on the provided market data:

Requested Calculations: ${calculationsList}

Market Data:
${JSON.stringify(data, null, 2)}

Provide:
1. Technical indicators (RSI, MACD, Bollinger Bands, Moving Averages)
2. Risk metrics (VaR, Sharpe ratio, volatility)
3. Position sizing recommendations
4. Stop loss and take profit levels
5. Probability assessments for different scenarios

Format all results as structured JSON with numerical values and confidence intervals where applicable.`;

  try {
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat', // Update with actual model identifier
        messages: [
          {
            role: 'system',
            content: 'You are an expert quantitative analyst. Provide precise mathematical calculations and statistical analysis. Always return results in structured JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Very low temperature for mathematical accuracy
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const calculationsText = response.data.choices[0].message.content;
    logger.info('Performed quantitative calculations with DeepSeek', { 
      calculationTypes: calculationsList 
    });
    
    return {
      calculations: calculationsText,
      raw: response.data,
    };
  } catch (error) {
    logger.error('Failed to perform calculations with DeepSeek', { 
      error: error.message,
      response: error.response?.data 
    });
    throw error;
  }
}

/**
 * Calculate risk metrics
 */
export async function calculateRiskMetrics(portfolio, marketData) {
  const prompt = `Calculate comprehensive risk metrics for this portfolio:

Portfolio:
${JSON.stringify(portfolio, null, 2)}

Market Data:
${JSON.stringify(marketData, null, 2)}

Provide:
1. Portfolio Value at Risk (VaR)
2. Maximum Drawdown potential
3. Correlation analysis
4. Concentration risk
5. Liquidity risk assessment
6. Recommended position limits

Format as structured JSON.`;

  try {
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error('Failed to calculate risk metrics with DeepSeek', { error: error.message });
    throw error;
  }
}

/**
 * Calculate position sizing
 */
export async function calculatePositionSize(signal, balance, riskParams) {
  const prompt = `Calculate optimal position size for this trading signal:

Signal: ${JSON.stringify(signal, null, 2)}
Account Balance: ${JSON.stringify(balance, null, 2)}
Risk Parameters: ${JSON.stringify(riskParams, null, 2)}

Provide:
1. Recommended position size (in base currency and quantity)
2. Risk per trade calculation
3. Maximum position size based on risk limits
4. Leverage recommendations (if applicable)
5. Position sizing rationale

Format as structured JSON.`;

  try {
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error('Failed to calculate position size with DeepSeek', { error: error.message });
    throw error;
  }
}

export default {
  getTradingStrategies,
  analyzeScenario,
  performCalculations,
  calculateRiskMetrics,
  calculatePositionSize,
};

