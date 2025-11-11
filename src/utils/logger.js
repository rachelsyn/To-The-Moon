import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const getLogFile = () => {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `trading-${date}.log`);
};

const formatMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data }),
  };
  return JSON.stringify(logEntry);
};

const log = (level, message, data = null) => {
  const logMessage = formatMessage(level, message, data);
  const logFile = getLogFile();
  
  // Console output
  console.log(`[${level}] ${message}`, data || '');
  
  // File output
  fs.appendFileSync(logFile, logMessage + '\n');
};

export const logger = {
  info: (message, data) => log('INFO', message, data),
  warn: (message, data) => log('WARN', message, data),
  error: (message, data) => log('ERROR', message, data),
  debug: (message, data) => log('DEBUG', message, data),
  trade: (message, data) => log('TRADE', message, data),
};

export default logger;

