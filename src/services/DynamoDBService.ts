import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from './logger';

export interface TaskRecord {
  taskId: string;
  status: 'polly-scheduled' | 'polly-completed' | 'completed' | 'failed';
  eventData: any;
  s3Location?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  ttl?: number;
}

export class DynamoDBService {
  constructor(
    private readonly logger: Logger, // eslint-disable-line no-unused-vars
    private readonly tableName: string, // eslint-disable-line no-unused-vars
    private readonly client: DynamoDBClient // eslint-disable-line no-unused-vars
  ) {}

  /**
   * Create a new task record when the synthesis is initiated
   */
  async createTask(taskId: string, eventData: any): Promise<void> {
    try {
      // Set TTL to 7 days from now
      const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      const taskRecord: TaskRecord = {
        taskId,
        status: 'polly-scheduled',
        eventData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ttl,
      };

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(taskRecord),
      });

      await this.client.send(command);
      this.logger.info('Task created successfully', { taskId, status: taskRecord.status });
    } catch (error) {
      this.logger.error('Error creating task', { taskId, error });
      throw error;
    }
  }

  /**
   * Update task status when Polly SNS notification is received
   */
  async updateTaskPollyCompleted(taskId: string, s3Location: string): Promise<void> {
    try {
      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ taskId }),
        UpdateExpression: 'SET #status = :status, s3Location = :s3Location, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'polly-completed',
          ':s3Location': s3Location,
          ':updatedAt': new Date().toISOString(),
        }),
      });

      await this.client.send(command);
      this.logger.info('Task updated to polly-completed', { taskId, s3Location });
    } catch (error) {
      this.logger.error('Error updating task to polly-completed', { taskId, error });
      throw error;
    }
  }

  /**
   * Update task status when ID3 processing is completed
   */
  async updateTaskCompleted(taskId: string): Promise<void> {
    try {
      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ taskId }),
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'completed',
          ':updatedAt': new Date().toISOString(),
        }),
      });

      await this.client.send(command);
      this.logger.info('Task updated to completed', { taskId });
    } catch (error) {
      this.logger.error('Error updating task to completed', { taskId, error });
      throw error;
    }
  }

  /**
   * Update task status when an error occurs
   */
  async updateTaskFailed(taskId: string, errorMessage: string): Promise<void> {
    try {
      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ taskId }),
        UpdateExpression:
          'SET #status = :status, errorMessage = :errorMessage, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'failed',
          ':errorMessage': errorMessage,
          ':updatedAt': new Date().toISOString(),
        }),
      });

      await this.client.send(command);
      this.logger.error('Task marked as failed', { taskId, errorMessage });
    } catch (error) {
      this.logger.error('Error updating task to failed', { taskId, error });
      throw error;
    }
  }

  /**
   * Get task status for the checkTaskStatus function
   */
  async getTaskStatus(taskId: string): Promise<TaskRecord | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ taskId }),
      });

      const response = await this.client.send(command);

      if (!response.Item) {
        this.logger.warn('Task not found', { taskId });
        return null;
      }

      const taskRecord = unmarshall(response.Item) as TaskRecord;
      this.logger.info('Task status retrieved', { taskId, status: taskRecord.status });
      return taskRecord;
    } catch (error) {
      this.logger.error('Error getting task status', { taskId, error });
      throw error;
    }
  }
}
