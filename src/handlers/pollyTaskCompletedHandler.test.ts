import { pollyTaskCompleted } from './pollyTaskCompletedHandler';
import { SNSEvent, SNSEventRecord, Context } from 'aws-lambda';

// Mock the Factory
jest.mock('../services/factory', () => ({
  getFactory: jest.fn(),
}));

// Mock utilities
jest.mock('../utils', () => ({
  fileNameToMimeType: jest.fn(),
}));

describe('pollyTaskCompletedHandler', () => {
  let mockGetFactory: any;
  let mockFactory: any;
  let mockS3Service: any;
  let mockDynamoDBService: any;
  let mockLogger: any;
  let mockId3Processor: any;
  let mockUtils: any;
  let mockContext: Context;
  let mockCallback: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock utilities
    mockUtils = require('../utils');
    mockUtils.fileNameToMimeType.mockReturnValue('audio/mpeg');

    // Create mock services
    mockS3Service = {
      fileExists: jest.fn(),
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
      renameFile: jest.fn(),
    };

    mockDynamoDBService = {
      updateTaskPollyCompleted: jest.fn(),
      updateTaskCompleted: jest.fn(),
      updateTaskFailed: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockId3Processor = {
      applyTags: jest.fn(),
    };

    // Mock the Factory
    mockFactory = {
      getOrCreateS3Service: jest.fn().mockReturnValue(mockS3Service),
      getOrCreateDynamoDBService: jest.fn().mockReturnValue(mockDynamoDBService),
      createLogger: jest.fn().mockReturnValue(mockLogger),
      getOrCreateId3TagProcessor: jest.fn().mockReturnValue(mockId3Processor),
    };

    // Mock the getFactory function
    mockGetFactory = require('../services/factory').getFactory;
    mockGetFactory.mockReturnValue(mockFactory);

    // Create mock AWS Lambda context
    mockContext = {
      callbackWaitsForEmptyEventLoop: true,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2023/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: jest.fn(),
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Create mock callback
    mockCallback = jest.fn();
  });

  const createMockSNSEvent = (message: any): SNSEvent => ({
    Records: [
      {
        Sns: {
          Message: JSON.stringify(message),
          MessageId: 'test-message-id',
          TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
          Subject: 'Test Subject',
          Timestamp: '2023-01-01T00:00:00.000Z',
          SignatureVersion: '1',
          Signature: 'test-signature',
          SigningCertUrl: 'https://test.com/cert',
          UnsubscribeUrl: 'https://test.com/unsubscribe',
          MessageAttributes: {},
        },
        EventSource: 'aws:sns',
        EventVersion: '1.0',
        EventSubscriptionArn: 'arn:aws:sns:us-east-1:123456789012:test-topic:test-subscription',
      } as SNSEventRecord,
    ],
  });

  describe('Input validation', () => {
    it('should handle empty SNS records', async () => {
      const mockEvent: SNSEvent = { Records: [] };

      await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

      expect(mockLogger.info).toHaveBeenCalledWith('Processing SNS event', { recordCount: 0 });
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully processed all SNS events');
    });

    it('should handle malformed SNS message', async () => {
      const mockEvent: SNSEvent = {
        Records: [
          {
            Sns: {
              Message: 'invalid-json',
              MessageId: 'test-message-id',
            },
          } as SNSEventRecord,
        ],
      };

      await expect(pollyTaskCompleted(mockEvent, mockContext, mockCallback)).rejects.toThrow();
    });
  });

  describe('Task status handling', () => {
    it('should process completed Polly task successfully', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'COMPLETED',
        outputFormat: 'mp3',
        outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.mp3.test-task-id',
      };

      const mockEvent = createMockSNSEvent(mockMessage);

      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(Buffer.from('audio-data'))
        .mockResolvedValueOnce(Buffer.from(JSON.stringify({ title: 'Test Song' })));
      mockId3Processor.applyTags.mockResolvedValue(Buffer.from('tagged-audio-data'));

      await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

      expect(mockDynamoDBService.updateTaskPollyCompleted).toHaveBeenCalledWith(
        'test-task-id',
        mockMessage.outputUri
      );
      expect(mockId3Processor.applyTags).toHaveBeenCalled();
      expect(mockS3Service.uploadFile).toHaveBeenCalled();
      expect(mockS3Service.renameFile).toHaveBeenCalledTimes(2);
      expect(mockDynamoDBService.updateTaskCompleted).toHaveBeenCalledWith('test-task-id');
    });

    it('should skip non-completed tasks', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'FAILED',
        outputFormat: 'mp3',
        outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.mp3.test-task-id',
      };

      const mockEvent = createMockSNSEvent(mockMessage);

      await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

      expect(mockLogger.warn).toHaveBeenCalledWith('Skipping non-COMPLETED task status', {
        pollyTaskStatus: 'FAILED',
        pollyTaskId: 'test-task-id',
      });
      expect(mockId3Processor.applyTags).not.toHaveBeenCalled();
    });

    it('should handle different task statuses', async () => {
      const testCases = ['IN_PROGRESS', 'FAILED', 'CANCELLED'];

      for (const status of testCases) {
        const mockMessage = {
          taskId: 'test-task-id',
          taskStatus: status,
          outputFormat: 'mp3',
          outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.mp3.test-task-id',
        };

        const mockEvent = createMockSNSEvent(mockMessage);

        await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

        expect(mockLogger.warn).toHaveBeenCalledWith('Skipping non-COMPLETED task status', {
          pollyTaskStatus: status,
          pollyTaskId: 'test-task-id',
        });
      }
    });
  });

  describe('Output format handling', () => {
    it('should handle missing output URI', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'COMPLETED',
        outputFormat: 'mp3',
        outputUri: '',
      };

      const mockEvent = createMockSNSEvent(mockMessage);

      await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

      expect(mockLogger.warn).toHaveBeenCalledWith('Output URI is missing in the SNS message', {
        pollyTaskId: 'test-task-id',
      });
    });

    it('should handle non-MP3 output formats', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'COMPLETED',
        outputFormat: 'ogg',
        outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.ogg.test-task-id',
      };

      const mockEvent = createMockSNSEvent(mockMessage);
      mockUtils.fileNameToMimeType.mockReturnValue('audio/ogg');

      await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

      expect(mockLogger.warn).toHaveBeenCalledWith('Skipping non-MP3 output format for ID3 metadata', {
        audioMimeType: 'audio/ogg',
        audioKey: 'test-bucket/test-folder/song.ogg.test-task-id',
        pollyTaskId: 'test-task-id',
      });
      expect(mockS3Service.renameFile).toHaveBeenCalledTimes(2);
      expect(mockDynamoDBService.updateTaskCompleted).toHaveBeenCalledWith('test-task-id');
    });

    it('should handle invalid audio file extensions', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'COMPLETED',
        outputFormat: 'unknown',
        outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.unknown.test-task-id',
      };

      const mockEvent = createMockSNSEvent(mockMessage);
      mockUtils.fileNameToMimeType.mockReturnValue(null);

      await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid audio file extension for ID3 metadata', {
        audioKey: 'test-bucket/test-folder/song.unknown.test-task-id',
        audioMimeType: null,
      });
      expect(mockS3Service.renameFile).toHaveBeenCalledTimes(2);
      expect(mockDynamoDBService.updateTaskCompleted).toHaveBeenCalledWith('test-task-id');
    });
  });

  describe('Error handling', () => {
    it('should handle S3 service errors', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'COMPLETED',
        outputFormat: 'mp3',
        outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.mp3.test-task-id',
      };

      const mockEvent = createMockSNSEvent(mockMessage);

      mockS3Service.fileExists.mockRejectedValue(new Error('S3 service error'));

      await expect(pollyTaskCompleted(mockEvent, mockContext, mockCallback)).rejects.toThrow('S3 service error');

      expect(mockDynamoDBService.updateTaskFailed).toHaveBeenCalledWith(
        'test-task-id',
        'S3 service error'
      );
    });

    it('should handle ID3 processor errors', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'COMPLETED',
        outputFormat: 'mp3',
        outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.mp3.test-task-id',
      };

      const mockEvent = createMockSNSEvent(mockMessage);

      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(Buffer.from('audio-data'))
        .mockResolvedValueOnce(Buffer.from('{"title": "Test"}'));
      mockId3Processor.applyTags.mockRejectedValue(new Error('ID3 processing error'));

      await expect(pollyTaskCompleted(mockEvent, mockContext, mockCallback)).rejects.toThrow('ID3 processing error');

      expect(mockDynamoDBService.updateTaskFailed).toHaveBeenCalledWith(
        'test-task-id',
        'ID3 processing error'
      );
    });
  });

  describe('Service integration', () => {
    it('should call all required services with correct parameters', async () => {
      const mockMessage = {
        taskId: 'test-task-id',
        taskStatus: 'COMPLETED',
        outputFormat: 'mp3',
        outputUri: 'https://s3.amazonaws.com/test-bucket/test-folder/song.mp3.test-task-id',
      };

      const mockEvent = createMockSNSEvent(mockMessage);

      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(Buffer.from('audio-data'))
        .mockResolvedValueOnce(Buffer.from('{"title": "Test"}'));
      mockId3Processor.applyTags.mockResolvedValue(Buffer.from('tagged-audio-data'));

      await pollyTaskCompleted(mockEvent, mockContext, mockCallback);

      expect(mockFactory.getOrCreateS3Service).toHaveBeenCalled();
      expect(mockFactory.getOrCreateDynamoDBService).toHaveBeenCalled();
      expect(mockFactory.createLogger).toHaveBeenCalledWith('pollyTaskCompletedHandler');
      expect(mockFactory.getOrCreateId3TagProcessor).toHaveBeenCalled();
    });
  });
});