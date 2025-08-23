import { updateId3Metadata } from './id3MetadataHandler';

describe('id3MetadataHandler', () => {
  it('should export updateId3Metadata function', () => {
    // Just verify the module can be imported without errors
    expect(() => {
      require('./id3MetadataHandler');
    }).not.toThrow();
  });
});
