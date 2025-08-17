# AWS Setup Guide

This guide provides step-by-step instructions to set up the Polly ID3 Tag Manager in any AWS account.

## Prerequisites

Before starting, ensure you have:

- An AWS account with administrative access
- AWS CLI installed and configured
- Node.js 22.x or higher installed (minimum required version)
- Serverless Framework installed globally: `npm install -g serverless`

## Step 1: AWS Account Preparation

### 1.1 Create an IAM User for Deployment

1. **Navigate to IAM Console**
   - Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
   - Click "Users" → "Add user"

2. **Create User**
   - Username: `polly-id3-deployer`
   - Access type: "Programmatic access"
   - Click "Next: Permissions"

3. **Attach Permissions**
   - Select "Attach policies directly"
   - Click "Create policy"
   - Choose JSON tab
   - Paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:PassRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy",
        "sns:CreateTopic",
        "sns:DeleteTopic",
        "sns:GetTopicAttributes",
        "sns:SetTopicAttributes",
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:Publish",
        "polly:*",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DeleteLogGroup"
      ],
      "Resource": "*"
    }
  ]
}
```

4. **Complete User Creation**
   - Name the policy: `PollyID3DeploymentPolicy`
   - Attach the policy to the user
   - Complete user creation

5. **Download Access Keys**
   - After user creation, download the CSV file
   - Save your Access Key ID and Secret Access Key securely

### 1.2 Configure AWS CLI

```bash
aws configure
```

Enter the following information:
- AWS Access Key ID: [Your access key]
- AWS Secret Access Key: [Your secret key]
- Default region name: `us-east-1` (or your preferred region)
- Default output format: `json`

## Step 2: Project Setup

### 2.1 Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd polly-id3

# Install dependencies
npm install
```

**Note**: Ensure you have Node.js 22.x or higher installed before running `npm install`.

### 2.2 Configure Environment

```bash
# Copy the example environment file
cp env.local.example .env.local

# Edit the environment file
nano .env.local
```

Configure the following variables in `.env.local`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Deployment Configuration
STAGE=dev

# AWS Polly Configuration
VOICE_ID=Lea
LANGUAGE_CODE=fr-FR
OUTPUT_FORMAT=mp3
POLLY_ENGINE=standard
TEXT_TYPE=ssml

# AWS Services Configuration
S3_BUCKET_NAME=your-unique-bucket-name
SNS_TOPIC_ARN=auto-generated

# Lambda Configuration
TIMEOUT=120
TIMEOUT_BULK=900
MEMORY_SIZE=512
MEMORY_SIZE_BULK=1024

# Retry Configuration
MAX_RETRY_ATTEMPTS=3
```

**Important**: Choose a unique S3 bucket name that doesn't exist globally.

## Step 3: Local Deployment

### 3.1 Test Local Configuration

```bash
# Deploy using local environment file
npm run deploy:local
```

This will:
- Create the S3 bucket
- Create the SNS topic
- Deploy Lambda functions
- Set up IAM roles and policies

### 3.2 Verify Deployment

1. **Check CloudFormation Stack**
   - Go to [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/)
   - Verify the stack `polly-id3-dev` was created successfully

2. **Check Lambda Functions**
   - Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
   - Verify three functions were created:
     - `polly-id3-dev-id3`
     - `polly-id3-dev-id3PollyTaskCompleted`
     - `polly-id3-dev-updateId3Metadata`

3. **Check S3 Bucket**
   - Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
   - Verify your bucket was created

4. **Check SNS Topic**
   - Go to [AWS SNS Console](https://console.aws.amazon.com/sns/)
   - Verify `PollyTaskCompletedTopic` was created

## Step 4: Test the Application

### 4.1 Test Speech Synthesis

Use AWS CLI to test the Lambda function:

```bash
aws lambda invoke \
  --function-name polly-id3-dev-id3 \
  --payload '{"text":"<speak>Hello, this is a test.</speak>","key":"test.mp3","id3":{"title":"Test Audio","artist":"Test Artist"}}' \
  response.json
```

### 4.2 Check Results

1. **Check S3 for Audio File**
   - Go to your S3 bucket
   - Look for the generated `test.mp3` file

2. **Check CloudWatch Logs**
   - Go to [AWS CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
   - Navigate to Log groups
   - Check `/aws/lambda/polly-id3-dev-id3` for execution logs

## Step 5: Production Setup

### 5.1 Create Production Environment

```bash
# Create production environment file
cp env.local.example .env.production
```

Edit `.env.production`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Deployment Configuration
STAGE=production

# AWS Polly Configuration
VOICE_ID=Lea
LANGUAGE_CODE=fr-FR
OUTPUT_FORMAT=mp3
POLLY_ENGINE=neural
TEXT_TYPE=ssml

# AWS Services Configuration
S3_BUCKET_NAME=your-production-bucket-name
SNS_TOPIC_ARN=auto-generated

# Lambda Configuration (Higher for production)
TIMEOUT=300
TIMEOUT_BULK=900
MEMORY_SIZE=1024
MEMORY_SIZE_BULK=2048

# Retry Configuration (Higher for production)
MAX_RETRY_ATTEMPTS=5
```

### 5.2 Deploy to Production

```bash
# Deploy to production
STAGE=production S3_BUCKET_NAME=your-production-bucket-name npm run deploy
```

## Step 6: CI/CD Setup (Optional)

### 6.1 GitHub Actions Setup

If using GitHub Actions for deployment:

1. **Add Repository Secrets**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `SERVERLESS_ACCESS_KEY`

2. **Add Repository Variables**
   - In the same section, add Variables:
     - `STAGE`
     - `S3_BUCKET_NAME`
     - `VOICE_ID`
     - `LANGUAGE_CODE`
     - `POLLY_ENGINE`
     - `TEXT_TYPE`
     - `MAX_RETRY_ATTEMPTS`
     - `AWS_REGION`

3. **Trigger Deployment**
   - Go to Actions tab
   - Select "Manual Deploy"
   - Click "Run workflow"

## Step 7: Monitoring and Maintenance

### 7.1 Set Up CloudWatch Alarms

1. **Create Error Rate Alarm**
   - Go to CloudWatch → Alarms
   - Create alarm for Lambda error rate
   - Set threshold to 1% error rate

2. **Create Duration Alarm**
   - Create alarm for Lambda duration
   - Set threshold to 80% of timeout

### 7.2 Set Up Log Retention

```bash
# Set log retention to 30 days
aws logs put-retention-policy \
  --log-group-name "/aws/lambda/polly-id3-dev-id3" \
  --retention-in-days 30
```

### 7.3 Cost Optimization

1. **Monitor Usage**
   - Use AWS Cost Explorer to monitor costs
   - Set up billing alerts

2. **Optimize Lambda Settings**
   - Adjust memory based on usage patterns
   - Monitor and adjust timeout values

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Verify IAM permissions
   aws sts get-caller-identity
   ```

2. **S3 Bucket Already Exists**
   - Choose a different bucket name
   - Bucket names must be globally unique

3. **Lambda Function Creation Fails**
   - Check IAM permissions
   - Verify region settings
   - Check CloudFormation stack events

4. **Polly Synthesis Fails**
   - Verify voice and language compatibility
   - Check text format (SSML vs plain text)
   - Verify Polly service is available in your region

### Debugging Commands

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name polly-id3-dev

# Check Lambda function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/polly-id3"

# Test S3 bucket access
aws s3 ls s3://your-bucket-name

# Test SNS topic
aws sns list-topics
```

## Security Best Practices

### 1. IAM Security
- Use least privilege principle
- Regularly rotate access keys
- Enable MFA for IAM users
- Use IAM roles instead of access keys when possible

### 2. S3 Security
- Enable bucket encryption
- Configure bucket policies
- Enable access logging
- Use versioning for important files

### 3. Lambda Security
- Use VPC for sensitive functions
- Enable function encryption
- Monitor function permissions
- Use environment variables for configuration

### 4. Network Security
- Use VPC endpoints for AWS services
- Configure security groups
- Enable CloudTrail for audit logging
- Monitor network access

## Cost Estimation

### Monthly Costs (Estimated)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 1M requests/month | ~$0.20 |
| S3 | 1GB storage | ~$0.023 |
| Polly | 1M characters | ~$4.00 |
| SNS | 1M notifications | ~$0.50 |
| CloudWatch | Basic monitoring | ~$0.50 |

**Total**: ~$5.22/month for moderate usage

### Cost Optimization Tips

1. **Lambda Optimization**
   - Use appropriate memory settings
   - Optimize function code
   - Use provisioned concurrency for consistent workloads

2. **S3 Optimization**
   - Use appropriate storage classes
   - Implement lifecycle policies
   - Compress files when possible

3. **Polly Optimization**
   - Cache frequently used audio
   - Use appropriate voice engines
   - Batch requests when possible

## Support

For additional support:

1. **Check Documentation**
   - Review [README.md](README.md)
   - Check [CONFIG.md](CONFIG.md)

2. **AWS Support**
   - Use AWS CloudFormation stack events
   - Check CloudWatch logs
   - Contact AWS Support if needed

3. **Community Support**
   - Create an issue in the GitHub repository
   - Check AWS forums
   - Review Serverless Framework documentation
