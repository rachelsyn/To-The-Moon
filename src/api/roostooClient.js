import crypto from 'crypto';
import axios from 'axios';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

const { apiKey, secretKey, baseUrl } = config.roostoo;

/**
 * Generate HMAC SHA256 signature for Roostoo API
 */
function generateSignature(queryString) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

/**
 * Generate timestamp in milliseconds (13 digits)
 */
function getTimestamp() {
  return Date.now().toString();
}

/**
 * Get signed headers for RCL_TopLevelCheck endpoints
 */
function getSignedHeaders(payload = {}) {
  const timestamp = getTimestamp();
  const finalPayload = { ...payload, timestamp };
  
  // Create query string from payload
  const queryString = Object.keys(finalPayload)
    .sort()
    .map(key => `${key}=${encodeURIComponent(finalPayload[key])}`)
    .join('&');
  
  const signature = generateSignature(queryString);
  
  const headers = {
    'RST-API-KEY': apiKey,
    'MSG-SIGNATURE': signature,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  return { headers, payload: finalPayload, queryString };
}

/**
 * Get headers for RCL_TSCheck endpoints
 */
function getTSCheckHeaders(payload = {}) {
  const timestamp = getTimestamp();
  const finalPayload = { ...payload, timestamp };
  const queryString = Object.keys(finalPayload)
    .map(key => `${key}=${encodeURIComponent(finalPayload[key])}`)
    .join('&');
  
  return { headers: {}, payload: finalPayload, queryString };
}

/**
 * Check server time
 */
export async function getServerTime() {
  try {
    const response = await axios.get(`${baseUrl}/server_time`);
    return response.data;
  } catch (error) {
    logger.error('Failed to get server time', { error: error.message });
    throw error;
  }
}

/**
 * Get exchange information
 */
export async function getExchangeInfo() {
  try {
    const response = await axios.get(`${baseUrl}/v3/exchange_info`);
    return response.data;
  } catch (error) {
    logger.error('Failed to get exchange info', { error: error.message });
    throw error;
  }
}

/**
 * Get market ticker
 */
export async function getMarketTicker(pair = null) {
  try {
    const { queryString } = getTSCheckHeaders(pair ? { pair } : {});
    const url = `${baseUrl}/v3/ticker${pair ? `?${queryString}` : ''}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    logger.error('Failed to get market ticker', { error: error.message });
    throw error;
  }
}

/**
 * Get balance information
 */
export async function getBalance() {
  try {
    const { headers, queryString } = getSignedHeaders();
    const response = await axios.post(
      `${baseUrl}/v3/balance`,
      queryString,
      { headers }
    );
    return response.data;
  } catch (error) {
    logger.error('Failed to get balance', { error: error.message });
    throw error;
  }
}

/**
 * Get pending order count
 */
export async function getPendingOrderCount() {
  try {
    const { headers, queryString } = getSignedHeaders();
    const response = await axios.post(
      `${baseUrl}/v3/pending_order_count`,
      queryString,
      { headers }
    );
    return response.data;
  } catch (error) {
    logger.error('Failed to get pending order count', { error: error.message });
    throw error;
  }
}

/**
 * Place a new order
 */
export async function placeOrder(params) {
  const {
    pair,
    side, // 'BUY' or 'SELL'
    order_type, // 'MARKET' or 'LIMIT'
    quantity,
    price, // Required for LIMIT orders
    stop_type = 'GTC', // 'GTC', 'IOC', 'FOK'
  } = params;
  
  // Validate required parameters
  if (!pair || !side || !order_type || !quantity) {
    throw new Error('Missing required parameters: pair, side, order_type, quantity');
  }
  
  if (order_type === 'LIMIT' && !price) {
    throw new Error('LIMIT orders require a price parameter');
  }
  
  try {
    const payload = {
      pair,
      side,
      type: order_type,
      quantity: quantity.toString(),
      stop_type,
    };
    
    if (order_type === 'LIMIT' && price) {
      payload.price = price.toString();
    }
    
    const { headers, queryString } = getSignedHeaders(payload);
    const response = await axios.post(
      `${baseUrl}/v3/place_order`,
      queryString,
      { headers }
    );
    
    logger.trade('Order placed', { params, response: response.data });
    return response.data;
  } catch (error) {
    logger.error('Failed to place order', { 
      error: error.message,
      params,
      response: error.response?.data 
    });
    throw error;
  }
}

/**
 * Query orders
 */
export async function queryOrder(params = {}) {
  const { order_id, pair, pending_only, offset, limit } = params;
  
  try {
    const payload = {};
    if (order_id) {
      payload.order_id = order_id.toString();
    } else if (pair) {
      payload.pair = pair;
      if (pending_only !== undefined) {
        payload.pending_only = pending_only ? 'TRUE' : 'FALSE';
      }
    }
    
    if (offset) payload.offset = offset.toString();
    if (limit) payload.limit = limit.toString();
    
    const { headers, queryString } = getSignedHeaders(payload);
    const response = await axios.post(
      `${baseUrl}/v3/query_order`,
      queryString,
      { headers }
    );
    return response.data;
  } catch (error) {
    logger.error('Failed to query order', { error: error.message, params });
    throw error;
  }
}

/**
 * Cancel order(s)
 */
export async function cancelOrder(params = {}) {
  const { order_id, pair } = params;
  
  try {
    const payload = {};
    if (order_id) {
      payload.order_id = order_id.toString();
    } else if (pair) {
      payload.pair = pair;
    }
    // If neither is provided, all pending orders will be canceled
    
    const { headers, queryString } = getSignedHeaders(payload);
    const response = await axios.post(
      `${baseUrl}/v3/cancel_order`,
      queryString,
      { headers }
    );
    
    logger.trade('Order canceled', { params, response: response.data });
    return response.data;
  } catch (error) {
    logger.error('Failed to cancel order', { error: error.message, params });
    throw error;
  }
}

export default {
  getServerTime,
  getExchangeInfo,
  getMarketTicker,
  getBalance,
  getPendingOrderCount,
  placeOrder,
  queryOrder,
  cancelOrder,
};

