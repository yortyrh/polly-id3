import { checkTaskStatus } from './taskStatusHandler';

// Mock the Factory
jest.mock('../services/factory', () => ({
  getFactory: jest.fn(),
}));

describe('taskStatusHandler', () => {
  let mockGetFactory: any;
  let mockFactory: any;
  let mockDynamoDBService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock services
    mockDynamoDBService = {
      getTaskStatus: jest.fn(),
    };

    // Mock the Factory
    mockFactory = {
      getOrCreateDynamoDBService: jest.fn().mockReturnValue(mockDynamoDBService),
      createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
    };

    // Mock the getFactory function
    mockGetFactory = require('../services/factory').getFactory;
    mockGetFactory.mockReturnValue(mockFactory);
  });

  describe('Input validation', () => {
    it('should return "Task not found" when taskId is missing', async () => {
      const event = {};

      const result = await checkTaskStatus(event as any);

      expect(result).toBe('Task not found');
    });

    it('should return "Task not found" when taskId is empty string', async () => {
      const event = { taskId: '' };

      const result = await checkTaskStatus(event as any);

      expect(result).toBe('Task not found');
    });

    it('should return "Task not found" when taskId is null', async () => {
      const event = { taskId: null };

      const result = await checkTaskStatus(event as any);

      expect(result).toBe('Task not found');
    });

    it('should return "Task not found" when taskId is undefined', async () => {
      const event = { taskId: undefined };

      const result = await checkTaskStatus(event as any);

      expect(result).toBe('Task not found');
    });
  });

  describe('Task status retrieval', () => {
    it('should return task status when task exists', async () => {
      const event = { taskId: 'test-task-id' };
      const mockTaskRecord = { status: 'COMPLETED' };

      mockDynamoDBService.getTaskStatus.mockResolvedValue(mockTaskRecord);

      const result = await checkTaskStatus(event);

      expect(result).toBe('COMPLETED');
      expect(mockDynamoDBService.getTaskStatus).toHaveBeenCalledWith('test-task-id');
    });

    it('should return "Task not found" when task does not exist', async () => {
      const event = { taskId: 'non-existent-task-id' };

      mockDynamoDBService.getTaskStatus.mockResolvedValue(null);

      const result = await checkTaskStatus(event);

      expect(result).toBe('Task not found');
      expect(mockDynamoDBService.getTaskStatus).toHaveBeenCalledWith('non-existent-task-id');
    });

    it('should handle different task statuses', async () => {
      const testCases = [
        { status: 'IN_PROGRESS', expected: 'IN_PROGRESS' },
        { status: 'COMPLETED', expected: 'COMPLETED' },
        { status: 'FAILED', expected: 'FAILED' },
        { status: 'CANCELLED', expected: 'CANCELLED' },
      ];

      for (const testCase of testCases) {
        const event = { taskId: 'test-task-id' };
        mockDynamoDBService.getTaskStatus.mockResolvedValue({ status: testCase.status });

        const result = await checkTaskStatus(event);

        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle errors from DynamoDB service', async () => {
      const event = { taskId: 'test-task-id' };

      mockDynamoDBService.getTaskStatus.mockRejectedValue(new Error('DynamoDB error'));

      await expect(checkTaskStatus(event)).rejects.toThrow('DynamoDB error');
    });

    it('should handle DynamoDB service connection errors', async () => {
      const event = { taskId: 'test-task-id' };

      mockDynamoDBService.getTaskStatus.mockRejectedValue(new Error('Connection timeout'));

      await expect(checkTaskStatus(event)).rejects.toThrow('Connection timeout');
    });

    it('should handle DynamoDB service permission errors', async () => {
      const event = { taskId: 'test-task-id' };

      mockDynamoDBService.getTaskStatus.mockRejectedValue(new Error('Access denied'));

      await expect(checkTaskStatus(event)).rejects.toThrow('Access denied');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long task IDs', async () => {
      const longTaskId = 'a'.repeat(1000);
      const event = { taskId: longTaskId };
      const mockTaskRecord = { status: 'COMPLETED' };

      mockDynamoDBService.getTaskStatus.mockResolvedValue(mockTaskRecord);

      const result = await checkTaskStatus(event);

      expect(result).toBe('COMPLETED');
      expect(mockDynamoDBService.getTaskStatus).toHaveBeenCalledWith(longTaskId);
    });

    it('should handle special characters in task IDs', async () => {
      const specialTaskId = 'task-123_456@789#';
      const event = { taskId: specialTaskId };
      const mockTaskRecord = { status: 'IN_PROGRESS' };

      mockDynamoDBService.getTaskStatus.mockResolvedValue(mockTaskRecord);

      const result = await checkTaskStatus(event);

      expect(result).toBe('IN_PROGRESS');
      expect(mockDynamoDBService.getTaskStatus).toHaveBeenCalledWith(specialTaskId);
    });

    it('should handle whitespace-only task IDs', async () => {
      const event = { taskId: '   ' };

      const result = await checkTaskStatus(event);

      expect(result).toBe('Task not found');
    });
  });

  describe('Service integration', () => {
    it('should call DynamoDB service with correct parameters', async () => {
      const event = { taskId: 'test-task-id' };
      const mockTaskRecord = { status: 'COMPLETED' };

      mockDynamoDBService.getTaskStatus.mockResolvedValue(mockTaskRecord);

      await checkTaskStatus(event);

      expect(mockFactory.getOrCreateDynamoDBService).toHaveBeenCalled();
      expect(mockDynamoDBService.getTaskStatus).toHaveBeenCalledWith('test-task-id');
    });

    it('should handle multiple concurrent requests', async () => {
      const event1 = { taskId: 'task-1' };
      const event2 = { taskId: 'task-2' };
      const mockTaskRecord1 = { status: 'COMPLETED' };
      const mockTaskRecord2 = { status: 'IN_PROGRESS' };

      mockDynamoDBService.getTaskStatus
        .mockResolvedValueOnce(mockTaskRecord1)
        .mockResolvedValueOnce(mockTaskRecord2);

      const result1 = await checkTaskStatus(event1);
      const result2 = await checkTaskStatus(event2);

      expect(result1).toBe('COMPLETED');
      expect(result2).toBe('IN_PROGRESS');
      expect(mockDynamoDBService.getTaskStatus).toHaveBeenCalledTimes(2);
    });
  });
});
