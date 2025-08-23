import { S3 } from 'aws-sdk';
import { Logger } from './logger';

/**
 * @class S3Service
 * @description Handles S3 operations
 */
export class S3Service {
  /**
   * @constructor
   * @param s3 - The S3 client
   */
  constructor(private readonly logger: Logger, private readonly s3: S3) {}

  /**
   * Downloads a file from S3
   * @param bucketName - The S3 bucket name
   * @param key - The S3 object key
   * @returns Promise<Buffer> - The file content as a buffer
   */
  async downloadFile(bucketName: string, key: string): Promise<Buffer> {
    try {
      this.logger.info('Downloading file from S3', { bucketName, key });

      const params: S3.GetObjectRequest = {
        Bucket: bucketName,
        Key: key
      };

      const response = await this.s3.getObject(params).promise();
      
      if (!response.Body) {
        throw new Error(`No body found in S3 response for key: ${key}`);
      }

      // Convert to Buffer
      const buffer = Buffer.from(response.Body as any);
      
      this.logger.info('Successfully downloaded file from S3', { 
        bucketName, 
        key, 
        size: buffer.length 
      });

      return buffer;

    } catch (error) {
      this.logger.error('Error downloading file from S3', { 
        bucketName, 
        key, 
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        errorCause: error.cause,
        errorDetails: error.details,
      });
      throw error;
    }
  }

  /**
   * Lists all MP3 files in a given S3 bucket and key
   * @param bucketName - The S3 bucket name
   * @param key - The S3 object key
   * @returns Promise<string[]> - Array of MP3 file keys
   */
  async listMp3Files(bucketName: string, key: string): Promise<string[]> {
    const files = await this.listObjects(bucketName, key);
    return files.filter(file => file.endsWith('.mp3'));
  }

  /**
   * Uploads a file to S3
   * @param bucketName - The S3 bucket name
   * @param key - The S3 object key
   * @param body - The file content as a buffer
   * @param contentType - The MIME type of the file
   * @returns Promise<void>
   */
  async uploadFile(
    bucketName: string, 
    key: string, 
    body: Buffer, 
    contentType: string
  ): Promise<void> {
    try {
      this.logger.info('Uploading file to S3', { 
        bucketName, 
        key, 
        size: body.length,
        contentType 
      });

      const params: S3.PutObjectRequest = {
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: {
          'processed-by': 'apply-id3-lambda',
          'processed-at': new Date().toISOString()
        }
      };

      await this.s3.putObject(params).promise();

      this.logger.info('Successfully uploaded file to S3', { 
        bucketName, 
        key, 
        size: body.length 
      });

    } catch (error) {
      this.logger.error('Error uploading file to S3', { 
        bucketName, 
        key, 
        error 
      });
      throw error;
    }
  }

  /**
   * Checks if a file exists in S3
   * @param bucketName - The S3 bucket name
   * @param key - The S3 object key
   * @returns Promise<boolean> - True if the file exists
   */
  async fileExists(bucketName: string, key: string): Promise<boolean> {
    try {
      const params: S3.HeadObjectRequest = {
        Bucket: bucketName,
        Key: key
      };

      await this.s3.headObject(params).promise();
      return true;

    } catch (error) {
      if ((error as any).code === 'NotFound' || (error as any).statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Lists objects in S3 with a specific prefix
   * @param bucketName - The S3 bucket name
   * @param prefix - The prefix to filter by
   * @returns Promise<string[]> - Array of object keys
   */
  async listObjects(bucketName: string, prefix: string): Promise<string[]> {
    try {
      const params: S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: prefix
      };

      const response = await this.s3.listObjectsV2(params).promise();
      
      if (!response.Contents) {
        return [];
      }

      return response.Contents.map(obj => obj.Key!).filter(Boolean);

    } catch (error) {
      this.logger.error('Error listing objects in S3', { 
        bucketName, 
        prefix, 
        error 
      });
      throw error;
    }
  }

  /**
   * Renames a file in S3
   * @param bucketName - The S3 bucket name
   * @param key - The S3 object key
   * @param newKey - The new S3 object key
   * @returns Promise<void>
   */
  async renameFile(bucketName: string, key: string, newKey: string): Promise<void> {
    try {
      const params: S3.CopyObjectRequest = {
        Bucket: bucketName,
        CopySource: `${bucketName}/${key}`,
        Key: newKey
      };

      await this.s3.copyObject(params).promise();

      await this.s3.deleteObject({ Bucket: bucketName, Key: key }).promise();

    } catch (error) {
      this.logger.error('Error renaming file in S3', { 
        bucketName, 
        key, 
        newKey, 
        error 
      });
      throw error;
    }
  }
}
