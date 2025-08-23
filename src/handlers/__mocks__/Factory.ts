export class MockFactory {
  private mockServices: Record<string, any> = {};

  setMockService(serviceName: string, mockService: any) {
    this.mockServices[serviceName] = mockService;
  }

  getOrCreateS3Service() {
    return this.mockServices.s3Service || {
      fileExists: jest.fn(),
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      listMp3Files: jest.fn(),
      renameFile: jest.fn(),
    };
  }

  getOrCreateDynamoDBService() {
    return this.mockServices.dynamoDBService || {
      createTask: jest.fn(),
      getTaskStatus: jest.fn(),
      updateTaskPollyCompleted: jest.fn(),
      updateTaskCompleted: jest.fn(),
      updateTaskFailed: jest.fn(),
    };
  }

  getOrCreatePollyClient() {
    return this.mockServices.pollyClient || {
      send: jest.fn(),
    };
  }

  createLogger() {
    return this.mockServices.logger || {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  }

  getOrCreateId3TagProcessor() {
    return this.mockServices.id3Processor || {
      applyTags: jest.fn(),
    };
  }
}
