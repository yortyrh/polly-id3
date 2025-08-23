import { SNSHandler, SNSEvent, SNSEventRecord } from 'aws-lambda';
import { ID3TagProcessor } from '../services/id3TagProcessor';
import { S3Service } from '../services/s3Service';
import { Logger } from '../services/logger';
import { DynamoDBService } from '../services/DynamoDBService';
import { getFactory } from '../services/factory';
import { fileNameToMimeType } from '../utils';

interface PollyTaskCompletedMessage {
  taskId: string;
  taskStatus: string;
  outputFormat: string;
  outputUri: string;
}

/**
 * This function is used to process the SNS event when the Polly task is completed.
 * It downloads the MP3 and JSON files, applies the ID3 metadata, and uploads the result back to S3.
 * It renames the two files to remove the taskId from the filename.
 * @param event - The event object containing the SNS event.
 * @returns The response object containing the status code, body, and the task ID.
 */
export const pollyTaskCompleted: SNSHandler = async (event: SNSEvent): Promise<void> => {
  const factory = getFactory();
  const s3Service = factory.getOrCreateS3Service();
  const dynamoDBService = factory.getOrCreateDynamoDBService();
  const logger = factory.createLogger('pollyTaskCompletedHandler');
  const id3Processor = factory.getOrCreateId3TagProcessor();

  try {
    logger.info('Processing SNS event', { recordCount: event.Records.length });

    for (const record of event.Records) {
      await processSNSEvent(record, s3Service, dynamoDBService, id3Processor, logger);
    }

    logger.info('Successfully processed all SNS events');
  } catch (error) {
    logger.error('Error processing SNS event', { error });
    throw error;
  }
};

/**
 * This function is used to process the SNS event when the Polly task is completed.
 * It downloads the MP3 and JSON files, applies the ID3 metadata, and uploads the result back to S3.
 * It renames the two files to remove the taskId from the filename.
 * @param record - The SNS event record.
 * @param s3Service - The S3 service.
 * @param id3Processor - The ID3 processor.
 * @param logger - The logger.
 * @returns The response object containing the status code, body, and the task ID.
 */
async function processSNSEvent(
  record: SNSEventRecord, 
  s3Service: S3Service, 
  dynamoDBService: DynamoDBService,
  id3Processor: ID3TagProcessor, 
  logger: Logger
): Promise<void> {
  let pollyTaskId: string = '';
  
  try {
    const message = JSON.parse(record.Sns.Message) as PollyTaskCompletedMessage;
    logger.info('Processing SNS message', { messageId: record.Sns.MessageId });

    // Extract Polly job details from the message
    pollyTaskId = message.taskId;
    const pollyTaskStatus = message.taskStatus;
    const outputFormat = String(message.outputFormat).toLowerCase();

    logger.info('Polly task details', { pollyTaskId, pollyTaskStatus, outputFormat });
    logger.info('Message', JSON.stringify(message, null, 2));
    
    if (pollyTaskStatus !== 'COMPLETED') {
      logger.warn('Skipping non-COMPLETED task status', { pollyTaskStatus, pollyTaskId });
      return;
    }

    // Update DynamoDB task status to polly-completed
    await dynamoDBService.updateTaskPollyCompleted(pollyTaskId, message.outputUri);

    // Check if outputUri is present
    if (!message.outputUri) {
      logger.warn('Output URI is missing in the SNS message', { pollyTaskId });
      return;
    }

    // Construct S3 keys based on output Uri,
    const audioKey = message.outputUri.split('/').slice(3).join('/');
    const jsonKey = audioKey.replace(/\.[^.]+$/g, '.json'); // any extension
    const s3Bucket = message.outputUri.split('/')[2];
    const audioMimeType = fileNameToMimeType(audioKey);

    const beforeReturn = async () => {
      await Promise.all([
        s3Service.renameFile(s3Bucket, audioKey, audioKey.replace(`.${pollyTaskId}`, '')),
        s3Service.renameFile(s3Bucket, jsonKey, jsonKey.replace(`.${pollyTaskId}`, ''))
      ]);

      // Update DynamoDB task status to completed
      await dynamoDBService.updateTaskCompleted(pollyTaskId);
    }

    if (!audioMimeType) {
      logger.warn('Invalid audio file extension for ID3 metadata', { audioKey, audioMimeType });
      await beforeReturn();
      return;
    }

    if (audioMimeType !== 'audio/mpeg') {
      logger.warn('Skipping non-MP3 output format for ID3 metadata', { audioMimeType, audioKey, pollyTaskId });
      await beforeReturn();
      return;
    }

    logger.info('Processing Polly task', { pollyTaskId, audioKey, jsonKey, s3Bucket });

    // Check if the JSON file exists
    const jsonExists = await s3Service.fileExists(s3Bucket, jsonKey);
    if (!jsonExists) {
      logger.warn('JSON file does not exist', { jsonKey, s3Bucket });
      await beforeReturn();
      return;
    }

    // Download Audio file and JSON metadata
    const [audioBuffer, jsonData] = await Promise.all([
      s3Service.downloadFile(s3Bucket, audioKey),
      s3Service.downloadFile(s3Bucket, jsonKey)
    ]);

    // Parse JSON metadata
    const metadata = JSON.parse(jsonData.toString());
    logger.info('Retrieved metadata', { metadata });

    // Apply ID3 tags
    const taggedAudioBuffer = await id3Processor.applyTags(audioBuffer, metadata);

    // Upload tagged audio back to S3, same file.
    await s3Service.uploadFile(
      s3Bucket,
      audioKey,
      taggedAudioBuffer,
      audioMimeType
    );

    logger.info('Successfully applied ID3 tags', { 
      pollyTaskId, 
      originalKey: audioKey, 
      taggedKey: audioKey
    });

    // Rename the audio and JSON files to remove the .<taskId> from the filename
    await beforeReturn();
  } catch (error) {
    logger.error('Error processing SNS event record', { 
      recordId: record.Sns.MessageId, 
      error 
    });
    
    // Update DynamoDB task status to failed if we have a taskId
    if (pollyTaskId) {
      await dynamoDBService.updateTaskFailed(pollyTaskId, error instanceof Error ? error.message : 'Unknown error');
    }
    
    throw error;
  }
}
