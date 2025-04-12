/**
 * Logger utility for Snippai application
 * Provides a consistent logging interface with different log levels
 */

import debug from 'debug';

// Define the Debugger interface for use in this file
type DebuggerInstance = {
  (message: string, ...args: unknown[]): void;
  enabled: boolean;
  namespace: string;
  extend: (namespace: string) => DebuggerInstance;
  log: (...args: unknown[]) => void;
  color: string;
};

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Logger configuration
export interface LoggerConfig {
  // Minimum log level to display
  level?: LogLevel;
  // Whether to also log to console
  consoleOutput?: boolean;
  // Namespace for debug logger
  namespace?: string;
  // Custom formatters for different log levels
  formatters?: {
    [key in 'debug' | 'info' | 'warn' | 'error']?: (message: string, ...args: unknown[]) => string;
  };
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.DEBUG,
  consoleOutput: true,
  namespace: 'snippai',
  formatters: {
    debug: (message: string, ...args: unknown[]) => `[DEBUG] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`,
    info: (message: string, ...args: unknown[]) => `[INFO] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`,
    warn: (message: string, ...args: unknown[]) => `[WARN] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`,
    error: (message: string, ...args: unknown[]) => `[ERROR] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`,
  }
};

/**
 * SnippaiLogger class provides a unified logging interface
 * with support for different log levels and output targets
 */
export class SnippaiLogger {
  private debugger: DebuggerInstance;
  private config: LoggerConfig;

  /**
   * Create a new logger instance
   * @param config Logger configuration
   */
  constructor(config: LoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize debugger with namespace
    const namespace = this.config.namespace || 'snippai';
    this.debugger = debug(namespace);
    
    // Enable console output for debugger if needed
    if (this.config.consoleOutput) {
      this.debugger.log = console.log.bind(console);
    }
  }

  /**
   * Log a debug message
   * @param message Message to log
   * @param args Additional arguments
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.config.level !== undefined && this.config.level <= LogLevel.DEBUG) {
      const formattedMessage = this.config.formatters?.debug 
        ? this.config.formatters.debug(message, ...args)
        : message;
      
      this.debugger(formattedMessage, ...args);
      
      if (this.config.consoleOutput) {
        console.debug(formattedMessage, ...args);
      }
    }
  }

  /**
   * Log an info message
   * @param message Message to log
   * @param args Additional arguments
   */
  info(message: string, ...args: unknown[]): void {
    if (this.config.level !== undefined && this.config.level <= LogLevel.INFO) {
      const formattedMessage = this.config.formatters?.info 
        ? this.config.formatters.info(message, ...args)
        : message;
      
      this.debugger(formattedMessage, ...args);
      
      if (this.config.consoleOutput) {
        console.info(formattedMessage, ...args);
      }
    }
  }

  /**
   * Log a warning message
   * @param message Message to log
   * @param args Additional arguments
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.config.level !== undefined && this.config.level <= LogLevel.WARN) {
      const formattedMessage = this.config.formatters?.warn 
        ? this.config.formatters.warn(message, ...args)
        : message;
      
      this.debugger(formattedMessage, ...args);
      
      if (this.config.consoleOutput) {
        console.warn(formattedMessage, ...args);
      }
    }
  }

  /**
   * Log an error message
   * @param message Message to log
   * @param args Additional arguments
   */
  error(message: string, ...args: unknown[]): void {
    if (this.config.level !== undefined && this.config.level <= LogLevel.ERROR) {
      const formattedMessage = this.config.formatters?.error 
        ? this.config.formatters.error(message, ...args)
        : message;
      
      this.debugger(formattedMessage, ...args);
      
      if (this.config.consoleOutput) {
        console.error(formattedMessage, ...args);
      }
    }
  }

  /**
   * Create a child logger with a sub-namespace
   * @param subNamespace Sub-namespace to append to the current namespace
   * @returns A new logger instance with the combined namespace
   */
  createSubLogger(subNamespace: string): SnippaiLogger {
    const namespace = `${this.config.namespace}:${subNamespace}`;
    return new SnippaiLogger({
      ...this.config,
      namespace
    });
  }

  /**
   * Get the underlying debug instance
   * @returns The debug instance
   */
  getDebugger(): DebuggerInstance {
    return this.debugger;
  }

  /**
   * Create a logger function compatible with external libraries
   * @param level Log level to use
   * @returns A logger function
   */
  createLoggerFn(level: LogLevel = LogLevel.INFO): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return this.debug.bind(this);
      case LogLevel.INFO:
        return this.info.bind(this);
      case LogLevel.WARN:
        return this.warn.bind(this);
      case LogLevel.ERROR:
        return this.error.bind(this);
      default:
        return (): void => { /* No operation */ };
    }
  }
}

// Create and export a default logger instance
export const logger = new SnippaiLogger();

// Export a factory function to create new loggers
export function createLogger(config: LoggerConfig = {}): SnippaiLogger {
  return new SnippaiLogger(config);
}
