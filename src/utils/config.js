import dotenv from 'dotenv';

dotenv.config();

const config = {
  roostoo: {
    apiKey: process.env.ROOSTOO_API_KEY || '',
    secretKey: process.env.ROOSTOO_SECRET_KEY || '',
    baseUrl: process.env.ROOSTOO_BASE_URL || 'https://mock-api.roostoo.com',
  },
  horus: {
    apiKey: process.env.HORUS_API_KEY || '',
    baseUrl: process.env.HORUS_BASE_URL || '',
  },
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
    },
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  trading: {
    intervalMs: parseInt(process.env.TRADING_INTERVAL_MS || '60000', 10),
    maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'),
    riskPerTrade: parseFloat(process.env.RISK_PER_TRADE || '0.02'),
  },
};

// Validate required configuration
function validateConfig() {
  const errors = [];
  
  if (!config.roostoo.apiKey) errors.push('ROOSTOO_API_KEY is required');
  if (!config.roostoo.secretKey) errors.push('ROOSTOO_SECRET_KEY is required');
  if (!config.ai.openai.apiKey) errors.push('OPENAI_API_KEY is required');
  if (!config.ai.deepseek.apiKey) errors.push('DEEPSEEK_API_KEY is required');
  
  if (errors.length > 0) {
    console.warn('Configuration warnings:');
    errors.forEach(err => console.warn(`  - ${err}`));
    console.warn('Some features may not work without proper configuration.');
  }
}

validateConfig();

export default config;

