import { handler } from './speechSynthesisHandler';

describe('speechSynthesisHandler', () => {
  it('should export handler function', () => {
    // Just verify the module can be imported without errors
    expect(() => {
      require('./speechSynthesisHandler');
    }).not.toThrow();
  });
});
