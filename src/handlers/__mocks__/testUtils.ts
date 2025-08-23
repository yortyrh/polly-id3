import { MockFactory } from './Factory';

export const createMockFactory = (): MockFactory => {
  return new MockFactory();
};

export const createMockS3Service = () => ({
  fileExists: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  listMp3Files: jest.fn(),
  renameFile: jest.fn(),
});

export const createMockDynamoDBService = () => ({
  createTask: jest.fn(),
  getTaskStatus: jest.fn(),
  updateTaskPollyCompleted: jest.fn(),
  updateTaskCompleted: jest.fn(),
  updateTaskFailed: jest.fn(),
});

export const createMockPollyClient = () => ({
  send: jest.fn(),
});

export const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

export const createMockId3Processor = () => ({
  applyTags: jest.fn(),
});

export const mockUtils = {
  fileNameToPollyFormat: jest.fn(),
  textToTextType: jest.fn(),
  getDefaultVoiceId: jest.fn(),
  getDefaultLanguageCode: jest.fn(),
  getDefaultEngine: jest.fn(),
  getBucketName: jest.fn(),
  getSnsTopicArn: jest.fn(),
  fileNameToMimeType: jest.fn(),
};
