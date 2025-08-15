# Polly ID3 Tag Manager

A serverless AWS application that automatically generates speech audio using Amazon Polly and applies ID3 metadata tags to the resulting MP3 files. Built with TypeScript and the Serverless Framework.

## 🚀 Features

- **Text-to-Speech Synthesis**: Uses AWS Polly's neural voices for high-quality speech generation
- **Automatic ID3 Tagging**: Applies comprehensive metadata tags to MP3 files
- **Serverless Architecture**: Built on AWS Lambda, S3, and SNS for scalability
- **French Language Support**: Optimized for French text-to-speech with voice 'Lea'
- **Retry Logic**: Robust error handling with exponential backoff
- **Metadata Management**: Supports standard and custom ID3 metadata fields
- **Environment Variables**: Fully configurable via environment variables
- **Cross-Platform Deployment**: Node.js-based deployment script

## 📋 Prerequisites

- Node.js 20.x or higher
- AWS CLI configured with appropriate permissions
- Serverless Framework installed globally: `npm install -g serverless`



## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd polly-id3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AWS credentials**
   ```bash
   aws configure
   ```
   
   **Or set environment variables:**
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_REGION=us-east-1
   ```

## 🚀 Deployment

### Quick Deploy

Deploy the application to AWS using the deploy scripts:

```bash
# Deploy using .env.local file
npm run deploy:local

# Deploy with custom environment variables
npm run deploy

# Remove deployment
npm run remove
```

### Manual Deploy

Deploy using Serverless Framework directly:

```bash
# Deploy to dev stage
serverless deploy --stage dev

# Deploy to staging stage
serverless deploy --stage staging

# Deploy to production stage
serverless deploy --stage production
```

### Environment Configuration

1. **Copy the example environment file:**
   ```bash
   cp env.local.example .env.local
   ```

2. **Customize your local settings in `.env.local`:**
   ```bash
   AWS_REGION=us-east-1
   AWS_PROFILE=default
   STAGE=dev
   S3_BUCKET_NAME=sample-bucket
   ```

This will create:
- Lambda functions for speech synthesis and ID3 processing
- S3 bucket (configurable via environment variables) for audio file storage
- SNS topic (`PollyTaskCompletedTopic`) for task completion notifications
- IAM roles with necessary permissions

## 📖 Usage

### API Endpoints

The application provides three main Lambda functions:

#### 1. Speech Synthesis (`id3.handler`)
Initiates text-to-speech synthesis with ID3 metadata.

**Request Example:**
```json
{
  "text": "<speak>Bonjour, comment allez-vous?</speak>",
  "key": "greeting.mp3",
  "id3": {
    "title": "French Greeting",
    "artist": "Polly Voice",
    "album": "French Lessons",
    "year": "2024",
    "genre": "Educational"
  }
}
```

#### 2. Task Completion Handler (`id3.pollyTaskCompleted`)
Automatically triggered when Polly synthesis completes. Applies ID3 tags to the generated MP3 file.

#### 3. Metadata Update (`id3.updateId3Metadata`)
Updates ID3 metadata for existing MP3 files in S3.

### Supported ID3 Metadata Fields

| Field | Description | Example |
|-------|-------------|---------|
| `title` | Track title | "French Greeting" |
| `artist` | Artist name | "Polly Voice" |
| `album` | Album name | "French Lessons" |
| `year` | Release year | "2024" |
| `track` | Track number | "1" |
| `genre` | Music genre | "Educational" |
| `comment` | Comments | "Generated with AWS Polly" |
| `lyrics` | Song lyrics | "Bonjour, comment allez-vous?" |
| `composer` | Composer name | "AWS Polly" |
| `albumArtist` | Album artist | "Polly Voice" |
| `bpm` | Beats per minute | "120" |

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│  Lambda (id3)   │───▶│   AWS Polly     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   S3 Bucket     │
                       │  (Audio Files)  │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   SNS Topic     │───▶│ Lambda (Task    │
                       │ (Notifications) │    │  Completed)     │
                       └─────────────────┘    └─────────────────┘
```

## ⚙️ Configuration

The application uses environment variables for all configuration. See [CONFIG.md](CONFIG.md) for detailed documentation of all available options.

### Key Configuration

- **Voice ID**: `Lea` (French neural voice)
- **Language Code**: `fr-FR` (French)
- **Output Format**: `mp3`
- **S3 Bucket**: Configurable via `S3_BUCKET_NAME` environment variable
- **SNS Topic**: `PollyTaskCompletedTopic` (created automatically)

### Serverless Framework Access Key

For CI/CD deployments using GitHub Actions, you need to configure the `SERVERLESS_ACCESS_KEY` environment variable. This key is required for the Serverless Framework to authenticate with the Serverless Dashboard.

**Setup Instructions:**

1. **Get your Serverless Access Key:**
   - Log in to your [Serverless Dashboard](https://app.serverless.com)
   - Navigate to your profile settings
   - Generate a new access key

2. **Add to GitHub Secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Create a new repository secret named `SERVERLESS_ACCESS_KEY`
   - Set the value to your Serverless access key

3. **For Local Development:**
   ```bash
   export SERVERLESS_ACCESS_KEY=your_access_key_here
   ```

For more information about running Serverless Framework in your own CI/CD pipeline, see the [official documentation](https://www.serverless.com/framework/docs/guides/dashboard/cicd/running-in-your-own-cicd).

### AWS Services Used

- **AWS Polly**: Text-to-speech synthesis
- **AWS S3**: File storage and retrieval
- **AWS Lambda**: Serverless compute
- **AWS SNS**: Event notifications
- **AWS IAM**: Security and permissions

## 🔧 Development

### Project Structure

```
polly-id3/
├── id3.ts                 # Main Lambda functions
├── services/
│   ├── id3TagProcessor.ts # ID3 tag processing logic
│   ├── s3Service.ts       # S3 operations
│   └── logger.ts          # Logging utility
├── scripts/
│   └── deploy.js          # Node.js deploy script
├── package.json           # Dependencies and scripts
├── .github/workflows/
│   └── manual-deploy.yml  # GitHub Actions workflow
├── serverless.yml         # Serverless configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

### Local Development

1. **Install development dependencies**
   ```bash
   npm install
   ```

2. **Run TypeScript compilation**
   ```bash
   npm run build
   ```

3. **Test locally with Serverless**
   ```bash
   serverless invoke local --function id3 --data '{"text":"<speak>Hello</speak>","key":"test.mp3"}'
   ```

## 🧪 Testing

### Continuous Integration

The project uses GitHub Actions for manual deployment:

- **Manual Deploy**: Allows manual deployment from GitHub Actions UI to any environment

See [`.github/README.md`](.github/README.md) for detailed workflow documentation.

## 🚀 Deployment Workflow

### Manual Deployment

For deployments, use the GitHub Actions UI:
1. Go to **Actions** → **Manual Deploy**
2. Choose verbose output if needed
3. Click **Run workflow**

Alternatively, use the local deploy scripts:
```bash
npm run deploy:local
npm run deploy
npm run remove
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the AWS CloudWatch logs for debugging
- Review the Serverless Framework documentation

### **Common AWS Permission Issues**

If you encounter permission errors during deployment:

1. **CloudFormation Errors**: Ensure your AWS user has `cloudformation:*` permissions
2. **IAM Role Creation Fails**: Verify `iam:CreateRole` and `iam:PassRole` permissions
3. **S3 Bucket Access Denied**: Check S3 permissions for bucket creation and access
4. **Lambda Function Creation Fails**: Ensure `lambda:*` permissions are granted
5. **SNS Topic Creation Fails**: Verify SNS permissions for topic management

**Error Examples:**
```bash
# CloudFormation permission error
User: arn:aws:iam::1234567890:user/deploy-user is not authorized to perform: cloudformation:CreateStack

# IAM role permission error  
User: arn:aws:iam::1234567890:user/deploy-user is not authorized to perform: iam:CreateRole

# S3 permission error
User: arn:aws:iam::1234567890:user/deploy-user is not authorized to perform: s3:CreateBucket
```

**Solution**: Add the missing permissions to your IAM user/role using the policies provided above.

## 🔄 Version History

- **v1.0.0**: Initial release with basic Polly integration and ID3 tagging
- Support for French text-to-speech
- Serverless architecture implementation
- GitHub Actions manual deployment workflow
- Environment variable configuration
- TypeScript implementation
- Cross-platform Node.js deployment script
- Simplified npm scripts for deployment and removal
