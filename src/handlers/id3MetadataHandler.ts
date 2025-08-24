import { getFactory } from '../services/factory';

/**
 * This function is used to update the ID3 metadata in the S3 bucket folder.
 * It iterates over the files in the folder and updates the ID3 metadata.
 * Found files should be audio (MP3) and JSON.
 * @param event - The event object containing the S3 bucket name and folder key.
 * @returns The response object containing the status code, body, and the task ID.
 */
export const updateId3Metadata = async (event: { s3Bucket: string; folderKey: string }) => {
  const factory = getFactory();
  const { s3Bucket, folderKey } = event;

  const s3Service = factory.getOrCreateS3Service();
  const logger = factory.createLogger('id3MetadataHandler');
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
    const [audioBuffer, jsonData] = await Promise.all([
      s3Service.downloadFile(s3Bucket, file),
      s3Service.downloadFile(s3Bucket, jsonFile),
    ]);
    const metadata = JSON.parse(jsonData.toString());
    const taggedAudioBuffer = await id3Processor.applyTags(audioBuffer, metadata);
    await s3Service.uploadFile(s3Bucket, file, taggedAudioBuffer, 'audio/mpeg');
  }
};
