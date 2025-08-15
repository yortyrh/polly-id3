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
| `S3_BUCKET_NAME` | `sample-bucket` | S3 bucket name for storing audio files |
| `SNS_TOPIC_ARN` | Auto-generated | SNS topic ARN for task completion notifications |

### Retry Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `MAX_RETRY_ATTEMPTS` | `3` | Maximum number of retry attempts for AWS API calls |

## Configuration in serverless.yml

Environment variables are configured in the `serverless.yml` file under the `provider.environment` section:

```yaml
provider:
  environment:
    S3_BUCKET_NAME: ${env:S3_BUCKET_NAME}
    OUTPUT_FORMAT: ${env:OUTPUT_FORMAT}
    VOICE_ID: ${env:VOICE_ID}
    LANGUAGE_CODE: ${env:LANGUAGE_CODE}
    SNS_TOPIC_ARN: 
      Fn::GetAtt: [PollyTaskCompletedTopic, TopicArn]
    POLLY_ENGINE: ${env:POLLY_ENGINE}
    TEXT_TYPE: ${env:TEXT_TYPE}
    MAX_RETRY_ATTEMPTS: ${env:MAX_RETRY_ATTEMPTS}
```

## Usage in Code

Environment variables are accessed in the code using `process.env`:

```typescript
const bucketName = process.env.S3_BUCKET_NAME || 'sample-bucket';
const voiceId = (process.env.VOICE_ID || 'Lea') as VoiceId;
const maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
```

## Lambda Functions

The application includes three Lambda functions:

### 1. `id3.handler`
- **Purpose**: Initiates text-to-speech synthesis with ID3 metadata
- **Timeout**: 900 seconds
- **Memory**: 1024 MB
- **Input**: `{ text: string, key: string, id3: unknown }`

### 2. `id3.pollyTaskCompleted`
- **Purpose**: Processes SNS notifications when Polly synthesis completes
- **Trigger**: SNS topic `PollyTaskCompletedTopic`
- **Functionality**: Applies ID3 tags to generated MP3 files

### 3. `id3.updateId3Metadata`
- **Purpose**: Updates ID3 metadata for existing MP3 files in S3
- **Timeout**: 900 seconds
- **Memory**: 1024 MB
- **Input**: `{ s3Bucket: string, folderKey: string }`

## AWS Resources

### SNS Topic
- **Name**: `PollyTaskCompletedTopic`
- **Purpose**: Notifications for Polly task completion
- **Created**: Automatically by CloudFormation

### IAM Permissions
The Lambda functions have the following permissions:

#### Polly Permissions
- `polly:*` on all resources

#### SNS Permissions
- `sns:PutDataProtectionPolicy`
- `sns:Publish`
- `sns:DeleteTopic`
- `sns:Subscribe`
- `sns:ConfirmSubscription`
- **Resource**: The created SNS topic

#### S3 Permissions
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `s3:ListBucket`
- `s3:HeadObject`
- `s3:ListObjectsV2`
- **Resource**: The configured S3 bucket

## Customization

To customize the application for different environments or use cases:

1. **Change Voice**: Update `VOICE_ID` to use a different Polly voice
2. **Change Language**: Update `LANGUAGE_CODE` for different languages
3. **Change Output Format**: Update `OUTPUT_FORMAT` for different audio formats
4. **Change S3 Bucket**: Update `S3_BUCKET_NAME` for different storage locations
5. **Change Retry Strategy**: Update `MAX_RETRY_ATTEMPTS` for different reliability requirements

## Environment-Specific Configuration

For different environments (development, staging, production), you can override these values by:

1. **Using different .env.local files**
2. **Using serverless framework stages**
3. **Using AWS Systems Manager Parameter Store**
4. **Using AWS Secrets Manager for sensitive values**

Example for different environments:
```bash
# Development
S3_BUCKET_NAME=sample-bucket-dev
MAX_RETRY_ATTEMPTS=2

# Staging
S3_BUCKET_NAME=sample-bucket-staging
MAX_RETRY_ATTEMPTS=3

# Production
S3_BUCKET_NAME=sample-bucket-prod
MAX_RETRY_ATTEMPTS=5
```

## Deployment Configuration

### GitHub Actions
The GitHub Actions workflow accepts the following inputs:
- `environment`: Deployment environment (dev/staging/production)
- `s3BucketName`: S3 bucket name for deployment
- `verbose`: Enable verbose output

### Local Scripts
The package.json includes the following scripts:
- `deploy:local`: Deploy using .env.local file
- `deploy`: Deploy with custom environment variables
- `remove`: Remove the deployment from AWS

### Local Deployment
Use the provided npm scripts:
```bash
npm run deploy:local
npm run deploy
npm run remove
```

Or use the deploy script directly:
```bash
node --env-file=.env.local scripts/deploy.js
node scripts/deploy.js
```
