# Polly ID3 Tag Manager

A serverless application that uses AWS Polly to generate speech audio and automatically applies ID3 metadata tags to the generated MP3 files.

## Features

- Text-to-speech synthesis using AWS Polly's neural voices
- Automatic ID3 tag application to MP3 files
- Support for common ID3 metadata fields like title, artist, album, etc.
- Serverless architecture using AWS Lambda and S3

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Deploy using Serverless Framework: `serverless deploy`

## Configuration

The application uses the following AWS services:

- AWS Polly for speech synthesis
- AWS S3 for file storage
- AWS Lambda for serverless functions
- AWS SNS for notifications

See `serverless.yml` for detailed configuration.
