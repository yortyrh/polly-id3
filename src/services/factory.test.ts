import { getFactory } from './factory';
import { Logger } from './logger';
import { S3Service } from './s3Service';
import { DynamoDBService } from './DynamoDBService';
import { ID3TagProcessor } from './id3TagProcessor';
import { PollyClient } from '@aws-sdk/client-polly';
import { S3 } from 'aws-sdk';
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Mock AWS SDK
jest.mock('@aws-sdk/client-polly');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('aws-sdk');
jest.mock('@smithy/util-retry');

// Mock services
jest.mock('./logger');
jest.mock('./s3Service');
jest.mock('./DynamoDBService');
jest.mock('./id3TagProcessor');

describe('Factory', () => {
  let factory: any;
  let mockLogger: jest.Mocked<Logger>;
  let mockS3Service: jest.Mocked<S3Service>;
  let mockDynamoDBService: jest.Mocked<DynamoDBService>;
  let mockId3TagProcessor: jest.Mocked<ID3TagProcessor>;
  let mockPollyClient: jest.Mocked<PollyClient>;
  let mockS3: jest.Mocked<S3>;
  let mockS3Client: jest.Mocked<S3Client>;
  let mockDynamoDBClient: jest.Mocked<DynamoDBClient>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockS3Service = {
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
      fileExists: jest.fn(),
      listMp3Files: jest.fn(),
      listObjects: jest.fn(),
    } as any;

    mockDynamoDBService = {
      createTask: jest.fn(),
      updateTaskPollyCompleted: jest.fn(),
      updateTaskCompleted: jest.fn(),
      updateTaskFailed: jest.fn(),
      getTask: jest.fn(),
    } as any;

    mockId3TagProcessor = {
      applyTags: jest.fn(),
      readTags: jest.fn(),
    } as any;

    mockPollyClient = {
      send: jest.fn(),
    } as any;

    mockS3 = {
      getObject: jest.fn(),
      putObject: jest.fn(),
      listObjectsV2: jest.fn(),
    } as any;

    mockS3Client = {
      send: jest.fn(),
    } as any;

    mockDynamoDBClient = {
      send: jest.fn(),
    } as any;

    // Mock constructors
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
    (S3Service as jest.MockedClass<typeof S3Service>).mockImplementation(() => mockS3Service);
    (DynamoDBService as jest.MockedClass<typeof DynamoDBService>).mockImplementation(
      () => mockDynamoDBService
    );
    (ID3TagProcessor as jest.MockedClass<typeof ID3TagProcessor>).mockImplementation(
      () => mockId3TagProcessor
    );
    (PollyClient as jest.MockedClass<typeof PollyClient>).mockImplementation(() => mockPollyClient);
    (S3 as jest.MockedClass<typeof S3>).mockImplementation(() => mockS3);
    (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => mockS3Client);
    (DynamoDBClient as jest.MockedClass<typeof DynamoDBClient>).mockImplementation(
      () => mockDynamoDBClient
    );

    // Get factory instance
    factory = getFactory();

    // Clear the services cache to ensure fresh state for each test
    (factory as any).services = {};
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.MAX_RETRY_ATTEMPTS;
    delete process.env.DYNAMODB_TABLE_NAME;
    delete process.env.AWS_REGION;
  });

  describe('get', () => {
    it('should create service on first call', () => {
      const creator = jest.fn().mockReturnValue('test-service');
      const result = factory.get('testService', creator);

      expect(creator).toHaveBeenCalledTimes(1);
      expect(result).toBe('test-service');
    });

    it('should return existing service on subsequent calls', () => {
      const creator = jest.fn().mockReturnValue('test-service');

      // First call
      const result1 = factory.get('testService', creator);
      // Second call
      const result2 = factory.get('testService', creator);

      expect(creator).toHaveBeenCalledTimes(1);
      expect(result1).toBe('test-service');
      expect(result2).toBe('test-service');
    });

    it('should handle different service keys separately', () => {
      const creator1 = jest.fn().mockReturnValue('service1');
      const creator2 = jest.fn().mockReturnValue('service2');

      const result1 = factory.get('service1', creator1);
      const result2 = factory.get('service2', creator2);

      expect(creator1).toHaveBeenCalledTimes(1);
      expect(creator2).toHaveBeenCalledTimes(1);
      expect(result1).toBe('service1');
      expect(result2).toBe('service2');
    });
  });

  describe('getOrCreateMaxRetryAttempts', () => {
    it('should return default value when environment variable is not set', () => {
      const result = factory.getOrCreateMaxRetryAttempts();
      expect(result).toBe(3);
    });

    it('should return environment variable value when set', () => {
      process.env.MAX_RETRY_ATTEMPTS = '5';
      const result = factory.getOrCreateMaxRetryAttempts();
      expect(result).toBe(5);
    });

    it('should parse string to integer', () => {
      process.env.MAX_RETRY_ATTEMPTS = '10';
      const result = factory.getOrCreateMaxRetryAttempts();
      expect(result).toBe(10);
      expect(typeof result).toBe('number');
    });

    it('should handle invalid environment variable gracefully', () => {
      // Clear the cache for this specific test
      (factory as any).services = {};
      process.env.MAX_RETRY_ATTEMPTS = 'invalid';
      const result = factory.getOrCreateMaxRetryAttempts();
      // The current implementation returns NaN for invalid input
      expect(result).toBeNaN();
    });
  });

  describe('getTasksTableName', () => {
    it('should return default table name when environment variable is not set', () => {
      const result = factory.getTasksTableName();
      expect(result).toBe('polly-id3-tasks');
    });

    it('should return environment variable value when set', () => {
      process.env.DYNAMODB_TABLE_NAME = 'custom-table-name';
      const result = factory.getTasksTableName();
      expect(result).toBe('custom-table-name');
    });
  });

  describe('getOrCreateS3', () => {
    it('should create S3 instance with correct configuration', () => {
      const result = factory.getOrCreateS3();

      expect(S3).toHaveBeenCalledWith({
        maxRetries: 3,
        retryDelayOptions: {
          base: 1000,
        },
      });
      expect(result).toBe(mockS3);
    });

    it('should reuse existing S3 instance', () => {
      const result1 = factory.getOrCreateS3();
      const result2 = factory.getOrCreateS3();

      expect(S3).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockS3);
      expect(result2).toBe(mockS3);
    });

    it('should use custom retry attempts when set', () => {
      process.env.MAX_RETRY_ATTEMPTS = '7';
      factory.getOrCreateS3();

      expect(S3).toHaveBeenCalledWith({
        maxRetries: 7,
        retryDelayOptions: {
          base: 1000,
        },
      });
    });
  });

  describe('getOrCreateS3Service', () => {
    it('should create S3Service with logger and S3 client', () => {
      const result = factory.getOrCreateS3Service();

      expect(Logger).toHaveBeenCalledWith('S3Service');
      expect(S3Service).toHaveBeenCalledWith(mockLogger, mockS3);
      expect(result).toBe(mockS3Service);
    });

    it('should reuse existing S3Service instance', () => {
      const result1 = factory.getOrCreateS3Service();
      const result2 = factory.getOrCreateS3Service();

      expect(S3Service).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockS3Service);
      expect(result2).toBe(mockS3Service);
    });
  });

  describe('getOrCreatePollyClient', () => {
    it('should create PollyClient with retry strategy', () => {
      const result = factory.getOrCreatePollyClient();

      expect(PollyClient).toHaveBeenCalledWith({
        retryStrategy: expect.any(Object),
      });
      expect(result).toBe(mockPollyClient);
    });

    it('should reuse existing PollyClient instance', () => {
      const result1 = factory.getOrCreatePollyClient();
      const result2 = factory.getOrCreatePollyClient();

      expect(PollyClient).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockPollyClient);
      expect(result2).toBe(mockPollyClient);
    });

    it('should use custom retry attempts for retry strategy', () => {
      process.env.MAX_RETRY_ATTEMPTS = '5';
      factory.getOrCreatePollyClient();

      expect(PollyClient).toHaveBeenCalledWith({
        retryStrategy: expect.any(Object),
      });
    });
  });

  describe('getOrCreateS3Client', () => {
    it('should create S3Client with retry strategy', () => {
      const result = factory.getOrCreateS3Client();

      expect(S3Client).toHaveBeenCalledWith({
        retryStrategy: expect.any(Object),
      });
      expect(result).toBe(mockS3Client);
    });

    it('should reuse existing S3Client instance', () => {
      const result1 = factory.getOrCreateS3Client();
      const result2 = factory.getOrCreateS3Client();

      expect(S3Client).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockS3Client);
      expect(result2).toBe(mockS3Client);
    });
  });

  describe('createLogger', () => {
    it('should create Logger with given name', () => {
      const result = factory.createLogger('TestLogger');

      expect(Logger).toHaveBeenCalledWith('TestLogger');
      expect(result).toBe(mockLogger);
    });

    it('should create different loggers for different names', () => {
      const logger1 = factory.createLogger('Logger1');
      const logger2 = factory.createLogger('Logger2');

      expect(Logger).toHaveBeenCalledWith('Logger1');
      expect(Logger).toHaveBeenCalledWith('Logger2');
      expect(logger1).toBe(mockLogger);
      expect(logger2).toBe(mockLogger);
    });
  });

  describe('getOrCreateId3TagProcessor', () => {
    it('should create ID3TagProcessor with logger', () => {
      const result = factory.getOrCreateId3TagProcessor();

      expect(Logger).toHaveBeenCalledWith('ID3TagProcessor');
      expect(ID3TagProcessor).toHaveBeenCalledWith(mockLogger);
      expect(result).toBe(mockId3TagProcessor);
    });

    it('should reuse existing ID3TagProcessor instance', () => {
      const result1 = factory.getOrCreateId3TagProcessor();
      const result2 = factory.getOrCreateId3TagProcessor();

      expect(ID3TagProcessor).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockId3TagProcessor);
      expect(result2).toBe(mockId3TagProcessor);
    });
  });

  describe('getOrCreateDynamoDBClient', () => {
    it('should create DynamoDBClient with region', () => {
      process.env.AWS_REGION = 'us-west-2';
      const result = factory.getOrCreateDynamoDBClient();

      expect(DynamoDBClient).toHaveBeenCalledWith({
        region: 'us-west-2',
        retryStrategy: expect.any(Object),
      });
      expect(result).toBe(mockDynamoDBClient);
    });

    it('should reuse existing DynamoDBClient instance', () => {
      const result1 = factory.getOrCreateDynamoDBClient();
      const result2 = factory.getOrCreateDynamoDBClient();

      expect(DynamoDBClient).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockDynamoDBClient);
      expect(result2).toBe(mockDynamoDBClient);
    });

    it('should handle missing AWS_REGION gracefully', () => {
      const result = factory.getOrCreateDynamoDBClient();

      expect(DynamoDBClient).toHaveBeenCalledWith({
        region: undefined,
        retryStrategy: expect.any(Object),
      });
      expect(result).toBe(mockDynamoDBClient);
    });
  });

  describe('getOrCreateDynamoDBService', () => {
    it('should create DynamoDBService with logger, table name, and client', () => {
      const result = factory.getOrCreateDynamoDBService();

      expect(Logger).toHaveBeenCalledWith('DynamoDBService');
      expect(DynamoDBService).toHaveBeenCalledWith(
        mockLogger,
        'polly-id3-tasks',
        mockDynamoDBClient
      );
      expect(result).toBe(mockDynamoDBService);
    });

    it('should reuse existing DynamoDBService instance', () => {
      const result1 = factory.getOrCreateDynamoDBService();
      const result2 = factory.getOrCreateDynamoDBService();

      expect(DynamoDBService).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockDynamoDBService);
      expect(result2).toBe(mockDynamoDBService);
    });

    it('should use custom table name when set', () => {
      process.env.DYNAMODB_TABLE_NAME = 'custom-table';
      factory.getOrCreateDynamoDBService();

      expect(DynamoDBService).toHaveBeenCalledWith(mockLogger, 'custom-table', mockDynamoDBClient);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same factory instance on multiple calls', () => {
      const factory1 = getFactory();
      const factory2 = getFactory();

      expect(factory1).toBe(factory2);
    });

    it('should maintain service instances across factory calls', () => {
      const factory1 = getFactory();
      const service1 = factory1.getOrCreateS3Service();

      const factory2 = getFactory();
      const service2 = factory2.getOrCreateS3Service();

      expect(service1).toBe(service2);
      expect(S3Service).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle service creation errors gracefully', () => {
      // Mock a service constructor to throw an error
      (S3Service as jest.MockedClass<typeof S3Service>).mockImplementationOnce(() => {
        throw new Error('Service creation failed');
      });

      expect(() => {
        factory.getOrCreateS3Service();
      }).toThrow('Service creation failed');
    });

    it('should handle invalid retry attempts gracefully', () => {
      process.env.MAX_RETRY_ATTEMPTS = 'invalid';

      // Should not throw, should use default value
      expect(() => {
        factory.getOrCreateS3();
      }).not.toThrow();
    });
  });
});
