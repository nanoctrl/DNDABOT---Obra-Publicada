import winston from 'winston';
import path from 'path';
import { config } from '../config';

// Custom log levels with emojis
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4,
    trace: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    success: 'green',
    debug: 'magenta',
    trace: 'grey'
  }
};

// Add custom colors to winston
winston.addColors(customLevels.colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    // Estructura consistente sin emojis en el logger principal
    let msg = `${timestamp} [${level}]`;
    if (context) msg += ` [${context}]`;
    msg += `: ${message}`;
    
    // Agregar metadata si existe
    if (Object.keys(meta).length > 0) {
      // Filtrar información sensible
      const filteredMeta = { ...meta };
      if (filteredMeta.password) filteredMeta.password = '***';
      if (filteredMeta.cuit && typeof filteredMeta.cuit === 'string') {
        filteredMeta.cuit = filteredMeta.cuit.substring(0, 3) + '***';
      }
      msg += ` ${JSON.stringify(filteredMeta)}`;
    }
    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'registro-obras-bot' },
  transports: [
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(config.OUTPUT_DIR, 'logs', 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write errors to separate file
    new winston.transports.File({
      filename: path.join(config.OUTPUT_DIR, 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write success logs to separate file
    new winston.transports.File({
      filename: path.join(config.OUTPUT_DIR, 'logs', 'success.log'),
      level: 'success',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
});

// If not in production, also log to console
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add custom success method
interface CustomLogger extends winston.Logger {
  success: (message: string, ...meta: any[]) => winston.Logger;
}

(logger as any).success = function(message: string, ...meta: any[]) {
  return this.log('success', message, ...meta);
};

// Create a child logger for specific contexts
export function createLogger(context: string) {
  return logger.child({ context });
}

// Export logger with custom type
export default logger as CustomLogger;
