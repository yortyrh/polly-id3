import { SNSHandler, SNSEvent, SNSEventRecord, S3Event } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { ID3TagProcessor } from './services/id3TagProcessor';
import { S3Service } from './services/s3Service';
import { Logger } from './services/logger';
import { PollyClient, StartSpeechSynthesisTaskCommand } from "@aws-sdk/client-polly";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { ConfiguredRetryStrategy } from "@smithy/util-retry";

interface PollyTaskCompletedMessage {
  taskId: string;
  taskStatus: string;
  outputFormat: string;
  outputUri: string;
}

const bucketName = 'yorty-s3-french';
const outputFormat = 'mp3';
const voiceId = 'Lea';
const languageCode = 'fr-FR';

/**
 * This function is used to synthesize speech and upload the result to S3.
 * It also uploads the ID3 metadata to S3.
 * @param event - The event object containing the text, key, and ID3 metadata.
 * @returns The response object containing the status code, body, and the task ID.
 */
export const handler = async (event: { text: string, key: string, id3: unknown }) => {
  const { text, key, id3 } = event;

  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify('Missing required parameters: text, voiceId, outputFormat, or bucketName'),
    };
  }

  const pollyClient = new PollyClient({
    retryStrategy: new ConfiguredRetryStrategy(
      3, // max attempts.
      (attempt: number) => attempt * 1000 * (2 ** attempt) // backoff function.
    ),
  });
  const s3Client = new S3Client({
    retryStrategy: new ConfiguredRetryStrategy(
      3, // max attempts.
      (attempt: number) => attempt * 1000 * (2 ** attempt) // backoff function.
    ),
  });

  try {
    const keyPrefix = key.replace(/\.[^.]+$/g, '');
    const synthesizeSpeechCommand = new StartSpeechSynthesisTaskCommand({
      Text: text,
      VoiceId: voiceId,
      OutputFormat: outputFormat,
      LanguageCode: languageCode,
      Engine: 'generative',
      TextType: 'ssml',
      SnsTopicArn: 'arn:aws:sns:us-east-1:545616318384:french-polly-2',
      OutputS3BucketName: bucketName,
      OutputS3KeyPrefix: keyPrefix
    });

    const response = await pollyClient.send(synthesizeSpeechCommand);
    const s3Location = response.SynthesisTask?.OutputUri;
    const taskKeyPrefix = keyPrefix + '.' + response.SynthesisTask?.TaskId;
    const taskId3Key = taskKeyPrefix + '.json';

    console.log("Error synthesizing speech or uploading to S3:", taskId3Key, taskKeyPrefix);
    // upload JSON file to S3 with the object inside id3 if it exists
    if (id3) {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: taskId3Key,
          Body: JSON.stringify(id3),
          ContentType: 'application/json',
        },
      });
      await upload.done();
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Speech synthesis task started',
        taskId: response.SynthesisTask?.TaskId,
        s3Location,
        taskStatus: response.SynthesisTask?.TaskStatus
      }),
    };
  } catch (error) {
    console.error("Error synthesizing speech or uploading to S3:", error);
    throw error;
  }
};

// add function to update the id3 metadata in the s3 bucket folder
// the function should take the s3 bucket name, the folder key
// it should iterate over the files in the folder and update the id3 metadata
// found files should be mp3 and json
export const updateId3Metadata = async (event: { s3Bucket: string, folderKey: string }) => {
  const { s3Bucket, folderKey } = event;

  const s3 = new S3();
  const logger = new Logger();
  const s3Service = new S3Service(s3);
  const id3Processor = new ID3TagProcessor();

  const files = await s3Service.listMp3Files(s3Bucket, folderKey);
  logger.info('Found files', { files });
  for (const file of files) {
    if (!s3Service.fileExists(s3Bucket, file.replace('.mp3', '.json'))) {
      logger.warn('JSON file does not exist', { file });
      continue;
    }
    const [mp3Buffer, jsonData] = await Promise.all([
      s3Service.downloadFile(s3Bucket, file),
      s3Service.downloadFile(s3Bucket, file.replace('.mp3', '.json'))
    ]);
    const metadata = JSON.parse(jsonData.toString());
    const taggedMp3Buffer = await id3Processor.applyTags(mp3Buffer, metadata);
    await s3Service.uploadFile(s3Bucket, file, taggedMp3Buffer, 'audio/mpeg');
  }
};

export const pollyTaskCompleted: SNSHandler = async (event: SNSEvent): Promise<void> => {
  // Initialize services inside the handler to allow proper mocking
  const s3 = new S3();
  const logger = new Logger();
  const s3Service = new S3Service(s3);
  const id3Processor = new ID3TagProcessor();

  try {
    logger.info('Processing SNS event', { recordCount: event.Records.length });

    for (const record of event.Records) {
      await processSNSEvent(record, s3Service, id3Processor, logger);
    }

    logger.info('Successfully processed all SNS events');
  } catch (error) {
    logger.error('Error processing SNS event', { error });
    throw error;
  }
};

async function processSNSEvent(
  record: SNSEventRecord, 
  s3Service: S3Service, 
  id3Processor: ID3TagProcessor, 
  logger: Logger
): Promise<void> {
  try {
    const message = JSON.parse(record.Sns.Message) as PollyTaskCompletedMessage;
    logger.info('Processing SNS message', { messageId: record.Sns.MessageId });

    // Extract Polly job details from the message
    const pollyTaskId = message.taskId;
    const pollyTaskStatus = message.taskStatus;
    const outputFormat = String(message.outputFormat).toLowerCase();

    logger.info('Polly task details', { pollyTaskId, pollyTaskStatus, outputFormat });
    logger.info('Message', JSON.stringify(message, null, 2));
    
    if (outputFormat !== 'mp3') {
      logger.warn('Skipping non-MP3 output format', { outputFormat, pollyTaskId });
      return;
    }

    if (pollyTaskStatus !== 'COMPLETED') {
        logger.warn('Skipping non-COMPLETED task status', { pollyTaskStatus, pollyTaskId });
        return;
      }

    // Check if outputUri is present
    if (!message.outputUri) {
      logger.warn('Output URI is missing in the SNS message', { pollyTaskId });
      return;
    }

    // Construct S3 keys based on output Uri,
    const mp3Key = message.outputUri.split('/').slice(3).join('/');
    const jsonKey = mp3Key.replace('.mp3', '.json');
    const s3Bucket = message.outputUri.split('/')[2];

    logger.info('Processing Polly task', { pollyTaskId, mp3Key, jsonKey, s3Bucket });

    // Check if the JSON file exists
    const jsonExists = await s3Service.fileExists(s3Bucket, jsonKey);
    if (!jsonExists) {
      logger.warn('JSON file does not exist', { jsonKey, s3Bucket });
      return;
    }

    // Download MP3 file and JSON metadata
    const [mp3Buffer, jsonData] = await Promise.all([
      s3Service.downloadFile(s3Bucket, mp3Key),
      s3Service.downloadFile(s3Bucket, jsonKey)
    ]);

    // Parse JSON metadata
    const metadata = JSON.parse(jsonData.toString());
    logger.info('Retrieved metadata', { metadata });

    // Apply ID3 tags
    const taggedMp3Buffer = await id3Processor.applyTags(mp3Buffer, metadata);

    // Upload tagged MP3 back to S3, same file.
    await s3Service.uploadFile(
      s3Bucket,
      mp3Key,
      taggedMp3Buffer,
      'audio/mpeg'
    );

    logger.info('Successfully applied ID3 tags', { 
      pollyTaskId, 
      originalKey: mp3Key, 
      taggedKey: mp3Key
    });

  } catch (error) {
    logger.error('Error processing SNS event record', { 
      recordId: record.Sns.MessageId, 
      error 
    });
    throw error;
  }
}
