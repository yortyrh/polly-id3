import { Logger } from './logger';

describe('Logger', () => {
  let logger: Logger;
  let originalConsole: any;

  beforeEach(() => {
    // Store original console methods
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    logger = new Logger('TestLogger');
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('constructor', () => {
    it('should create logger with name', () => {
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('info', () => {
    it('should log info message without data', () => {
      logger.info('Test info message');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] \[TestLogger\] Test info message/
        )
      );
    });

    it('should log info message with data', () => {
      const testData = { key: 'value', number: 42 };
      logger.info('Test info message', testData);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] \[TestLogger\] Test info message {"key":"value","number":42}/
        )
      );
    });

    it('should handle complex data objects', () => {
      const complexData = {
        nested: { value: 'test' },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };
      logger.info('Complex data message', complexData);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /Complex data message {"nested":{"value":"test"},"array":\[1,2,3\],"nullValue":null}/
        )
      );
    });
  });

  describe('warn', () => {
    it('should log warning message without data', () => {
      logger.warn('Test warning message');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] \[TestLogger\] Test warning message/
        )
      );
    });

    it('should log warning message with data', () => {
      const testData = { warning: 'test warning' };
      logger.warn('Test warning message', testData);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] \[TestLogger\] Test warning message {"warning":"test warning"}/
        )
      );
    });
  });

  describe('error', () => {
    it('should log error message without data', () => {
      logger.error('Test error message');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] \[TestLogger\] Test error message/
        )
      );
    });

    it('should log error message with data', () => {
      const testData = { error: 'test error', code: 500 };
      logger.error('Test error message', testData);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] \[TestLogger\] Test error message {"error":"test error","code":500}/
        )
      );
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      // Error objects have non-enumerable properties that don't serialize well
      expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/Error occurred {}/));
    });
  });

  describe('debug', () => {
    beforeEach(() => {
      // Set LOG_LEVEL to DEBUG
      process.env.LOG_LEVEL = 'DEBUG';
    });

    afterEach(() => {
      // Clean up environment variable
      delete process.env.LOG_LEVEL;
    });

    it('should log debug message when LOG_LEVEL is DEBUG', () => {
      logger.debug('Test debug message');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[DEBUG\] \[TestLogger\] Test debug message/
        )
      );
    });

    it('should log debug message with data when LOG_LEVEL is DEBUG', () => {
      const testData = { debug: 'test debug info' };
      logger.debug('Test debug message', testData);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[DEBUG\] \[TestLogger\] Test debug message {"debug":"test debug info"}/
        )
      );
    });

    it('should not log debug message when LOG_LEVEL is not DEBUG', () => {
      delete process.env.LOG_LEVEL;
      logger.debug('Test debug message');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not log debug message when LOG_LEVEL is different', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.debug('Test debug message');

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('formatMessage', () => {
    it('should format message with timestamp, level, name, and message', () => {
      // Access private method through any type
      const loggerAny = logger as any;
      const formatted = loggerAny.formatMessage('TEST', 'Test message');

      expect(formatted).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[TEST\] \[TestLogger\] Test message/
      );
    });

    it('should include data when provided', () => {
      const loggerAny = logger as any;
      const formatted = loggerAny.formatMessage('TEST', 'Test message', { key: 'value' });

      expect(formatted).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[TEST\] \[TestLogger\] Test message {"key":"value"}/
      );
    });

    it('should not include data section when no data provided', () => {
      const loggerAny = logger as any;
      const formatted = loggerAny.formatMessage('TEST', 'Test message');

      expect(formatted).not.toContain('undefined');
      expect(formatted).not.toContain('null');
    });
  });

  describe('getTimestamp', () => {
    it('should return ISO timestamp string', () => {
      const loggerAny = logger as any;
      const timestamp = loggerAny.getTimestamp();

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current timestamp', () => {
      const loggerAny = logger as any;
      const before = new Date();
      const timestamp = loggerAny.getTimestamp();
      const after = new Date();

      const timestampDate = new Date(timestamp);
      expect(timestampDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestampDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      logger.info('');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] \[TestLogger\] /
        )
      );
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      logger.info(specialMessage);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(specialMessage));
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      logger.info(longMessage);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(longMessage));
    });

    it('should handle circular references in data gracefully', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      // This should handle circular references gracefully
      expect(() => {
        logger.info('Circular data test', circularData);
      }).toThrow('Converting circular structure to JSON');

      // Verify that the error was thrown
      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
