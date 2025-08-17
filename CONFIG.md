# Configuration

This document describes all the environment variables used in the Polly ID3 Tag Manager application.

## Environment Variables

### AWS Polly Configuration

| Variable | Default Value | Description | Type |
|----------|---------------|-------------|------|
| `VOICE_ID` | `Lea` | AWS Polly voice ID to use for speech synthesis | `VoiceId` |
| `LANGUAGE_CODE` | `fr-FR` | Language code for speech synthesis | `LanguageCode` |
| `OUTPUT_FORMAT` | `mp3` | Output format for synthesized speech | `'mp3' \| 'ogg_vorbis' \| 'pcm'` |
| `POLLY_ENGINE` | `standard` | Polly engine type | `'standard' \| 'neural' \| 'generative'` |
| `TEXT_TYPE` | `ssml` | Type of text input | `'ssml' \| 'text'` |

### AWS Services Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `S3_BUCKET_NAME` | `sample-bucket` | S3 bucket name for storing audio files |
| `SNS_TOPIC_ARN` | Auto-generated | SNS topic ARN for task completion notifications |
| `AWS_REGION` | `us-east-1` | AWS region for deployment |

### Lambda Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `TIMEOUT` | `120` | Lambda function timeout in seconds |
| `TIMEOUT_BULK` | `900` | Bulk operations timeout in seconds |
| `MEMORY_SIZE` | `512` | Lambda function memory size in MB |
| `MEMORY_SIZE_BULK` | `1024` | Bulk operations memory size in MB |

### Retry Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `MAX_RETRY_ATTEMPTS` | `3` | Maximum number of retry attempts for AWS API calls |

### CI/CD Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SERVERLESS_ACCESS_KEY` | Serverless Framework access key for CI/CD | Yes (for CI/CD) |

## Configuration in serverless.yml

Environment variables are configured in the `serverless.yml` file under the `provider.environment` section:

```yaml
provider:
  environment:
    TIMEOUT: ${env:TIMEOUT, '120'}
    TIMEOUT_BULK: ${env:TIMEOUT_BULK, '900'}
    MEMORY_SIZE: ${env:MEMORY_SIZE, '512'}
    MEMORY_SIZE_BULK: ${env:MEMORY_SIZE_BULK, '1024'}
    S3_BUCKET_NAME: ${env:S3_BUCKET_NAME}
    OUTPUT_FORMAT: ${env:OUTPUT_FORMAT, 'mp3'}
    VOICE_ID: ${env:VOICE_ID, 'Lea'}
    LANGUAGE_CODE: ${env:LANGUAGE_CODE, 'fr-FR'}
    SNS_TOPIC_ARN: 
      Fn::GetAtt: [PollyTaskCompletedTopic, TopicArn]
    POLLY_ENGINE: ${env:POLLY_ENGINE, 'standard'}
    TEXT_TYPE: ${env:TEXT_TYPE, 'ssml'}
    MAX_RETRY_ATTEMPTS: ${env:MAX_RETRY_ATTEMPTS, '3'}
```

## Usage in Code

Environment variables are accessed in the code using `process.env`:

```typescript
const bucketName = process.env.S3_BUCKET_NAME || 'sample-bucket';
const voiceId = (process.env.VOICE_ID || 'Lea') as VoiceId;
const maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
const timeout = parseInt(process.env.TIMEOUT || '120', 10);
const memorySize = parseInt(process.env.MEMORY_SIZE || '512', 10);
```

## Lambda Functions

The application includes three Lambda functions:

### 1. `id3.handler`
- **Purpose**: Initiates text-to-speech synthesis with ID3 metadata
- **Timeout**: Configurable via `TIMEOUT` (default: 120 seconds)
- **Memory**: Configurable via `MEMORY_SIZE` (default: 512 MB)
- **Input**: `{ text: string, key: string, id3?: ID3Metadata, ... }`

### 2. `id3.pollyTaskCompleted`
- **Purpose**: Processes SNS notifications when Polly synthesis completes
- **Trigger**: SNS topic `PollyTaskCompletedTopic`
- **Timeout**: Configurable via `TIMEOUT` (default: 120 seconds)
- **Memory**: Configurable via `MEMORY_SIZE` (default: 512 MB)
- **Functionality**: Applies ID3 tags to generated MP3 files

### 3. `id3.updateId3Metadata`
- **Purpose**: Updates ID3 metadata for existing MP3 files in S3
- **Timeout**: Configurable via `TIMEOUT_BULK` (default: 900 seconds)
- **Memory**: Configurable via `MEMORY_SIZE_BULK` (default: 1024 MB)
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

## GitHub Actions Configuration

### Required Variables

Set these in your GitHub repository under Settings → Secrets and variables → Actions → Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `STAGE` | Deployment stage | `dev`, `staging`, `production` |
| `S3_BUCKET_NAME` | S3 bucket name | `my-audio-bucket` |
| `SNS_TOPIC_ARN` | SNS topic ARN | Auto-generated |
| `VOICE_ID` | Polly voice ID | `Lea`, `Matthew`, `Joanna` |
| `LANGUAGE_CODE` | Language code | `fr-FR`, `en-US`, `es-ES` |
| `POLLY_ENGINE` | Polly engine | `standard`, `neural`, `generative` |
| `TEXT_TYPE` | Text type | `ssml`, `text` |
| `MAX_RETRY_ATTEMPTS` | Retry attempts | `3`, `5`, `10` |
| `AWS_REGION` | AWS region | `us-east-1`, `eu-west-1` |

### Required Secrets

Set these in your GitHub repository under Settings → Secrets and variables → Actions → Secrets:

| Secret | Description | Required |
|--------|-------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | Yes |
| `SERVERLESS_ACCESS_KEY` | Serverless Framework access key | Yes (for CI/CD) |

### Cache Management

The GitHub Actions workflow includes cache management for faster builds:

```yaml
- name: Cache node modules
  id: cache-npm
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache dependencies
  id: cache-deps
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-deps-
```

## Customization

To customize the application for different environments or use cases:

1. **Change Voice**: Update `VOICE_ID` to use a different Polly voice
2. **Change Language**: Update `LANGUAGE_CODE` for different languages
3. **Change Output Format**: Update `OUTPUT_FORMAT` for different audio formats
4. **Change S3 Bucket**: Update `S3_BUCKET_NAME` for different storage locations
5. **Change Retry Strategy**: Update `MAX_RETRY_ATTEMPTS` for different reliability requirements
6. **Change Lambda Settings**: Update `TIMEOUT`, `MEMORY_SIZE` for performance tuning
7. **Change Polly Engine**: Update `POLLY_ENGINE` for different voice quality

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
TIMEOUT=60
MEMORY_SIZE=256

# Staging
S3_BUCKET_NAME=sample-bucket-staging
MAX_RETRY_ATTEMPTS=3
TIMEOUT=120
MEMORY_SIZE=512

# Production
S3_BUCKET_NAME=sample-bucket-prod
MAX_RETRY_ATTEMPTS=5
TIMEOUT=300
MEMORY_SIZE=1024
```

## Deployment Configuration

### GitHub Actions
The GitHub Actions workflow accepts the following inputs:
- `verbose`: Enable verbose output (boolean, optional)

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

## Performance Tuning

### Lambda Configuration

For optimal performance, consider these settings:

| Use Case | Timeout | Memory | Description |
|----------|---------|--------|-------------|
| Small files | 60s | 256MB | Quick processing |
| Medium files | 120s | 512MB | Standard processing |
| Large files | 300s | 1024MB | Bulk processing |
| Batch operations | 900s | 2048MB | High-volume processing |

### Retry Configuration

Configure retry attempts based on your reliability requirements:

| Environment | Retry Attempts | Description |
|-------------|----------------|-------------|
| Development | 1-2 | Fast feedback |
| Staging | 3 | Balanced approach |
| Production | 5-10 | High reliability |

## Security Considerations

1. **IAM Permissions**: Use least privilege principle
2. **Secrets Management**: Store sensitive values in AWS Secrets Manager
3. **Environment Variables**: Avoid hardcoding sensitive information
4. **Network Security**: Use VPC for Lambda functions if needed
5. **Access Logging**: Enable CloudTrail for audit trails

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check IAM roles and policies
2. **Timeout Errors**: Increase Lambda timeout
3. **Memory Errors**: Increase Lambda memory allocation
4. **S3 Access Denied**: Verify bucket permissions
5. **Polly Errors**: Check voice and language compatibility

### Debugging

1. **CloudWatch Logs**: Check Lambda function logs
2. **SNS Notifications**: Monitor SNS topic for errors
3. **S3 Access**: Verify bucket and object permissions
4. **Environment Variables**: Confirm all required variables are set
