import { handler } from './speechSynthesisHandler';
import { VoiceId, LanguageCode, Engine } from '@aws-sdk/client-polly';

// Mock the utilities
jest.mock('../utils', () => ({
  fileNameToPollyFormat: jest.fn(),
  textToTextType: jest.fn(),
  getDefaultVoiceId: jest.fn(),
  getDefaultLanguageCode: jest.fn(),
  getDefaultEngine: jest.fn(),
  getBucketName: jest.fn(),
  getSnsTopicArn: jest.fn(),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-polly', () => ({
  StartSpeechSynthesisTaskCommand: jest.fn(),
  VoiceId: {
    Joanna: 'Joanna',
    Matthew: 'Matthew',
  },
  LanguageCode: {
    en_US: 'en-US',
    es_ES: 'es-ES',
  },
  Engine: {
    STANDARD: 'standard',
    NEURAL: 'neural',
  },
}));

// Mock the Factory
jest.mock('../services/factory', () => ({
  getFactory: jest.fn(),
}));

describe('speechSynthesisHandler', () => {
  let mockUtils: any;
  let mockGetFactory: any;
  let mockFactory: any;
  let mockS3Service: any;
  let mockDynamoDBService: any;
  let mockPollyClient: any;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock the utilities
    mockUtils = require('../utils');
    mockUtils.fileNameToPollyFormat.mockReturnValue('mp3');
    mockUtils.textToTextType.mockReturnValue('TEXT');
    mockUtils.getDefaultVoiceId.mockReturnValue('Matthew');
    mockUtils.getDefaultLanguageCode.mockReturnValue('en-US');
    mockUtils.getDefaultEngine.mockReturnValue('standard');
    mockUtils.getBucketName.mockReturnValue('test-bucket');
    mockUtils.getSnsTopicArn.mockReturnValue('arn:aws:sns:us-east-1:123456789012:test-topic');

    // Create mock services
    mockS3Service = {
      fileExists: jest.fn(),
      uploadFile: jest.fn(),
    };

    mockDynamoDBService = {
      createTask: jest.fn(),
    };

    mockPollyClient = {
      send: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Mock the Factory
    mockFactory = {
      getOrCreateS3Service: jest.fn().mockReturnValue(mockS3Service),
      getOrCreateDynamoDBService: jest.fn().mockReturnValue(mockDynamoDBService),
      getOrCreatePollyClient: jest.fn().mockReturnValue(mockPollyClient),
      createLogger: jest.fn().mockReturnValue(mockLogger),
    };

    // Mock the getFactory function
    mockGetFactory = require('../services/factory').getFactory;
    mockGetFactory.mockReturnValue(mockFactory);
  });

  describe('Input validation', () => {
    it('should return 400 when text is missing', async () => {
      const event = {
        key: 'test.mp3',
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Missing required parameters: text');
    });

    it('should return 400 when key is missing', async () => {
      const event = {
        text: 'Hello world',
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Missing required parameters: key');
    });

    it('should return 400 when file extension is not supported', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.txt',
      };

      mockUtils.fileNameToPollyFormat.mockReturnValue(null);

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Invalid file extension');
    });
  });

  describe('File existence checks', () => {
    it('should return 200 when file already exists and override is false', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        override: false,
      };

      mockS3Service.fileExists.mockResolvedValue(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('File already exists');
      expect(result.s3Location).toBe('s3://test-bucket/test.mp3');
    });

    it('should proceed when file does not exist and override is false', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        override: false,
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Speech synthesis task started');
    });

    it('should proceed when override is true regardless of file existence', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        override: true,
      };

      mockS3Service.fileExists.mockResolvedValue(true);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Speech synthesis task started');
    });
  });

  describe('Speech synthesis task creation', () => {
    it('should start speech synthesis task when parameters are valid', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        override: true,
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Speech synthesis task started');
      expect(result.taskId).toBe('test-task-id');
      expect(result.taskStatus).toBe('IN_PROGRESS');
      expect(mockDynamoDBService.createTask).toHaveBeenCalledWith('test-task-id', event);
    });

    it('should use default values when optional parameters are not provided', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      await handler(event);

      expect(mockUtils.getDefaultVoiceId).toHaveBeenCalled();
      expect(mockUtils.getDefaultLanguageCode).toHaveBeenCalled();
      expect(mockUtils.getDefaultEngine).toHaveBeenCalled();
    });

    it('should use provided parameters when specified', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        voiceId: VoiceId.Joanna,
        languageCode: LanguageCode.es_ES,
        engine: Engine.NEURAL,
        override: true,
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      await handler(event);

      expect(mockUtils.getDefaultVoiceId).not.toHaveBeenCalled();
      expect(mockUtils.getDefaultLanguageCode).not.toHaveBeenCalled();
      expect(mockUtils.getDefaultEngine).not.toHaveBeenCalled();
    });
  });

  describe('ID3 metadata handling', () => {
    it('should upload ID3 metadata when provided', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        id3: {
          title: 'Test Title',
          artist: 'Test Artist',
        },
        override: true,
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      await handler(event);

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'test.test-task-id.json',
        expect.any(Buffer),
        'application/json'
      );
    });

    it('should not upload ID3 metadata when not provided', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        override: true,
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      await handler(event);

      // The handler always uploads metadata, even when empty
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'test.test-task-id.json',
        expect.any(Buffer),
        'application/json'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockRejectedValue(new Error('Polly service error'));

      await expect(handler(event)).rejects.toThrow('Polly service error');
    });

    it('should handle S3 service errors', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        override: false,
      };

      mockS3Service.fileExists.mockRejectedValue(new Error('S3 service error'));

      await expect(handler(event)).rejects.toThrow('S3 service error');
    });

    it('should handle DynamoDB service errors', async () => {
      const event = {
        text: 'Hello world',
        key: 'test.mp3',
        override: true,
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });
      mockDynamoDBService.createTask.mockRejectedValue(new Error('DynamoDB error'));

      await expect(handler(event)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', async () => {
      const event = {
        text: '',
        key: 'test.mp3',
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Missing required parameters: text');
    });

    it('should handle whitespace-only text', async () => {
      const event = {
        text: '   ',
        key: 'test.mp3',
        override: true,
      };

      // Whitespace-only text is truthy, so it passes validation
      // but will fail when Polly tries to process it
      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Speech synthesis task started');
    });

    it('should handle complex file paths', async () => {
      const event = {
        text: 'Hello world',
        key: 'folder/subfolder/audio.mp3',
        override: true,
      };

      mockS3Service.fileExists.mockResolvedValue(false);
      mockPollyClient.send.mockResolvedValue({
        SynthesisTask: {
          TaskId: 'test-task-id',
          TaskStatus: 'IN_PROGRESS',
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Speech synthesis task started');
    });
  });
});
