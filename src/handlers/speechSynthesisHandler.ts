import { ID3Metadata } from '../services/id3TagProcessor';
import {
  StartSpeechSynthesisTaskCommand,
  VoiceId,
  LanguageCode,
  Engine,
  TextType,
} from '@aws-sdk/client-polly';
import { getFactory } from '../services/factory';
import {
  fileNameToPollyFormat,
  textToTextType,
  getDefaultVoiceId,
  getDefaultLanguageCode,
  getDefaultEngine,
  getBucketName,
  getSnsTopicArn,
} from '../utils';

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
};

type HandlerResponse = {
  statusCode: number;
  message: string;
  taskId?: string;
  s3Location?: string;
  taskStatus?: string;
  error?: string;
};

/**
 * This function is used to synthesize speech and upload the result to S3.
 * It also uploads the ID3 metadata to S3.
 * If the override parameter is true, the function will override the existing file.
 * If the override parameter is false, the function will check if the file already exists and return a 200 status code.
 * @param event - The event object containing the text, key, and ID3 metadata.
 * @returns The response object containing the status code, body, and the task ID.
 */
export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const factory = getFactory();
  const s3Service = factory.getOrCreateS3Service();
  const dynamoDBService = factory.getOrCreateDynamoDBService();
  const logger = factory.createLogger('speechSynthesisHandler');
  const {
    text,
    key,
    languageCode = getDefaultLanguageCode(),
    voiceId = getDefaultVoiceId(),
    engine = getDefaultEngine(),
    textType,
    override = false,
    id3 = {} as ID3Metadata,
  } = event;

  if (!text) {
    return {
      statusCode: 400,
      message: 'Missing required parameters: text, voiceId, outputFormat, or bucketName',
    };
  }

  if (!key) {
    return {
      statusCode: 400,
      message: 'Missing required parameters: key',
    };
  }

  const pollyFormat = fileNameToPollyFormat(key);
  if (!pollyFormat) {
    return {
      statusCode: 400,
      message: `Invalid file extension: ${key}. There is no polly format for this file extension.`,
    };
  }

  const pollyClient = factory.getOrCreatePollyClient();

  if (!override) {
    const bucketName = getBucketName();
    const existing = await s3Service.fileExists(bucketName!, key);
    if (existing) {
      return {
        statusCode: 200,
        message: `File already exists: ${key}`,
        s3Location: `s3://${bucketName}/${key}`,
      };
    }
  }

  try {
    const keyPrefix = key.replace(/\.[^.]+$/g, '');
    const bucketName = getBucketName();
    const snsTopicArn = getSnsTopicArn();
    const synthesizeSpeechCommand = new StartSpeechSynthesisTaskCommand({
      Text: text,
      VoiceId: voiceId,
      OutputFormat: pollyFormat,
      LanguageCode: languageCode,
      Engine: engine,
      TextType: textToTextType(text, textType),
      SnsTopicArn: snsTopicArn,
      OutputS3BucketName: bucketName,
      OutputS3KeyPrefix: keyPrefix,
    });

    const response = await pollyClient.send(synthesizeSpeechCommand);
    const taskId = response.SynthesisTask?.TaskId;
    const taskKeyPrefix = keyPrefix + '.' + taskId;
    const taskId3Key = taskKeyPrefix + '.json';

    // Create task record in DynamoDB
    await dynamoDBService.createTask(taskId!, event);

    logger.info('Error synthesizing speech or uploading to S3:', {
      taskId3Key,
      taskKeyPrefix,
    });
    // upload JSON file to S3 with the object inside id3 if it exists
    if (id3) {
      await s3Service.uploadFile(
        bucketName!,
        taskId3Key,
        Buffer.from(JSON.stringify(id3)),
        'application/json'
      );
    }
    return {
      statusCode: 200,
      message: 'Speech synthesis task started',
      taskId: taskId!,
      s3Location: `s3://${bucketName}/${key}`,
      taskStatus: response.SynthesisTask?.TaskStatus,
    };
  } catch (error) {
    logger.error('Error synthesizing speech or uploading to S3:', { error });
    throw error;
  }
};
