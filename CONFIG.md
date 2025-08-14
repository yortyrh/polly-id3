# Configuration

This document describes all the environment variables used in the Polly ID3 Tag Manager application.

## Environment Variables

### AWS Polly Configuration

| Variable | Default Value | Description | Type |
|----------|---------------|-------------|------|
| `VOICE_ID` | `Lea` | AWS Polly voice ID to use for speech synthesis | `VoiceId` |
| `LANGUAGE_CODE` | `fr-FR` | Language code for speech synthesis | `LanguageCode` |
| `OUTPUT_FORMAT` | `mp3` | Output format for synthesized speech | `'mp3' \| 'ogg_vorbis' \| 'pcm'` |
| `POLLY_ENGINE` | `generative` | Polly engine type | `'standard' \| 'neural' \| 'generative'` |
| `TEXT_TYPE` | `ssml` | Type of text input | `'ssml' \| 'text'` |

### AWS Services Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `S3_BUCKET_NAME` | `yorty-s3-french` | S3 bucket name for storing audio files |
| `SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:545616318384:pollyid3PollyTaskCompleted` | SNS topic ARN for task completion notifications (created automatically) |

### Retry Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `MAX_RETRY_ATTEMPTS` | `3` | Maximum number of retry attempts for AWS API calls |

## Configuration in serverless.yml

All environment variables are defined in the `serverless.yml` file under the `provider.environment` section:

```yaml
provider:
  environment:
    S3_BUCKET_NAME: yorty-s3-french
    OUTPUT_FORMAT: mp3
    VOICE_ID: Lea
    LANGUAGE_CODE: fr-FR
    SNS_TOPIC_ARN: 
      Fn::GetAtt: [PollyTaskCompletedTopic, TopicArn]
    POLLY_ENGINE: generative
    TEXT_TYPE: ssml
    MAX_RETRY_ATTEMPTS: 3
```

## Usage in Code

Environment variables are accessed in the code using `process.env`:

```typescript
const bucketName = process.env.S3_BUCKET_NAME || 'yorty-s3-french';
const voiceId = (process.env.VOICE_ID || 'Lea') as VoiceId;
const maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
```

## Customization

To customize the application for different environments or use cases:

1. **Change Voice**: Update `VOICE_ID` to use a different Polly voice
2. **Change Language**: Update `LANGUAGE_CODE` for different languages
3. **Change Output Format**: Update `OUTPUT_FORMAT` for different audio formats
4. **Change S3 Bucket**: Update `S3_BUCKET_NAME` for different storage locations
5. **Change SNS Topic**: Update `SNS_TOPIC_ARN` for different notification topics

## Environment-Specific Configuration

For different environments (development, staging, production), you can override these values by:

1. **Using different serverless.yml files**
2. **Using serverless framework stages**
3. **Using AWS Systems Manager Parameter Store**
4. **Using AWS Secrets Manager for sensitive values**

Example for staging environment:
```yaml
provider:
  environment:
    S3_BUCKET_NAME: ${self:service}-staging-${self:provider.stage}
    SNS_TOPIC_ARN: arn:aws:sns:${self:provider.region}:${self:custom.accountId}:${self:service}-staging
```
