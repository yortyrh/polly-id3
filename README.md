# Polly ID3 Tag Manager

A serverless AWS application that automatically generates speech audio using Amazon Polly and applies ID3 metadata tags to the resulting MP3 files. Perfect for n8n workflow automation and text-to-speech integration.

## Why?

Transform text into professionally tagged MP3 files with a single API call. Ideal for n8n workflows that need to generate audio content with proper metadata for podcasts, audiobooks, or automated voice content.

## Features

- **Text-to-Speech**: AWS Polly integration with neural voices
- **ID3 Tagging**: Automatic metadata application (title, artist, album, artwork, custom tags)
- **S3 Storage**: Direct upload to S3 with configurable bucket
- **Serverless**: AWS Lambda-based architecture for scalability
- **Multiple Formats**: Support for MP3, OGG, and PCM audio formats
- **SSML Support**: Rich text-to-speech with SSML markup
- **CI/CD Ready**: GitHub Actions with cache management

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd polly-id3
npm install

# Configure environment
cp env.local.example .env.local
# Edit .env.local with your AWS credentials and S3 bucket

# Deploy
npm run deploy:local
```

## n8n Integration

### Example 1: French Class Generator

A complete workflow that generates French language learning content using OpenAI and Polly ID3:

1. **Form Trigger** → Collect French text input
2. **OpenAI Node** → Generate SSML content with vocabulary and phrases
3. **Set Node** → Prepare Polly ID3 parameters
4. **AWS Lambda Node** → Generate audio with ID3 tags

**Features:**
- Generates vocabulary lessons with definitions
- Creates 10 practice phrases with 10-second pauses
- Uses French voice (Lea) with generative engine
- Adds complete ID3 metadata including artwork

[Download French Class Workflow](examples/n8n/french-class.json)

### Example 2: Simple Sub-Workflow

A reusable sub-workflow for basic text-to-speech conversion:

1. **Workflow Trigger** → Accept input parameters
2. **AWS Lambda Node** → Generate audio with ID3 tags

**Features:**
- Reusable sub-workflow component
- Configurable voice, language, and engine
- Custom ID3 metadata support
- Simple integration into larger workflows

[Download Sub-Workflow](examples/n8n/sub-workflow.json)

### Sample Output

Both workflows generate MP3 files with complete ID3 metadata:
- **Title**: Generated from content or custom
- **Artist**: Amazon Polly
- **Album**: Samples Polly-ID3
- **Artwork**: Custom cover images
- **Year**: Current year
- **Genre**: Development

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket name | `my-audio-bucket` |
| `SERVERLESS_ACCESS_KEY` | Serverless Framework key | `...` |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VOICE_ID` | `Lea` | Polly voice ID |
| `LANGUAGE_CODE` | `fr-FR` | Language code |
| `POLLY_ENGINE` | `standard` | Polly engine type |
| `TEXT_TYPE` | `text` | Text input type |

## Setup Guides

- **[AWS Setup](AWS_SETUP.md)** - Complete AWS account configuration
- **[GitHub Actions](GITHUB_SETUP.md)** - CI/CD deployment setup
- **[Configuration](CONFIG.md)** - Detailed configuration options
- **[Architecture](ARCHITECTURE.md)** - System design and components

## Limitations

- **File Size**: Maximum 150MB per audio file
- **Processing Time**: Up to 15 minutes for long audio files
- **Voice Availability**: Limited to AWS Polly supported voices
- **Format Support**: MP3, OGG, PCM only

## FAQ

**Q: Can I use custom voices?**
A: Only AWS Polly supported voices are available.

**Q: How long can the text be?**
A: Up to 3000 characters per request.

**Q: Can I update metadata after generation?**
A: Yes, use the `updateId3Metadata` function.

**Q: Is SSML supported?**
A: Yes, set `TEXT_TYPE=ssml` and wrap text in `<speak>` tags.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- Create an issue in the GitHub repository
- Check [AWS Setup](AWS_SETUP.md) for deployment issues
- Review [Configuration](CONFIG.md) for setup questions
