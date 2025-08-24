import { VoiceId, LanguageCode, Engine, TextType } from '@aws-sdk/client-polly';

// Default values
const DEFAULT_VOICE_ID = 'Matthew';
const DEFAULT_LANGUAGE_CODE = 'en-US';
const DEFAULT_ENGINE = 'neural';
const DEFAULT_TEXT_TYPE = 'TEXT';

/**
 * This function is used to determine the polly format of the file.
 * .ogg or .oga use ogg_vorbis
 * .mp3 use mp3
 * .pcm or .wav or .aiff use pcm
 * @param fileName - The file name to determine the format of.
 * @returns The polly format or null if not supported.
 */
export const fileNameToPollyFormat = (fileName: string): 'mp3' | 'ogg_vorbis' | 'pcm' | null => {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith('.ogg') || lowerFileName.endsWith('.oga')) {
    return 'ogg_vorbis';
  }
  if (
    lowerFileName.endsWith('.wav') ||
    lowerFileName.endsWith('.aiff') ||
    lowerFileName.endsWith('.pcm')
  ) {
    return 'pcm';
  }
  if (lowerFileName.endsWith('.mp3')) {
    return 'mp3';
  }
  return null; // there is no polly format for this file extension
};

/**
 * This function is used to determine the mime type of the file.
 * .ogg or .oga use audio/ogg
 * .mp3 use audio/mpeg
 * .pcm or .wav or .aiff use audio/pcm
 * @param fileName - The file name to determine the mime type of.
 * @returns The mime type or null if not supported.
 */
export const fileNameToMimeType = (
  fileName: string
): 'audio/mpeg' | 'audio/ogg' | 'audio/pcm' | null => {
  if (fileName.endsWith('.ogg') || fileName.endsWith('.oga')) {
    return 'audio/ogg';
  }
  if (fileName.endsWith('.wav') || fileName.endsWith('.aiff') || fileName.endsWith('.pcm')) {
    return 'audio/pcm';
  }
  if (fileName.endsWith('.mp3')) {
    return 'audio/mpeg';
  }
  return null; // there is no polly format for this file extension
};

/**
 * This function is used to determine the text type of the text.
 * If the text starts with <speak>, return SSML.
 * If the text does not start with <speak>, return TEXT.
 * If the forceTextType is provided, return the forceTextType.
 * @param text - The text to determine the text type of.
 * @param forceTextType - The text type to force if provided.
 * @returns The text type.
 */
export const textToTextType = (text: string, forceTextType?: TextType): TextType => {
  if (forceTextType) {
    return forceTextType;
  }
  // More strict SSML detection - must start with <speak> and have proper structure
  const trimmedText = text
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .replace(/<\?xml.*\?>/, '')
    .trim();
  if (trimmedText.startsWith('<speak') && trimmedText.includes('</speak>')) {
    return 'ssml' as TextType;
  }
  return String(process.env.TEXT_TYPE || DEFAULT_TEXT_TYPE || 'text').toLowerCase() as TextType;
};

/**
 * Get the default voice ID from environment variables.
 * @returns The default voice ID.
 */
export const getDefaultVoiceId = (): VoiceId => {
  return (process.env.VOICE_ID !== undefined ? process.env.VOICE_ID : DEFAULT_VOICE_ID) as VoiceId;
};

/**
 * Get the default language code from environment variables.
 * @returns The default language code.
 */
export const getDefaultLanguageCode = (): LanguageCode => {
  return (
    process.env.LANGUAGE_CODE !== undefined ? process.env.LANGUAGE_CODE : DEFAULT_LANGUAGE_CODE
  ) as LanguageCode;
};

/**
 * Get the default engine from environment variables.
 * @returns The default engine.
 */
export const getDefaultEngine = (): Engine => {
  return (
    process.env.POLLY_ENGINE !== undefined ? process.env.POLLY_ENGINE : DEFAULT_ENGINE
  ) as Engine;
};

/**
 * Get the default text type from environment variables.
 * @returns The default text type.
 */
export const getDefaultTextType = (): TextType => {
  return String(process.env.TEXT_TYPE || DEFAULT_TEXT_TYPE).toLowerCase() as TextType;
};

/**
 * Get the S3 bucket name from environment variables.
 * @returns The S3 bucket name.
 */
export const getBucketName = (): string | undefined => {
  return process.env.S3_BUCKET_NAME;
};

/**
 * Get the SNS topic ARN from environment variables.
 * @returns The SNS topic ARN.
 */
export const getSnsTopicArn = (): string | undefined => {
  return process.env.SNS_TOPIC_ARN;
};

/**
 * Converts an image URL to a Buffer
 * @param imageUrl - The URL of the image
 * @returns The MIME type and image buffer
 */
export const imageUrlToBuffer = async (
  imageUrl: string
): Promise<{ mime: string; imageBuffer: Buffer }> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const mime = response.headers.get('content-type')!;
  // check if it is an image
  if (!mime.startsWith('image/')) {
    throw new Error(`Invalid image URL: ${imageUrl} - ${mime}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return { mime, imageBuffer: Buffer.from(arrayBuffer) };
};
