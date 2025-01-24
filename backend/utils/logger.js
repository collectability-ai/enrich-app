// utils/logger.js
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => isDevelopment && console.log(...args),
  info: (...args) => isDevelopment && console.log(...args), // Alias for info
  warn: (...args) => isDevelopment && console.warn(...args),
  error: (...args) => console.error(...args), // Always log errors
};

module.exports = logger;
