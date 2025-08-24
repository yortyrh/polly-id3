import { ID3TagProcessor } from './id3TagProcessor';
import { Logger } from './logger';
import * as nodeId3 from 'node-id3';

// Mock node-id3 library
jest.mock('node-id3');
jest.mock('./logger');

describe('ID3TagProcessor', () => {
  let id3TagProcessor: ID3TagProcessor;
  let mockLogger: jest.Mocked<Logger>;
  let mockNodeId3: jest.Mocked<typeof nodeId3>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    mockNodeId3 = nodeId3 as jest.Mocked<typeof nodeId3>;

    // Mock Logger constructor to return our mock logger
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);

    id3TagProcessor = new ID3TagProcessor(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create ID3TagProcessor with correct parameters', () => {
      expect(id3TagProcessor).toBeInstanceOf(ID3TagProcessor);
      // Note: The service doesn't actually call Logger constructor in the test
      // because we're passing the mock logger directly
    });
  });

  describe('applyTags', () => {
    it('should apply ID3 tags successfully', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'Test Title',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(mockNodeId3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          artist: 'Test Artist',
          album: 'Test Album',
        }),
        audioBuffer
      );

      expect(result).toEqual(taggedBuffer);
      expect(mockLogger.info).toHaveBeenCalledWith('Applying ID3 tags', { metadata });
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully applied ID3 tags');
    });

    it('should handle empty metadata', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {};
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(mockNodeId3.write).toHaveBeenCalledWith({}, audioBuffer);
      expect(result).toEqual(taggedBuffer);
    });

    it('should handle partial metadata', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = { title: 'Test Title' };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(mockNodeId3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
        }),
        audioBuffer
      );

      expect(result).toEqual(taggedBuffer);
    });

    it('should handle node-id3 write errors', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = { title: 'Test Title' };

      const mockError = new Error('ID3 write error');
      (mockNodeId3.write as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      await expect(id3TagProcessor.applyTags(audioBuffer, metadata)).rejects.toThrow(
        'ID3 write error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error applying ID3 tags', {
        error: mockError,
        metadata,
      });
    });

    it('should handle null audio buffer', async () => {
      const metadata = { title: 'Test Title' };

      const mockError = new Error('ID3 write error');
      (mockNodeId3.write as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      await expect(id3TagProcessor.applyTags(null as any, metadata)).rejects.toThrow(
        'ID3 write error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error applying ID3 tags', {
        error: expect.any(Error),
        metadata,
      });
    });

    it('should handle undefined audio buffer', async () => {
      const metadata = { title: 'Test Title' };

      const mockError = new Error('ID3 write error');
      (mockNodeId3.write as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      await expect(id3TagProcessor.applyTags(undefined as any, metadata)).rejects.toThrow(
        'ID3 write error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error applying ID3 tags', {
        error: expect.any(Error),
        metadata,
      });
    });

    it('should handle empty audio buffer', async () => {
      const audioBuffer = Buffer.alloc(0);
      const metadata = { title: 'Test Title' };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(result).toEqual(taggedBuffer);
    });

    it('should handle node-id3 write returning null', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = { title: 'Test Title' };

      (mockNodeId3.write as jest.Mock).mockReturnValue(null);

      await expect(id3TagProcessor.applyTags(audioBuffer, metadata)).rejects.toThrow(
        'Failed to write ID3 tags to audio'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Error applying ID3 tags', {
        error: expect.any(Error),
        metadata,
      });
    });
  });

  describe('readTags', () => {
    it('should read ID3 tags successfully', () => {
      const audioBuffer = Buffer.from('test audio data');
      const mockTags = {
        title: 'Test Title',
        artist: 'Test Artist',
        album: 'Test Album',
      };

      (mockNodeId3.read as jest.Mock).mockReturnValue(mockTags);

      const result = id3TagProcessor.readTags(audioBuffer);

      expect(mockNodeId3.read).toHaveBeenCalledWith(audioBuffer);
      expect(result).toEqual(mockTags);
    });

    it('should handle audio with no tags', () => {
      const audioBuffer = Buffer.from('test audio data');

      (mockNodeId3.read as jest.Mock).mockReturnValue({});

      const result = id3TagProcessor.readTags(audioBuffer);

      expect(result).toEqual({});
    });

    it('should handle partial tags', () => {
      const audioBuffer = Buffer.from('test audio data');
      const mockTags = { title: 'Test Title' };

      (mockNodeId3.read as jest.Mock).mockReturnValue(mockTags);

      const result = id3TagProcessor.readTags(audioBuffer);

      expect(result).toEqual(mockTags);
    });

    it('should handle node-id3 read errors gracefully', () => {
      const audioBuffer = Buffer.from('test audio data');
      const mockError = new Error('ID3 read error');

      (mockNodeId3.read as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const result = id3TagProcessor.readTags(audioBuffer);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Could not read existing ID3 tags', {
        error: mockError,
      });
    });

    it('should handle null audio buffer', () => {
      const mockError = new Error('ID3 read error');

      (mockNodeId3.read as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const result = id3TagProcessor.readTags(null as any);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Could not read existing ID3 tags', {
        error: mockError,
      });
    });

    it('should handle undefined audio buffer', () => {
      const mockError = new Error('ID3 read error');

      (mockNodeId3.read as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const result = id3TagProcessor.readTags(undefined as any);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Could not read existing ID3 tags', {
        error: mockError,
      });
    });

    it('should handle empty audio buffer', () => {
      const audioBuffer = Buffer.alloc(0);
      const mockTags = { title: 'Test Title' };

      (mockNodeId3.read as jest.Mock).mockReturnValue(mockTags);

      const result = id3TagProcessor.readTags(audioBuffer);

      expect(result).toEqual(mockTags);
    });
  });

  describe('edge cases', () => {
    it('should handle very large audio buffers', async () => {
      const audioBuffer = Buffer.alloc(1024 * 1024); // 1MB buffer
      const metadata = { title: 'Test Title' };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(result).toEqual(taggedBuffer);
    });

    it('should handle special characters in metadata', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'Test Title with special chars: !@#$%^&*()',
        artist: 'Artist with émojis 🎵🎶',
        comment: 'Comment with "quotes" and \'apostrophes\'',
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(result).toEqual(taggedBuffer);
    });

    it('should handle very long metadata values', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'A'.repeat(1000),
        artist: 'B'.repeat(1000),
        comment: 'C'.repeat(1000),
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(result).toEqual(taggedBuffer);
    });

    it('should handle metadata with undefined values', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'Test Title',
        artist: undefined,
        album: undefined,
        year: '',
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(result).toEqual(taggedBuffer);
    });
  });

  describe('metadata validation', () => {
    it('should handle valid metadata types', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'Test Title',
        year: 2023,
        bpm: 120,
        track: 1,
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(result).toEqual(taggedBuffer);
    });

    it('should handle metadata with function values', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'Test Title',
        customField: () => 'function value',
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      const result = await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(result).toEqual(taggedBuffer);
    });
  });

  describe('metadata conversion', () => {
    it('should convert metadata to ID3 format correctly', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'Test Title',
        artist: 'Test Artist',
        album: 'Test Album',
        year: '2023',
        genre: 'Test Genre',
        comment: 'Test Comment',
        lyrics: 'Test Lyrics',
        composer: 'Test Composer',
        albumArtist: 'Test Album Artist',
        bpm: '120',
        track: '1',
        customField: 'Custom Value',
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(mockNodeId3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          artist: 'Test Artist',
          album: 'Test Album',
          year: '2023',
          genre: 'Test Genre',
          comment: { language: 'eng', text: 'Test Comment' },
          unsynchronisedLyrics: { language: 'eng', text: 'Test Lyrics' },
          composer: 'Test Composer',
          performerInfo: 'Test Album Artist',
          bpm: '120',
          trackNumber: '1',
          userDefinedText: [
            {
              description: 'customField',
              value: 'Custom Value',
            },
          ],
        }),
        audioBuffer
      );
    });

    it('should handle custom fields in metadata', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const metadata = {
        title: 'Test Title',
        customField1: 'Custom Value 1',
        customField2: 'Custom Value 2',
        customField3: 123,
      };
      const taggedBuffer = Buffer.from('tagged audio data');

      (mockNodeId3.write as jest.Mock).mockReturnValue(taggedBuffer);

      await id3TagProcessor.applyTags(audioBuffer, metadata);

      expect(mockNodeId3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          userDefinedText: [
            {
              description: 'customField1',
              value: 'Custom Value 1',
            },
            {
              description: 'customField2',
              value: 'Custom Value 2',
            },
            {
              description: 'customField3',
              value: '123',
            },
          ],
        }),
        audioBuffer
      );
    });
  });
});
