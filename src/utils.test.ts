import {
  fileNameToPollyFormat,
  textToTextType,
  getDefaultVoiceId,
  getDefaultLanguageCode,
  getDefaultEngine,
  getBucketName,
  getSnsTopicArn,
} from './utils';

describe('Utils', () => {
  beforeEach(() => {
    // Clean up environment variables
    delete process.env.S3_BUCKET_NAME;
    delete process.env.SNS_TOPIC_ARN;
    delete process.env.DEFAULT_VOICE_ID;
    delete process.env.DEFAULT_LANGUAGE_CODE;
    delete process.env.DEFAULT_ENGINE;
    delete process.env.TEXT_TYPE;
    delete process.env.VOICE_ID;
    delete process.env.LANGUAGE_CODE;
    delete process.env.POLLY_ENGINE;
  });

  describe('fileNameToPollyFormat', () => {
    it('should convert .mp3 to mp3', () => {
      expect(fileNameToPollyFormat('audio.mp3')).toBe('mp3');
    });

    it('should convert .wav to pcm', () => {
      expect(fileNameToPollyFormat('audio.wav')).toBe('pcm');
    });

    it('should convert .ogg to ogg_vorbis', () => {
      expect(fileNameToPollyFormat('audio.ogg')).toBe('ogg_vorbis');
    });

    it('should convert .pcm to pcm', () => {
      expect(fileNameToPollyFormat('audio.pcm')).toBe('pcm');
    });

    it('should return null for unknown extensions', () => {
      expect(fileNameToPollyFormat('audio.unknown')).toBe(null);
    });

    it('should handle files without extensions', () => {
      expect(fileNameToPollyFormat('audio')).toBe(null);
    });

    it('should handle files with multiple dots', () => {
      expect(fileNameToPollyFormat('audio.test.mp3')).toBe('mp3');
    });

    it('should handle uppercase extensions', () => {
      expect(fileNameToPollyFormat('audio.MP3')).toBe('mp3');
      expect(fileNameToPollyFormat('audio.WAV')).toBe('pcm');
    });

    it('should handle mixed case extensions', () => {
      expect(fileNameToPollyFormat('audio.Mp3')).toBe('mp3');
      expect(fileNameToPollyFormat('audio.WaV')).toBe('pcm');
    });
  });

  describe('textToTextType', () => {
    it('should return TEXT for plain text', () => {
      expect(textToTextType('This is plain text')).toBe('text');
    });

    it('should return SSML for SSML content', () => {
      const ssmlText = '<speak>This is SSML text</speak>';
      expect(textToTextType(ssmlText)).toBe('ssml');
    });

    it('should return SSML for SSML with attributes', () => {
      const ssmlText = '<speak version="1.0">This is SSML text</speak>';
      expect(textToTextType(ssmlText)).toBe('ssml');
    });

    it('should return SSML for SSML with nested tags', () => {
      const ssmlText = '<speak><prosody rate="slow">This is SSML text</prosody></speak>';
      expect(textToTextType(ssmlText)).toBe('ssml');
    });

    it('should return TEXT for text with angle brackets but not SSML', () => {
      expect(textToTextType('Text with < and > symbols')).toBe('text');
    });

    it('should return TEXT for text with HTML-like content', () => {
      expect(textToTextType('<div>This is not SSML</div>')).toBe('text');
    });

    it('should handle empty string', () => {
      expect(textToTextType('')).toBe('text');
    });

    it('should handle whitespace-only text', () => {
      expect(textToTextType('   \n\t  ')).toBe('text');
    });

    it('should handle text with SSML-like patterns', () => {
      expect(textToTextType('Text with <speak> but not proper SSML')).toBe('text');
    });
  });

  describe('getDefaultVoiceId', () => {
    it('should return default voice when environment variable is not set', () => {
      expect(getDefaultVoiceId()).toBe('Matthew');
    });

    it('should return environment variable value when set', () => {
      process.env.VOICE_ID = 'Joanna';
      expect(getDefaultVoiceId()).toBe('Joanna');
    });

    it('should handle empty environment variable', () => {
      process.env.VOICE_ID = '';
      expect(getDefaultVoiceId()).toBe('');
    });

    it('should handle whitespace-only environment variable', () => {
      process.env.VOICE_ID = '   ';
      expect(getDefaultVoiceId()).toBe('   ');
    });

    it('should not trim whitespace from environment variable', () => {
      process.env.VOICE_ID = '  Joanna  ';
      expect(getDefaultVoiceId()).toBe('  Joanna  ');
    });
  });

  describe('getDefaultLanguageCode', () => {
    it('should return default language when environment variable is not set', () => {
      expect(getDefaultLanguageCode()).toBe('en-US');
    });

    it('should return environment variable value when set', () => {
      process.env.LANGUAGE_CODE = 'es-ES';
      expect(getDefaultLanguageCode()).toBe('es-ES');
    });

    it('should handle empty environment variable', () => {
      process.env.LANGUAGE_CODE = '';
      expect(getDefaultLanguageCode()).toBe('');
    });

    it('should handle whitespace-only environment variable', () => {
      process.env.LANGUAGE_CODE = '   ';
      expect(getDefaultLanguageCode()).toBe('   ');
    });

    it('should not trim whitespace from environment variable', () => {
      process.env.LANGUAGE_CODE = '  fr-FR  ';
      expect(getDefaultLanguageCode()).toBe('  fr-FR  ');
    });
  });

  describe('getDefaultEngine', () => {
    it('should return default engine when environment variable is not set', () => {
      expect(getDefaultEngine()).toBe('neural');
    });

    it('should return environment variable value when set', () => {
      process.env.POLLY_ENGINE = 'standard';
      expect(getDefaultEngine()).toBe('standard');
    });

    it('should handle empty environment variable', () => {
      process.env.POLLY_ENGINE = '';
      expect(getDefaultEngine()).toBe('');
    });

    it('should handle whitespace-only environment variable', () => {
      process.env.POLLY_ENGINE = '   ';
      expect(getDefaultEngine()).toBe('   ');
    });

    it('should not trim whitespace from environment variable', () => {
      process.env.POLLY_ENGINE = '  standard  ';
      expect(getDefaultEngine()).toBe('  standard  ');
    });

    it('should handle different engine values', () => {
      process.env.POLLY_ENGINE = 'neural';
      expect(getDefaultEngine()).toBe('neural');

      process.env.POLLY_ENGINE = 'standard';
      expect(getDefaultEngine()).toBe('standard');
    });
  });

  describe('getBucketName', () => {
    it('should return undefined when bucket name environment variable is not set', () => {
      expect(getBucketName()).toBeUndefined();
    });

    it('should return environment variable value when set', () => {
      process.env.S3_BUCKET_NAME = 'custom-bucket-name';
      expect(getBucketName()).toBe('custom-bucket-name');
    });

    it('should handle empty environment variable', () => {
      process.env.S3_BUCKET_NAME = '';
      expect(getBucketName()).toBe('');
    });

    it('should handle whitespace-only environment variable', () => {
      process.env.S3_BUCKET_NAME = '   ';
      expect(getBucketName()).toBe('   ');
    });

    it('should not trim whitespace from environment variable', () => {
      process.env.S3_BUCKET_NAME = '  my-bucket  ';
      expect(getBucketName()).toBe('  my-bucket  ');
    });

    it('should handle special characters in bucket name', () => {
      process.env.S3_BUCKET_NAME = 'my-bucket-123';
      expect(getBucketName()).toBe('my-bucket-123');
    });
  });

  describe('getSnsTopicArn', () => {
    it('should return undefined when SNS topic ARN environment variable is not set', () => {
      expect(getSnsTopicArn()).toBeUndefined();
    });

    it('should return environment variable value when set', () => {
      process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-west-2:987654321098:custom-topic';
      expect(getSnsTopicArn()).toBe('arn:aws:sns:us-west-2:987654321098:custom-topic');
    });

    it('should handle empty environment variable', () => {
      process.env.SNS_TOPIC_ARN = '';
      expect(getSnsTopicArn()).toBe('');
    });

    it('should handle whitespace-only environment variable', () => {
      process.env.SNS_TOPIC_ARN = '   ';
      expect(getSnsTopicArn()).toBe('   ');
    });

    it('should not trim whitespace from environment variable', () => {
      process.env.SNS_TOPIC_ARN = '  arn:aws:sns:eu-west-1:111222333444:my-topic  ';
      expect(getSnsTopicArn()).toBe('  arn:aws:sns:eu-west-1:111222333444:my-topic  ');
    });

    it('should handle different region ARNs', () => {
      process.env.SNS_TOPIC_ARN = 'arn:aws:sns:ap-southeast-1:555666777888:asia-topic';
      expect(getSnsTopicArn()).toBe('arn:aws:sns:ap-southeast-1:555666777888:asia-topic');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined environment variables', () => {
      delete process.env.S3_BUCKET_NAME;
      delete process.env.SNS_TOPIC_ARN;
      delete process.env.VOICE_ID;
      delete process.env.LANGUAGE_CODE;
      delete process.env.POLLY_ENGINE;

      expect(getBucketName()).toBeUndefined();
      expect(getSnsTopicArn()).toBeUndefined();
      expect(getDefaultVoiceId()).toBe('Matthew');
      expect(getDefaultLanguageCode()).toBe('en-US');
      expect(getDefaultEngine()).toBe('neural');
    });

    it('should handle null-like environment variables', () => {
      process.env.S3_BUCKET_NAME = 'null';
      process.env.VOICE_ID = 'undefined';

      expect(getBucketName()).toBe('null');
      expect(getDefaultVoiceId()).toBe('undefined');
    });

    it('should handle very long environment variable values', () => {
      const longValue = 'a'.repeat(1000);
      process.env.S3_BUCKET_NAME = longValue;
      expect(getBucketName()).toBe(longValue);
    });

    it('should handle special characters in file names', () => {
      expect(fileNameToPollyFormat('file-with-dashes.mp3')).toBe('mp3');
      expect(fileNameToPollyFormat('file_with_underscores.wav')).toBe('pcm');
      expect(fileNameToPollyFormat('file.with.multiple.dots.mp3')).toBe('mp3');
    });

    it('should handle SSML with complex structure', () => {
      const complexSSML = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis">
          <prosody rate="slow" pitch="+2st">
            <say-as interpret-as="cardinal">123</say-as>
            <break time="1s"/>
            <emphasis level="strong">This is complex SSML</emphasis>
          </prosody>
        </speak>
      `;
      expect(textToTextType(complexSSML)).toBe('ssml');
    });

    it('should handle text that looks like SSML but is not', () => {
      const textLikeSSML = 'Text with <speak> tag but not proper SSML structure';
      expect(textToTextType(textLikeSSML)).toBe('text');
    });
  });

  describe('function consistency', () => {
    it('should return consistent values for multiple calls', () => {
      // Set environment variables
      process.env.S3_BUCKET_NAME = 'test-bucket';
      process.env.VOICE_ID = 'test-voice';

      // Multiple calls should return same values
      expect(getBucketName()).toBe('test-bucket');
      expect(getBucketName()).toBe('test-bucket');
      expect(getDefaultVoiceId()).toBe('test-voice');
      expect(getDefaultVoiceId()).toBe('test-voice');
    });

    it('should handle environment variable changes between calls', () => {
      expect(getBucketName()).toBeUndefined();

      process.env.S3_BUCKET_NAME = 'new-bucket';
      expect(getBucketName()).toBe('new-bucket');

      delete process.env.S3_BUCKET_NAME;
      expect(getBucketName()).toBeUndefined();
    });
  });
});
