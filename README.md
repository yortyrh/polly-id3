# Polly ID3 Tag Manager

A serverless AWS application that automatically generates speech audio using Amazon Polly and applies ID3 metadata tags to the resulting MP3 files. Built with TypeScript and the Serverless Framework.

## 🚀 Features

- **Text-to-Speech Synthesis**: Uses AWS Polly's neural voices for high-quality speech generation
- **Automatic ID3 Tagging**: Applies comprehensive metadata tags to MP3 files
- **Serverless Architecture**: Built on AWS Lambda, S3, and SNS for scalability
- **French Language Support**: Optimized for French text-to-speech with voice 'Lea'
- **Retry Logic**: Robust error handling with exponential backoff
- **Metadata Management**: Supports standard and custom ID3 metadata fields

## 📋 Prerequisites

- Node.js 22.x or higher
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

## 🚀 Deployment

Deploy the application to AWS:

```bash
serverless deploy
```

This will create:
- Lambda functions for speech synthesis and ID3 processing
- S3 bucket for audio file storage
- SNS topic for task completion notifications
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
- **S3 Bucket**: `yorty-s3-french`
- **SNS Topic**: `arn:aws:sns:us-east-1:545616318384:french-polly-2`

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
├── utils/
│   └── logger.ts          # Additional utilities
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
   npx tsc
   ```

3. **Test locally with Serverless**
   ```bash
   serverless invoke local --function id3 --data '{"text":"Hello","key":"test.mp3"}'
   ```

## 🧪 Testing

Run the test suite:

```bash
npm test -- --run
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

## 🔄 Version History

- **v1.0.0**: Initial release with basic Polly integration and ID3 tagging
- Support for French text-to-speech
- Serverless architecture implementation
