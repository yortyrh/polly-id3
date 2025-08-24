// Global Jest setup

// Mock console methods in tests to reduce noise
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log and console.warn in tests unless explicitly needed
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test timeout
jest.setTimeout(30000);

// Mock AWS SDK
jest.mock('@aws-sdk/client-polly', () => ({
  PollyClient: jest.fn(),
  StartSpeechSynthesisTaskCommand: jest.fn(),
  DescribeSpeechSynthesisTaskCommand: jest.fn(),
  VoiceId: {
    Joanna: 'Joanna',
    Matthew: 'Matthew',
    Salli: 'Salli',
  },
  LanguageCode: {
    EnUS: 'en-US',
    EnGB: 'en-GB',
    FrFR: 'fr-FR',
  },
  Engine: {
    NEURAL: 'neural',
    STANDARD: 'standard',
  },
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
  PutItemCommand: jest.fn(),
  GetItemCommand: jest.fn(),
  UpdateItemCommand: jest.fn(),
  QueryCommand: jest.fn(),
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn(),
}));

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.DYNAMODB_TABLE_NAME = 'test-table';
process.env.DEFAULT_VOICE_ID = 'Joanna';
process.env.DEFAULT_LANGUAGE_CODE = 'en-US';
process.env.DEFAULT_ENGINE = 'neural';
