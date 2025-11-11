import config from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * Risk Management Module
 * Validates orders, calculates position sizes, and manages risk
 */

/**
 * Validate if an order is safe to execute
 */
export function validateOrder(order, portfolio) {
  const { pair, side, quantity, price, order_type } = order;
  
  // Check required fields
  if (!pair || !side || !quantity) {
    return {
      valid: false,
      reason: 'Missing required order fields',
    };
  }
  
  // Check quantity is positive
  if (parseFloat(quantity) <= 0) {
    return {
      valid: false,
      reason: 'Quantity must be positive',
    };
  }
  
  // Check price for LIMIT orders
  if (order_type === 'LIMIT' && (!price || parseFloat(price) <= 0)) {
    return {
      valid: false,
      reason: 'LIMIT orders require a valid price',
    };
  }
  
  // Check if we have enough balance
  const balance = portfolio.balance || {};
  const baseCurrency = pair.split('/')[0]; // e.g., BTC from BTC/USD
  const quoteCurrency = pair.split('/')[1]; // e.g., USD from BTC/USD
  
  if (side === 'BUY') {
    const requiredAmount = parseFloat(quantity) * (price ? parseFloat(price) : 1);
    const availableBalance = parseFloat(balance[quoteCurrency] || 0);
    
    if (requiredAmount > availableBalance) {
      return {
        valid: false,
        reason: `Insufficient ${quoteCurrency} balance. Required: ${requiredAmount}, Available: ${availableBalance}`,
      };
    }
  } else if (side === 'SELL') {
    const requiredAmount = parseFloat(quantity);
    const availableBalance = parseFloat(balance[baseCurrency] || 0);
    
    if (requiredAmount > availableBalance) {
      return {
        valid: false,
        reason: `Insufficient ${baseCurrency} balance. Required: ${requiredAmount}, Available: ${availableBalance}`,
      };
    }
  }
  
  // Check position size limits
  const positionSizeCheck = checkPositionSize(order, portfolio);
  if (!positionSizeCheck.valid) {
    return positionSizeCheck;
  }
  
  return {
    valid: true,
    reason: 'Order validated successfully',
  };
}

/**
 * Check if position size is within limits
 */
function checkPositionSize(order, portfolio) {
  const { quantity, price } = order;
  const maxPositionSize = config.trading.maxPositionSize;
  
  const orderValue = parseFloat(quantity) * (price ? parseFloat(price) : 1);
  const totalPortfolioValue = calculatePortfolioValue(portfolio);
  
  const positionSizeRatio = orderValue / totalPortfolioValue;
  
  if (positionSizeRatio > maxPositionSize) {
    return {
      valid: false,
      reason: `Position size ${positionSizeRatio.toFixed(4)} exceeds maximum ${maxPositionSize}`,
    };
  }
  
  return {
    valid: true,
  };
}

/**
 * Calculate total portfolio value
 */
function calculatePortfolioValue(portfolio) {
  const balance = portfolio.balance || {};
  let totalValue = 0;
  
  // Sum all balances (simplified - in production, convert to base currency)
  Object.values(balance).forEach(value => {
    totalValue += parseFloat(value || 0);
  });
  
  return totalValue || 1; // Avoid division by zero
}

/**
 * Calculate optimal position size based on signal and risk parameters
 */
export function calculatePositionSize(signal, balance, riskParams = {}) {
  const {
    riskPerTrade = config.trading.riskPerTrade,
    maxPositionSize = config.trading.maxPositionSize,
  } = riskParams;
  
  const { confidence = 0.5, price } = signal;
  
  if (!price) {
    logger.warn('Cannot calculate position size without price', { signal });
    return {
      quantity: 0,
      reason: 'Price not available',
    };
  }
  
  // Adjust risk based on confidence
  const adjustedRisk = riskPerTrade * confidence;
  
  // Calculate position value based on risk
  const totalBalance = Object.values(balance).reduce((sum, val) => sum + parseFloat(val || 0), 0);
  const riskAmount = totalBalance * adjustedRisk;
  
  // Calculate quantity
  let quantity = riskAmount / parseFloat(price);
  
  // Apply maximum position size limit
  const maxQuantity = (totalBalance * maxPositionSize) / parseFloat(price);
  quantity = Math.min(quantity, maxQuantity);
  
  return {
    quantity: Math.max(0, quantity),
    riskAmount,
    adjustedRisk,
    maxQuantity,
  };
}

/**
 * Calculate stop loss level
 */
export function calculateStopLoss(entryPrice, side, riskPercent = 0.02) {
  if (side === 'BUY') {
    return entryPrice * (1 - riskPercent);
  } else if (side === 'SELL') {
    return entryPrice * (1 + riskPercent);
  }
  return entryPrice;
}

/**
 * Calculate take profit level
 */
export function calculateTakeProfit(entryPrice, side, rewardRatio = 2) {
  const riskPercent = 0.02;
  if (side === 'BUY') {
    return entryPrice * (1 + riskPercent * rewardRatio);
  } else if (side === 'SELL') {
    return entryPrice * (1 - riskPercent * rewardRatio);
  }
  return entryPrice;
}

/**
 * Check stop loss
 */
export function checkStopLoss(order, currentPrice) {
  const { side, stopLoss } = order;
  
  if (!stopLoss) {
    return {
      shouldStop: false,
      reason: 'No stop loss set',
    };
  }
  
  if (side === 'BUY' && currentPrice <= stopLoss) {
    return {
      shouldStop: true,
      reason: `Price ${currentPrice} hit stop loss ${stopLoss}`,
    };
  }
  
  if (side === 'SELL' && currentPrice >= stopLoss) {
    return {
      shouldStop: true,
      reason: `Price ${currentPrice} hit stop loss ${stopLoss}`,
    };
  }
  
  return {
    shouldStop: false,
  };
}

export default {
  validateOrder,
  calculatePositionSize,
  calculateStopLoss,
  calculateTakeProfit,
  checkStopLoss,
};

