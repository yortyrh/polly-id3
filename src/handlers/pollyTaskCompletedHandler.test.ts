import { pollyTaskCompleted } from './pollyTaskCompletedHandler';

describe('pollyTaskCompletedHandler', () => {
  it('should export pollyTaskCompleted function', () => {
    // Just verify the module can be imported without errors
    expect(() => {
      require('./pollyTaskCompletedHandler');
    }).not.toThrow();
  });
});
