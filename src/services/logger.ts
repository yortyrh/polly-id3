/**
 * @class Logger
 * @description Logs messages to the console
 */
export class Logger {

  constructor(private readonly name: string) {}

  /**
   * Gets the current timestamp
   * @returns The current timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Formats a message
   * @param level - The level of the message
   * @param message - The message to log
   * @param data - The data to log
   * @returns The formatted message
   */
  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${this.name}] ${message}${dataStr}`;
  }

  /**
   * Logs an info message
   * @param message - The message to log
   * @param data - The data to log
   */
  info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  /**
   * Logs a warning message
   * @param message - The message to log
   * @param data - The data to log
   */
  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  /**
   * Logs an error message
   * @param message - The message to log
   * @param data - The data to log
   */
  error(message: string, data?: any): void {
    console.error(this.formatMessage('ERROR', message, data));
  }

  /**
   * Logs a debug message
   * @param message - The message to log
   * @param data - The data to log
   */
  debug(message: string, data?: any): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }
}
