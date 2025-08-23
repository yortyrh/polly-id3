import { getFactory } from '../services/factory';

/**
 * This function is used to check the status of a speech synthesis task.
 * @param event - The event object containing the task ID.
 * @returns The status of the task.
 */
export const checkTaskStatus = async (event: {taskId: string}): Promise<string> => {
  const factory = getFactory();
  const dynamoDBService = factory.getOrCreateDynamoDBService();
  const logger = factory.createLogger('taskStatusHandler');

  const { taskId } = event;
  
  logger.info('Checking task status', { taskId });
  
  const taskRecord = await dynamoDBService.getTaskStatus(taskId);
  
  if (!taskRecord) {
    return 'Task not found';
  }

  return taskRecord.status;
}
