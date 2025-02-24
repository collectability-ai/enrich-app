// src/logger.js
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => isDevelopment && console.log(...args),
  warn: (...args) => isDevelopment && console.warn(...args),
  error: (...args) => console.error(...args), // Always log errors
};

export default logger;
