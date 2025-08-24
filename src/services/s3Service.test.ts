import { S3Service } from './s3Service';
import { S3 } from 'aws-sdk';
import { Logger } from './logger';

// Mock AWS SDK
jest.mock('aws-sdk');
jest.mock('./logger');

describe('S3Service', () => {
  let s3Service: S3Service;
  let mockS3: jest.Mocked<S3>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockS3 = {
      listObjectsV2: jest.fn(),
      headObject: jest.fn(),
      getObject: jest.fn(),
      putObject: jest.fn(),
      copyObject: jest.fn(),
      deleteObject: jest.fn(),
    } as any;

    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
    (S3 as jest.MockedClass<typeof S3>).mockImplementation(() => mockS3);

    s3Service = new S3Service(mockLogger, mockS3);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create S3Service with correct parameters', () => {
      expect(s3Service).toBeInstanceOf(S3Service);
      // Note: The service doesn't actually call Logger constructor in the test
      // because we're passing the mock logger directly
    });
  });

  describe('listMp3Files', () => {
    it('should list audio files successfully', async () => {
      const mockResponse = {
        Contents: [
          { Key: 'folder/audio1.mp3' },
          { Key: 'folder/audio2.mp3' },
          { Key: 'folder/metadata1.json' },
          { Key: 'folder/audio3.mp3' },
        ],
      };

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files('test-bucket', 'folder/');

      expect(mockS3.listObjectsV2).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: 'folder/',
      });
      expect(result).toEqual(['folder/audio1.mp3', 'folder/audio2.mp3', 'folder/audio3.mp3']);
    });

    it('should return empty array when no audio files found', async () => {
      const mockResponse = {
        Contents: [{ Key: 'folder/metadata1.json' }, { Key: 'folder/other.txt' }],
      };

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files('test-bucket', 'folder/');

      expect(result).toEqual([]);
    });

    it('should handle S3 list errors gracefully', async () => {
      const mockError = new Error('S3 list error');
      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      await expect(s3Service.listMp3Files('test-bucket', 'folder/')).rejects.toThrow(
        'S3 list error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error listing objects in S3', {
        bucketName: 'test-bucket',
        prefix: 'folder/',
        error: mockError,
      });
    });

    it('should handle empty response', async () => {
      const mockResponse = {};

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files('test-bucket', 'folder/');

      expect(result).toEqual([]);
    });

    it('should filter out non-MP3 files correctly', async () => {
      const mockResponse = {
        Contents: [
          { Key: 'folder/audio1.mp3' },
          { Key: 'folder/audio2.MP3' },
          { Key: 'folder/audio3.mp3' },
          { Key: 'folder/audio4.wav' },
          { Key: 'folder/audio5.ogg' },
          { Key: 'folder/metadata.json' },
          { Key: 'folder/readme.txt' },
        ],
      };

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files('test-bucket', 'folder/');

      expect(result).toEqual(['folder/audio1.mp3', 'folder/audio3.mp3']);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      (mockS3.headObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const result = await s3Service.fileExists('test-bucket', 'folder/audio.mp3');

      expect(mockS3.headObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'folder/audio.mp3',
      });
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const mockError = new Error('NotFound');
      (mockError as any).code = 'NotFound';
      (mockS3.headObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      const result = await s3Service.fileExists('test-bucket', 'folder/nonexistent.mp3');

      expect(result).toBe(false);
    });

    it('should handle S3 head errors gracefully', async () => {
      const mockError = new Error('S3 head error');
      (mockS3.headObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      await expect(s3Service.fileExists('test-bucket', 'folder/audio.mp3')).rejects.toThrow(
        'S3 head error'
      );
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockBuffer = Buffer.from('audio data');
      const mockResponse = {
        Body: mockBuffer,
      };

      (mockS3.getObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.downloadFile('test-bucket', 'folder/audio.mp3');

      expect(mockS3.getObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'folder/audio.mp3',
      });
      expect(result).toEqual(mockBuffer);
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully downloaded file from S3', {
        bucketName: 'test-bucket',
        key: 'folder/audio.mp3',
        size: mockBuffer.length,
      });
    });

    it('should handle S3 get errors gracefully', async () => {
      const mockError = new Error('S3 get error');
      (mockS3.getObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      await expect(s3Service.downloadFile('test-bucket', 'folder/audio.mp3')).rejects.toThrow(
        'S3 get error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error downloading file from S3', {
        bucketName: 'test-bucket',
        key: 'folder/audio.mp3',
        error: mockError,
        errorMessage: mockError.message,
        errorStack: mockError.stack,
        errorName: mockError.name,
      });
    });

    it('should handle empty response body', async () => {
      const mockResponse = {};

      (mockS3.getObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      await expect(s3Service.downloadFile('test-bucket', 'folder/audio.mp3')).rejects.toThrow(
        'No body found in S3 response for key: folder/audio.mp3'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error downloading file from S3', {
        bucketName: 'test-bucket',
        key: 'folder/audio.mp3',
        error: expect.any(Error),
        errorMessage: expect.any(String),
        errorStack: expect.any(String),
        errorName: expect.any(String),
      });
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockBuffer = Buffer.from('audio data');
      const mockResponse = {};

      (mockS3.putObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      await s3Service.uploadFile('test-bucket', 'folder/audio.mp3', mockBuffer, 'audio/mpeg');

      expect(mockS3.putObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'folder/audio.mp3',
        Body: mockBuffer,
        ContentType: 'audio/mpeg',
        Metadata: {
          'processed-by': 'apply-id3-lambda',
          'processed-at': expect.any(String),
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully uploaded file to S3', {
        bucketName: 'test-bucket',
        key: 'folder/audio.mp3',
        size: mockBuffer.length,
      });
    });

    it('should handle S3 put errors gracefully', async () => {
      const mockBuffer = Buffer.from('audio data');
      const mockError = new Error('S3 put error');

      (mockS3.putObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      await expect(
        s3Service.uploadFile('test-bucket', 'folder/audio.mp3', mockBuffer, 'audio/mpeg')
      ).rejects.toThrow('S3 put error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error uploading file to S3', {
        bucketName: 'test-bucket',
        key: 'folder/audio.mp3',
        error: mockError,
      });
    });

    it('should require content type parameter', async () => {
      const mockBuffer = Buffer.from('audio data');

      // This should fail at compile time, but let's test the runtime behavior
      await expect(
        s3Service.uploadFile('test-bucket', 'folder/audio.mp3', mockBuffer, '')
      ).rejects.toThrow();
    });
  });

  describe('listObjects', () => {
    it('should list objects successfully', async () => {
      const mockResponse = {
        Contents: [
          { Key: 'folder/file1.txt' },
          { Key: 'folder/file2.mp3' },
          { Key: 'folder/file3.json' },
        ],
      };

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listObjects('test-bucket', 'folder/');

      expect(mockS3.listObjectsV2).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: 'folder/',
      });
      expect(result).toEqual(['folder/file1.txt', 'folder/file2.mp3', 'folder/file3.json']);
    });

    it('should return empty array when no objects found', async () => {
      const mockResponse = {};

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listObjects('test-bucket', 'folder/');

      expect(result).toEqual([]);
    });

    it('should handle S3 list errors gracefully', async () => {
      const mockError = new Error('S3 list error');
      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      await expect(s3Service.listObjects('test-bucket', 'folder/')).rejects.toThrow(
        'S3 list error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error listing objects in S3', {
        bucketName: 'test-bucket',
        prefix: 'folder/',
        error: mockError,
      });
    });
  });

  describe('renameFile', () => {
    it('should rename file successfully', async () => {
      const mockResponse = {};

      (mockS3.copyObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      (mockS3.deleteObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      await s3Service.renameFile('test-bucket', 'folder/old.mp3', 'folder/new.mp3');

      expect(mockS3.copyObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        CopySource: 'test-bucket/folder/old.mp3',
        Key: 'folder/new.mp3',
      });

      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'folder/old.mp3',
      });
    });

    it('should handle S3 copy errors gracefully', async () => {
      const mockError = new Error('S3 copy error');

      (mockS3.copyObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      await expect(
        s3Service.renameFile('test-bucket', 'folder/old.mp3', 'folder/new.mp3')
      ).rejects.toThrow('S3 copy error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error renaming file in S3', {
        bucketName: 'test-bucket',
        key: 'folder/old.mp3',
        newKey: 'folder/new.mp3',
        error: mockError,
      });
    });

    it('should handle S3 delete errors gracefully', async () => {
      const mockResponse = {};
      const mockError = new Error('S3 delete error');

      (mockS3.copyObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      (mockS3.deleteObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(mockError),
      });

      await expect(
        s3Service.renameFile('test-bucket', 'folder/old.mp3', 'folder/new.mp3')
      ).rejects.toThrow('S3 delete error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error renaming file in S3', {
        bucketName: 'test-bucket',
        key: 'folder/old.mp3',
        newKey: 'folder/new.mp3',
        error: mockError,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty bucket name', async () => {
      await expect(s3Service.listMp3Files('', 'folder/')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle empty key', async () => {
      await expect(s3Service.downloadFile('test-bucket', '')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle very long bucket names and keys', async () => {
      const longBucket = 'a'.repeat(1000);
      const longKey = 'b'.repeat(1000);

      const mockResponse = { Contents: [] };
      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files(longBucket, longKey);

      expect(result).toEqual([]);
      expect(mockS3.listObjectsV2).toHaveBeenCalledWith({
        Bucket: longBucket,
        Prefix: longKey,
      });
    });

    it('should handle special characters in bucket names and keys', async () => {
      const specialBucket = 'my-bucket-123!@#$%^&*()';
      const specialKey = 'folder/audio-file_123!@#$%^&*().mp3';

      const mockResponse = { Contents: [] };
      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files(specialBucket, specialKey);

      expect(result).toEqual([]);
      expect(mockS3.listObjectsV2).toHaveBeenCalledWith({
        Bucket: specialBucket,
        Prefix: specialKey,
      });
    });

    it('should handle null and undefined parameters', async () => {
      await expect(s3Service.listMp3Files(null as any, 'folder/')).rejects.toThrow();
      await expect(s3Service.listMp3Files('test-bucket', undefined as any)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('file filtering', () => {
    it('should correctly identify MP3 files with different case extensions', async () => {
      const mockResponse = {
        Contents: [
          { Key: 'folder/audio1.mp3' },
          { Key: 'folder/audio2.MP3' },
          { Key: 'folder/audio3.Mp3' },
          { Key: 'folder/audio4.mP3' },
          { Key: 'folder/audio5.mp3' },
        ],
      };

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files('test-bucket', 'folder/');

      expect(result).toEqual(['folder/audio1.mp3', 'folder/audio5.mp3']);
    });

    it('should exclude non-MP3 files even if they contain mp3 in the name', async () => {
      const mockResponse = {
        Contents: [
          { Key: 'folder/audio.mp3' },
          { Key: 'folder/audio.mp3.txt' },
          { Key: 'folder/audio.mp3.json' },
          { Key: 'folder/audio.mp3.backup' },
          { Key: 'folder/mp3player.exe' },
          { Key: 'folder/audio.mp3.mp3' },
        ],
      };

      (mockS3.listObjectsV2 as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await s3Service.listMp3Files('test-bucket', 'folder/');

      expect(result).toEqual(['folder/audio.mp3', 'folder/audio.mp3.mp3']);
    });
  });
});
