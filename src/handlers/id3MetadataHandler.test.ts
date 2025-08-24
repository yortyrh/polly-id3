import { updateId3Metadata } from './id3MetadataHandler';

// Mock the Factory
jest.mock('../services/factory', () => ({
  getFactory: jest.fn(),
}));

describe('id3MetadataHandler', () => {
  let mockGetFactory: any;
  let mockFactory: any;
  let mockS3Service: any;
  let mockLogger: any;
  let mockId3Processor: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock services
    mockS3Service = {
      listMp3Files: jest.fn(),
      fileExists: jest.fn(),
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
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
      createLogger: jest.fn().mockReturnValue(mockLogger),
      getOrCreateId3TagProcessor: jest.fn().mockReturnValue(mockId3Processor),
    };

    // Mock the getFactory function
    mockGetFactory = require('../services/factory').getFactory;
    mockGetFactory.mockReturnValue(mockFactory);
  });

  describe('Input validation', () => {
    it('should process valid event with s3Bucket and folderKey', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      mockS3Service.listMp3Files.mockResolvedValue([]);

      await updateId3Metadata(event);

      expect(mockS3Service.listMp3Files).toHaveBeenCalledWith('test-bucket', 'test-folder/');
      expect(mockLogger.info).toHaveBeenCalledWith('Found files', { files: [] });
    });

    it('should handle empty bucket name', async () => {
      const event = {
        s3Bucket: '',
        folderKey: 'test-folder/',
      };

      mockS3Service.listMp3Files.mockResolvedValue([]);

      await updateId3Metadata(event);

      expect(mockS3Service.listMp3Files).toHaveBeenCalledWith('', 'test-folder/');
    });

    it('should handle empty folder key', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: '',
      };

      mockS3Service.listMp3Files.mockResolvedValue([]);

      await updateId3Metadata(event);

      expect(mockS3Service.listMp3Files).toHaveBeenCalledWith('test-bucket', '');
    });
  });

  describe('File processing', () => {
    it('should process MP3 files with corresponding JSON metadata', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio1.mp3', 'test-folder/audio2.mp3'];
      const mockMetadata = { title: 'Test Audio', artist: 'Test Artist' };
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from(JSON.stringify(mockMetadata));
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer)
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);

      await updateId3Metadata(event);

      expect(mockS3Service.listMp3Files).toHaveBeenCalledWith('test-bucket', 'test-folder/');
      expect(mockLogger.info).toHaveBeenCalledWith('Found files', { files: mockFiles });
      expect(mockS3Service.fileExists).toHaveBeenCalledTimes(2);
      expect(mockS3Service.fileExists).toHaveBeenCalledWith('test-bucket', 'test-folder/audio1.json');
      expect(mockS3Service.fileExists).toHaveBeenCalledWith('test-bucket', 'test-folder/audio2.json');
      expect(mockS3Service.downloadFile).toHaveBeenCalledTimes(4);
      expect(mockId3Processor.applyTags).toHaveBeenCalledTimes(2);
      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'test-folder/audio1.mp3',
        mockTaggedBuffer,
        'audio/mpeg'
      );
    });

    it('should skip files when JSON metadata does not exist', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio1.mp3', 'test-folder/audio2.mp3'];

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists
        .mockResolvedValueOnce(true)  // audio1.json exists
        .mockResolvedValueOnce(false); // audio2.json doesn't exist

      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from('{"title": "Test Audio"}');
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);

      await updateId3Metadata(event);

      expect(mockLogger.warn).toHaveBeenCalledWith('JSON file does not exist', { 
        file: 'test-folder/audio2.mp3' 
      });
      expect(mockS3Service.downloadFile).toHaveBeenCalledTimes(2); // Only for audio1
      expect(mockId3Processor.applyTags).toHaveBeenCalledTimes(1); // Only for audio1
      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(1); // Only for audio1
    });

    it('should process empty folder without errors', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'empty-folder/',
      };

      mockS3Service.listMp3Files.mockResolvedValue([]);

      await updateId3Metadata(event);

      expect(mockLogger.info).toHaveBeenCalledWith('Found files', { files: [] });
      expect(mockS3Service.fileExists).not.toHaveBeenCalled();
      expect(mockS3Service.downloadFile).not.toHaveBeenCalled();
      expect(mockId3Processor.applyTags).not.toHaveBeenCalled();
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should handle complex file paths', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'music/albums/rock/',
      };

      const mockFiles = ['music/albums/rock/track01.mp3'];
      const mockMetadata = { title: 'Rock Audio', artist: 'Rock Band', album: 'Rock Album' };
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from(JSON.stringify(mockMetadata));
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);

      await updateId3Metadata(event);

      expect(mockS3Service.fileExists).toHaveBeenCalledWith('test-bucket', 'music/albums/rock/track01.json');
      expect(mockId3Processor.applyTags).toHaveBeenCalledWith(mockAudioBuffer, mockMetadata);
    });
  });

  describe('Metadata handling', () => {
    it('should parse and apply JSON metadata correctly', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];
      const mockMetadata = {
        title: 'Test Audio',
        artist: 'Test Artist',
        album: 'Test Album',
        genre: 'Test Genre',
        year: '2023',
        track: '1'
      };
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from(JSON.stringify(mockMetadata));
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);

      await updateId3Metadata(event);

      expect(mockId3Processor.applyTags).toHaveBeenCalledWith(mockAudioBuffer, mockMetadata);
    });

    it('should handle invalid JSON metadata', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const invalidJsonBuffer = Buffer.from('invalid-json-content');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(invalidJsonBuffer);

      await expect(updateId3Metadata(event)).rejects.toThrow();
    });

    it('should handle empty JSON metadata', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];
      const emptyMetadata = {};
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from(JSON.stringify(emptyMetadata));
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);

      await updateId3Metadata(event);

      expect(mockId3Processor.applyTags).toHaveBeenCalledWith(mockAudioBuffer, emptyMetadata);
    });
  });

  describe('Error handling', () => {
    it('should handle S3 listMp3Files errors', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      mockS3Service.listMp3Files.mockRejectedValue(new Error('S3 list error'));

      await expect(updateId3Metadata(event)).rejects.toThrow('S3 list error');
    });

    it('should handle S3 fileExists errors', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockRejectedValue(new Error('S3 fileExists error'));

      await expect(updateId3Metadata(event)).rejects.toThrow('S3 fileExists error');
    });

    it('should handle S3 download errors', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile.mockRejectedValue(new Error('S3 download error'));

      await expect(updateId3Metadata(event)).rejects.toThrow('S3 download error');
    });

    it('should handle ID3 processor errors', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from('{"title": "Test"}');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockRejectedValue(new Error('ID3 processing error'));

      await expect(updateId3Metadata(event)).rejects.toThrow('ID3 processing error');
    });

    it('should handle S3 upload errors', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from('{"title": "Test"}');
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);
      mockS3Service.uploadFile.mockRejectedValue(new Error('S3 upload error'));

      await expect(updateId3Metadata(event)).rejects.toThrow('S3 upload error');
    });
  });

  describe('Service integration', () => {
    it('should call all required services with correct parameters', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio.mp3'];
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from('{"title": "Test"}');
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockResolvedValueOnce(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);

      await updateId3Metadata(event);

      expect(mockFactory.getOrCreateS3Service).toHaveBeenCalled();
      expect(mockFactory.createLogger).toHaveBeenCalledWith('id3MetadataHandler');
      expect(mockFactory.getOrCreateId3TagProcessor).toHaveBeenCalled();
    });

    it('should handle multiple files concurrently', async () => {
      const event = {
        s3Bucket: 'test-bucket',
        folderKey: 'test-folder/',
      };

      const mockFiles = ['test-folder/audio1.mp3', 'test-folder/audio2.mp3'];
      const mockAudioBuffer = Buffer.from('mp3-audio-data');
      const mockJsonBuffer = Buffer.from('{"title": "Test"}');
      const mockTaggedBuffer = Buffer.from('tagged-audio-data');

      mockS3Service.listMp3Files.mockResolvedValue(mockFiles);
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.downloadFile.mockResolvedValue(mockAudioBuffer);
      mockS3Service.downloadFile.mockResolvedValue(mockJsonBuffer);
      mockId3Processor.applyTags.mockResolvedValue(mockTaggedBuffer);

      await updateId3Metadata(event);

      expect(mockS3Service.downloadFile).toHaveBeenCalledTimes(4); // 2 mp3 + 2 json
      expect(mockId3Processor.applyTags).toHaveBeenCalledTimes(2);
      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(2);
    });
  });
});
