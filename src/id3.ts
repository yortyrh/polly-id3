import { SNSHandler, SNSEvent, SNSEventRecord } from 'aws-lambda';
import { ID3Metadata, ID3TagProcessor } from './services/id3TagProcessor';
import { S3Service } from './services/s3Service';
import { Logger } from './services/logger';
import { StartSpeechSynthesisTaskCommand, VoiceId, LanguageCode, Engine, TextType } from "@aws-sdk/client-polly";
import { Factory } from './services/Factory';

// Environment variables
const bucketName = process.env.S3_BUCKET_NAME;
const defaultVoiceId = (process.env.VOICE_ID || VoiceId.Lea) as VoiceId;
const defaultLanguageCode = (process.env.LANGUAGE_CODE || LanguageCode.en_US) as LanguageCode;
const snsTopicArn = process.env.SNS_TOPIC_ARN;
const defaultEngine = (process.env.POLLY_ENGINE || Engine.GENERATIVE) as Engine;
const defaultTextType = (process.env.TEXT_TYPE || TextType.TEXT) as TextType;

const factory = new Factory();

interface PollyTaskCompletedMessage {
  taskId: string;
  taskStatus: string;
  outputFormat: string;
  outputUri: string;
}

/**
 * .ogg or .oga use ogg_vorbis
 * .mp3 use mp3
 * .pcm use pcm
 */
const fileNameToPollyFormat = (fileName: string): 'mp3' | 'ogg_vorbis' | 'pcm' | null => {
  if (fileName.endsWith('.ogg') || fileName.endsWith('.oga')) {
    return 'ogg_vorbis';
  }
  if (fileName.endsWith('.wav') || fileName.endsWith('.aiff')) {
    return 'pcm';
  }
  if (fileName.endsWith('.mp3')) {
    return 'mp3';
  }
  return null; // there is no polly format for this file extension
}

/**
 * This function is used to determine the text type of the text.
 * If the text starts with <speak>, return SSML.
 * If the text does not start with <speak>, return TEXT.
 * If the defaultTextType is provided, return the defaultTextType.
 * @param text - The text to determine the text type of.
 * @param defaultTextType - The default text type to return if the text does not start with <speak>.
 * @returns The text type.
 */
const textToTextType = (text: string, forceTextType?: TextType): TextType => {
  if (forceTextType) {
    return forceTextType;
  }
  if (text.trim().match(/<speak[^>]*>/)) {
    return TextType.SSML;
  }
  return defaultTextType;
}

/**
 * This type is used to define the event object for the handler function.
 * @param text - The text to synthesize.
 * @param key - The key of the file to synthesize.
 * @param languageCode - The language code to use for the synthesis.
 * @param voiceId - The voice ID to use for the synthesis.
 * @param engine - The engine to use for the synthesis.
 * @param textType - The text type to use for the synthesis. If not provided, the function will determine the text type based on the text.
 * @param override - Whether to override the existing file, default is false.
 * @param id3 - The ID3 metadata to use for the synthesis.
 */
type HandlerEvent = {
  text: string;
  key: string;
  languageCode?: LanguageCode;
  voiceId?: VoiceId;
  engine?: Engine;
  textType?: TextType;
  override?: boolean;
  id3?: ID3Metadata;
}

// Example event:
// convert to /* */ format
/*
{
   "text": "Hello, world!",
   "key": "polly/test-1.mp3",
   "languageCode": "en-US",
   "voiceId": "Matthew",
   "engine": "standard",
   "override": false,
   "id3": {
     "title": "Test 1",
     "artist": "Test Artist 1",
     "album": "Test Album 1",
     "year": "2025",
     "comment": "Test Comment 1",
     "genre": "Test Genre 1",
     "track": "1",
     "picture": "https://dummyimage.com/600x400/000/fff.png"
   }
}
*/

type HandlerResponse = {
  statusCode: number;
  body: string;
}

/**
 * This function is used to synthesize speech and upload the result to S3.
 * It also uploads the ID3 metadata to S3.
 * If the override parameter is true, the function will override the existing file.
 * If the override parameter is false, the function will check if the file already exists and return a 200 status code.
 * @param event - The event object containing the text, key, and ID3 metadata.
 * @returns The response object containing the status code, body, and the task ID.
 */
export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const s3Service = factory.getOrCreateS3Service();
  const {
    text,
    key,
    languageCode = defaultLanguageCode,
    voiceId = defaultVoiceId,
    engine = defaultEngine,
    textType,
    override = false,
    id3 = {} as ID3Metadata,
  } = event;

  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify('Missing required parameters: text, voiceId, outputFormat, or bucketName'),
    };
  }

  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify('Missing required parameters: key'),
    };
  }

  const pollyFormat = fileNameToPollyFormat(key);
  if (!pollyFormat) {
    return {
      statusCode: 400,
      body: JSON.stringify('Invalid file extension: ' + key + '. There is no polly format for this file extension.'),
    };
  }

  const pollyClient = factory.getOrCreatePollyClient();

  if (!override) {
    const existing = await s3Service.fileExists(bucketName!, key);
    if (existing) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'File already exists',
          key,
        }),
      };
    };
  }

  try {
    const keyPrefix = key.replace(/\.[^.]+$/g, '');
    const synthesizeSpeechCommand = new StartSpeechSynthesisTaskCommand({
      Text: text,
      VoiceId: voiceId,
      OutputFormat: pollyFormat,
      LanguageCode: languageCode,
      Engine: engine,
      TextType: textToTextType(text, textType),
      SnsTopicArn: snsTopicArn,
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
      await s3Service.uploadFile(bucketName!, taskId3Key, Buffer.from(JSON.stringify(id3)), 'application/json');
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Speech synthesis task started',
        taskId: response.SynthesisTask?.TaskId,
        s3Location: s3Location?.replace(`.${response.SynthesisTask?.TaskId}`, ''),
        taskStatus: response.SynthesisTask?.TaskStatus
      }),
    };
  } catch (error) {
    console.error("Error synthesizing speech or uploading to S3:", error);
    throw error;
  }
};

/**
 * This function is used to update the ID3 metadata in the S3 bucket folder.
 * It iterates over the files in the folder and updates the ID3 metadata.
 * Found files should be MP3 and JSON.
 * @param event - The event object containing the S3 bucket name and folder key.
 * @returns The response object containing the status code, body, and the task ID.
 */
export const updateId3Metadata = async (event: { s3Bucket: string, folderKey: string }) => {
  const { s3Bucket, folderKey } = event;

  const s3Service = factory.getOrCreateS3Service();
  const logger = factory.createLogger();
  const id3Processor = factory.getOrCreateId3TagProcessor();

  const files = await s3Service.listMp3Files(s3Bucket, folderKey);
  logger.info('Found files', { files });
  for (const file of files) {
    const jsonFile = file.replace('.mp3', '.json');
    const jsonFileExists = await s3Service.fileExists(s3Bucket, jsonFile);
    if (!jsonFileExists) {
      logger.warn('JSON file does not exist', { file });
      continue;
    }
    const [mp3Buffer, jsonData] = await Promise.all([
      s3Service.downloadFile(s3Bucket, file),
      s3Service.downloadFile(s3Bucket, jsonFile)
    ]);
    const metadata = JSON.parse(jsonData.toString());
    const taggedMp3Buffer = await id3Processor.applyTags(mp3Buffer, metadata);
    await s3Service.uploadFile(s3Bucket, file, taggedMp3Buffer, 'audio/mpeg');
  }
};

/**
 * This function is used to process the SNS event when the Polly task is completed.
 * It downloads the MP3 and JSON files, applies the ID3 metadata, and uploads the result back to S3.
 * It renames the two files to remove the taskId from the filename.
 * @param event - The event object containing the SNS event.
 * @returns The response object containing the status code, body, and the task ID.
 */
export const pollyTaskCompleted: SNSHandler = async (event: SNSEvent): Promise<void> => {
  // Initialize services inside the handler to allow proper mocking
  const s3Service = factory.getOrCreateS3Service();
  const logger = factory.createLogger();
  const id3Processor = factory.getOrCreateId3TagProcessor();

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

    // Rename the MP3 and JSON files to remove the .<taskId> from the filename
    await Promise.all([
      s3Service.renameFile(s3Bucket, mp3Key, mp3Key.replace(`.${pollyTaskId}`, '')),
      s3Service.renameFile(s3Bucket, jsonKey, jsonKey.replace(`.${pollyTaskId}`, ''))
    ]);

  } catch (error) {
    logger.error('Error processing SNS event record', { 
      recordId: record.Sns.MessageId, 
      error 
    });
    throw error;
  }
}
