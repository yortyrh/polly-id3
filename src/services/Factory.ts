import { PollyClient } from "@aws-sdk/client-polly";
import { S3Client } from "@aws-sdk/client-s3";
import { S3 } from "aws-sdk";
import { S3Service } from "./s3Service";
import { Logger } from "./logger";
import { ID3TagProcessor } from "./id3TagProcessor";
import { DynamoDBService } from "./DynamoDBService";
import { ConfiguredRetryStrategy } from "@smithy/util-retry";

/**
 * Creates an exponential backoff retry strategy for the Polly client.
 * @param maxRetryAttempts - The maximum number of retry attempts.
 * @returns The retry strategy.
 */
const createExponentialBackoff = (maxRetryAttempts: number) => {
  return new ConfiguredRetryStrategy(
    maxRetryAttempts, // max attempts.
    (attempt: number) => attempt * 1000 * (2 ** attempt) // backoff function.
  );
};

/**
 * @class Factory
 * @description Creates and manages instances of services
 */
export class Factory {
  private services: Record<string, any> = {};

  /**
   * Gets an instance of a service
   * @param service - The name of the service
   * @param creator - The function to create the service
   * @returns The instance of the service
   */
  get<T>(service: keyof typeof this.services, creator: () => T): T {
    if (!this.services[service]) {
      this.services[service] = creator();
    }
    return this.services[service] as T;
  }

  /**
   * Gets the maximum number of retry attempts
   * @returns The maximum number of retry attempts
   */
  getOrCreateMaxRetryAttempts(): number {
    return this.get("maxRetryAttempts", () => parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10));
  }

  /**
   * Gets an instance of an S3 client
   * @returns The instance of the S3 client
   */
  getOrCreateS3(): S3 {
    return this.get("s3", () => new S3({
        maxRetries: this.getOrCreateMaxRetryAttempts(),
        retryDelayOptions: {
            base: 1000
        },
    }));
  }

  /**
   * Gets an instance of an S3 service
   * @returns The instance of the S3 service
   */
  getOrCreateS3Service(): S3Service {
    return this.get("s3Service", () => new S3Service(this.getOrCreateS3()));
  }

  /**
   * Gets an instance of a Polly client
   * @returns The instance of the Polly client
   */
  getOrCreatePollyClient(): PollyClient {
    return this.get("pollyClient", () => new PollyClient({
        retryStrategy: createExponentialBackoff(this.getOrCreateMaxRetryAttempts()),
    }));
  }
  
  /**
   * Gets an instance of an S3 client
   * @returns The instance of the S3 client
   */
  getOrCreateS3Client(): S3Client {
    return this.get("s3Client", () => new S3Client({
        retryStrategy: createExponentialBackoff(this.getOrCreateMaxRetryAttempts()),
    }));
  }
  
  /**
   * Gets an instance of a logger
   * @returns The instance of the logger
   */
  createLogger(): Logger {
    return new Logger();
  }

  /**
   * Gets an instance of an ID3 tag processor
   * @returns The instance of the ID3 tag processor
   */
  getOrCreateId3TagProcessor(): ID3TagProcessor {
    return this.get("id3TagProcessor", () => new ID3TagProcessor());
  }

  /**
   * Gets an instance of a DynamoDB service
   * @returns The instance of the DynamoDB service
   */
  getOrCreateDynamoDBService(): DynamoDBService {
    return this.get("dynamoDBService", () => new DynamoDBService());
  }
}
