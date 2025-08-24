import { DynamoDBService } from './DynamoDBService';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { Logger } from './logger';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-dynamodb');
  return {
    ...originalModule,
    DynamoDBClient: jest.fn().mockImplementation(() => {
      return { send: jest.fn() };
    }),
    UpdateItemCommand: jest.fn().mockImplementation((input: any) => {
      return { input };
    }),
    PutItemCommand: jest.fn().mockImplementation((input: any) => {
      return { input };
    }),
    GetItemCommand: jest.fn().mockImplementation((input: any) => {
      return { input };
    }),
    DeleteItemCommand: jest.fn().mockImplementation((input: any) => {
      return { input };
    }),
  };
});
jest.mock('./logger');

describe('DynamoDBService', () => {
  let dynamoDBService: DynamoDBService;
  let mockDynamoDBClient: jest.Mocked<DynamoDBClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    mockDynamoDBClient = { send: jest.fn() } as any;

    // Mock Logger constructor to return our mock logger
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);

    dynamoDBService = new DynamoDBService(mockLogger, 'test-table', mockDynamoDBClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create DynamoDBService with correct parameters', () => {
      expect(dynamoDBService).toBeInstanceOf(DynamoDBService);
      // Note: The service doesn't actually call Logger constructor in the test
      // because we're passing the mock logger directly
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const taskId = 'test-task-123';
      const eventData = JSON.stringify({ text: 'test text', key: 'test-key' });

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({});

      await dynamoDBService.createTask(taskId, eventData);

      expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'test-table',
            Item: expect.objectContaining({
              taskId: { S: taskId },
              status: { S: 'polly-scheduled' },
              eventData: { S: eventData },
              ttl: { N: expect.any(String) },
            }),
          },
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Task created successfully', {
        taskId,
        status: 'polly-scheduled',
      });
    });

    it('should handle errors when creating task', async () => {
      const taskId = 'test-task-123';
      const eventData = { text: 'test text' };
      const mockError = new Error('DynamoDB error');

      (mockDynamoDBClient.send as jest.Mock).mockRejectedValue(mockError);

      await expect(dynamoDBService.createTask(taskId, eventData)).rejects.toThrow('DynamoDB error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error creating task', {
        taskId,
        error: mockError,
      });
    });
  });

  describe('updateTaskPollyCompleted', () => {
    it('should update task to polly-completed successfully', async () => {
      const taskId = 'test-task-123';
      const s3Location = 's3://bucket/audio.mp3';

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({});

      await dynamoDBService.updateTaskPollyCompleted(taskId, s3Location);

      expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'test-table',
            Key: { taskId: { S: taskId } },
            UpdateExpression:
              'SET #status = :status, s3Location = :s3Location, updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: expect.objectContaining({
              ':status': { S: 'polly-completed' },
              ':s3Location': { S: s3Location },
              ':updatedAt': { S: expect.any(String) },
            }),
          },
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Task updated to polly-completed', {
        taskId,
        s3Location,
      });
    });

    it('should handle errors when updating task to polly-completed', async () => {
      const taskId = 'test-task-123';
      const s3Location = 's3://bucket/audio.mp3';
      const mockError = new Error('DynamoDB error');

      (mockDynamoDBClient.send as jest.Mock).mockRejectedValue(mockError);

      await expect(dynamoDBService.updateTaskPollyCompleted(taskId, s3Location)).rejects.toThrow(
        'DynamoDB error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error updating task to polly-completed', {
        taskId,
        error: mockError,
      });
    });
  });

  describe('updateTaskCompleted', () => {
    it('should update task to completed successfully', async () => {
      const taskId = 'test-task-123';

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({});

      await dynamoDBService.updateTaskCompleted(taskId);

      expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'test-table',
            Key: { taskId: { S: taskId } },
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: expect.objectContaining({
              ':status': { S: 'completed' },
              ':updatedAt': { S: expect.any(String) },
            }),
          },
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Task updated to completed', { taskId });
    });

    it('should handle errors when updating task to completed', async () => {
      const taskId = 'test-task-123';
      const mockError = new Error('DynamoDB error');

      (mockDynamoDBClient.send as jest.Mock).mockRejectedValue(mockError);

      await expect(dynamoDBService.updateTaskCompleted(taskId)).rejects.toThrow('DynamoDB error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error updating task to completed', {
        taskId,
        error: mockError,
      });
    });
  });

  describe('updateTaskFailed', () => {
    it('should update task to failed successfully', async () => {
      const taskId = 'test-task-123';
      const errorMessage = 'Processing failed';

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({});

      await dynamoDBService.updateTaskFailed(taskId, errorMessage);

      expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'test-table',
            Key: { taskId: { S: taskId } },
            UpdateExpression:
              'SET #status = :status, errorMessage = :errorMessage, updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: expect.objectContaining({
              ':status': { S: 'failed' },
              ':errorMessage': { S: errorMessage },
              ':updatedAt': { S: expect.any(String) },
            }),
          },
        })
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Task marked as failed', {
        taskId,
        errorMessage,
      });
    });

    it('should handle errors when updating task to failed', async () => {
      const taskId = 'test-task-123';
      const errorMessage = 'Processing failed';
      const mockError = new Error('DynamoDB error');

      (mockDynamoDBClient.send as jest.Mock).mockRejectedValue(mockError);

      await expect(dynamoDBService.updateTaskFailed(taskId, errorMessage)).rejects.toThrow(
        'DynamoDB error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error updating task to failed', {
        taskId,
        error: mockError,
      });
    });
  });

  describe('getTaskStatus', () => {
    it('should get task status successfully', async () => {
      const taskId = 'test-task-123';
      const mockTaskRecord = {
        taskId,
        status: 'polly-completed',
        eventData: { text: 'test text' },
        s3Location: 's3://bucket/audio.mp3',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({
        Item: {
          taskId: { S: taskId },
          status: { S: 'polly-completed' },
          eventData: { S: JSON.stringify(mockTaskRecord.eventData) },
          s3Location: { S: mockTaskRecord.s3Location },
          createdAt: { S: mockTaskRecord.createdAt },
          updatedAt: { S: mockTaskRecord.updatedAt },
        },
      });

      const result = await dynamoDBService.getTaskStatus(taskId);

      expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'test-table',
            Key: { taskId: { S: taskId } },
          },
        })
      );

      expect(result).toEqual({
        taskId,
        status: 'polly-completed',
        eventData: JSON.stringify(mockTaskRecord.eventData),
        s3Location: mockTaskRecord.s3Location,
        createdAt: mockTaskRecord.createdAt,
        updatedAt: mockTaskRecord.updatedAt,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Task status retrieved', {
        taskId,
        status: 'polly-completed',
      });
    });

    it('should return null when task not found', async () => {
      const taskId = 'test-task-123';

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({ Item: undefined });

      const result = await dynamoDBService.getTaskStatus(taskId);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Task not found', { taskId });
    });

    it('should handle errors when getting task status', async () => {
      const taskId = 'test-task-123';
      const mockError = new Error('DynamoDB error');

      (mockDynamoDBClient.send as jest.Mock).mockRejectedValue(mockError);

      await expect(dynamoDBService.getTaskStatus(taskId)).rejects.toThrow('DynamoDB error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error getting task status', {
        taskId,
        error: mockError,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long taskId', async () => {
      const taskId = 'a'.repeat(1000);
      const eventData = { text: 'test' };

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({});

      await dynamoDBService.createTask(taskId, eventData);

      expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'test-table',
            Item: expect.objectContaining({
              taskId: { S: taskId },
            }),
          },
        })
      );
    });

    it('should handle special characters in taskId', async () => {
      const taskId = 'task-123!@#$%^&*()_+-=[]{}|;:,.<>?';
      const eventData = { text: 'test' };

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({});

      await dynamoDBService.createTask(taskId, eventData);

      expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'test-table',
            Item: expect.objectContaining({
              taskId: { S: taskId },
            }),
          },
        })
      );
    });
  });

  describe('TTL handling', () => {
    it('should set TTL to 7 days from creation', async () => {
      const taskId = 'test-task-123';
      const eventData = { text: 'test text' };
      const startTime = Date.now();

      (mockDynamoDBClient.send as jest.Mock).mockResolvedValue({});

      await dynamoDBService.createTask(taskId, eventData);

      const callArgs = (mockDynamoDBClient.send as jest.Mock).mock.calls[0][0];
      const ttlValue = callArgs.input.Item.ttl.N;
      const expectedTTL = Math.floor(startTime / 1000) + 7 * 24 * 60 * 60;

      expect(parseInt(ttlValue)).toBeGreaterThanOrEqual(expectedTTL - 1);
      expect(parseInt(ttlValue)).toBeLessThanOrEqual(expectedTTL + 1);
    });
  });
});
