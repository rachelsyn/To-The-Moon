import axios from 'axios';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

const { apiKey, model } = config.ai.openai;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * GPT-5 Client for financial news and stock data
 */

function ensureOpenAIConfig() {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  if (!model) {
    throw new Error('OpenAI model identifier not configured');
  }
  return { model };
}

/**
 * Get financial news for given symbols
 */
export async function getFinancialNews(symbols = []) {
  const symbolsList = Array.isArray(symbols) ? symbols.join(', ') : symbols;
  
  const prompt = `Provide the latest financial news and market sentiment for the following symbols: ${symbolsList}

Include:
1. Recent news headlines
2. Market sentiment (bullish/bearish/neutral)
3. Key events affecting these symbols
4. Price action context
5. Volume and volatility indicators

Format as structured JSON with timestamp, source credibility, and impact assessment.`;

  try {
    const { model: modelId } = ensureOpenAIConfig();
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: modelId,
        messages: [
          {
            role: 'system',
            content: 'You are a financial news analyst. Provide accurate, timely, and structured financial news information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: 3000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const newsText = response.data.choices[0].message.content;
    logger.info('Retrieved financial news from GPT-5', { symbols: symbolsList });
    
    return {
      news: newsText,
      raw: response.data,
    };
  } catch (error) {
    logger.error('Failed to get financial news from GPT-5', { 
      error: error.message,
      response: error.response?.data 
    });
    throw error;
  }
}

/**
 * Get stock market data and analysis
 */
export async function getStockData(symbols = []) {
  const symbolsList = Array.isArray(symbols) ? symbols.join(', ') : symbols;
  
  const prompt = `Provide comprehensive stock market data and analysis for: ${symbolsList}

Include:
1. Current price levels and trends
2. Technical indicators (support/resistance levels)
3. Volume analysis
4. Market structure and patterns
5. Comparative analysis across symbols
6. Historical context where relevant

Format as structured JSON with numerical data and categorical assessments.`;

  try {
    const { model: modelId } = ensureOpenAIConfig();
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: modelId,
        messages: [
          {
            role: 'system',
            content: 'You are a quantitative market analyst. Provide detailed, data-driven stock market analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Very low temperature for numerical accuracy
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const dataText = response.data.choices[0].message.content;
    logger.info('Retrieved stock data from GPT-5', { symbols: symbolsList });
    
    return {
      data: dataText,
      raw: response.data,
    };
  } catch (error) {
    logger.error('Failed to get stock data from GPT-5', { 
      error: error.message,
      response: error.response?.data 
    });
    throw error;
  }
}

/**
 * Get market sentiment analysis
 */
export async function getMarketSentiment(symbols = []) {
  const symbolsList = Array.isArray(symbols) ? symbols.join(', ') : symbols;
  
  const prompt = `Analyze overall market sentiment for: ${symbolsList}

Provide:
1. Overall sentiment score (-1 to 1)
2. Fear/Greed index assessment
3. Market positioning indicators
4. Risk appetite indicators
5. Short-term vs long-term sentiment

Format as structured JSON.`;

  try {
    const { model: modelId } = ensureOpenAIConfig();
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: modelId,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
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
    logger.error('Failed to get market sentiment from GPT-5', { error: error.message });
    throw error;
  }
}

export default {
  getFinancialNews,
  getStockData,
  getMarketSentiment,
};

