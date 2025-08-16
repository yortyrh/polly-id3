import { PollyClient } from "@aws-sdk/client-polly";
import { S3Client } from "@aws-sdk/client-s3";
import { S3 } from "aws-sdk";
import { S3Service } from "./s3Service";
import { Logger } from "./logger";
import { ID3TagProcessor } from "./id3TagProcessor";
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

export class Factory {
  private services: Record<string, any> = {};

  get<T>(service: keyof typeof this.services, creator: () => T): T {
    if (!this.services[service]) {
      this.services[service] = creator();
    }
    return this.services[service] as T;
  }

  getOrCreateMaxRetryAttempts(): number {
    return this.get("maxRetryAttempts", () => parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10));
  }

  getOrCreateS3(): S3 {
    return this.get("s3", () => new S3({
        maxRetries: this.getOrCreateMaxRetryAttempts(),
        retryDelayOptions: {
            base: 1000
        },
    }));
  }

  getOrCreateS3Service(): S3Service {
    return this.get("s3Service", () => new S3Service(this.getOrCreateS3()));
  }

  getOrCreatePollyClient(): PollyClient {
    return this.get("pollyClient", () => new PollyClient({
        retryStrategy: createExponentialBackoff(this.getOrCreateMaxRetryAttempts()),
    }));
  }
  
  getOrCreateS3Client(): S3Client {
    return this.get("s3Client", () => new S3Client({
        retryStrategy: createExponentialBackoff(this.getOrCreateMaxRetryAttempts()),
    }));
  }
  
  createLogger(): Logger {
    return new Logger();
  }

  getOrCreateId3TagProcessor(): ID3TagProcessor {
    return this.get("id3TagProcessor", () => new ID3TagProcessor());
  }
}
