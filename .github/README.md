# GitHub Actions Workflows

This directory contains GitHub Actions workflows for manual deployment of the Polly ID3 Tag Manager.

## Workflows

### Manual Deploy (`manual-deploy.yml`)

**Triggers:**
- Manual trigger from GitHub Actions UI

**What it does:**
- Allows manual deployment to any environment (dev/staging/production)
- Accepts custom S3 bucket name for deployment
- Supports verbose output option
- Provides deployment status notifications
- Installs dependencies and builds the project
- Configures AWS credentials for deployment

## Required Secrets

Set up the following secrets in your GitHub repository:

### AWS Credentials
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: AWS region (default: us-east-1)

## 🔧 Environment Variables Configuration

The application uses environment variables for configuration. You need to set these up for both local development and GitHub Actions deployment.

### **Required Environment Variables**

#### **AWS Polly Configuration**
```bash
# Voice and Language Settings
VOICE_ID=Lea                    # AWS Polly voice ID (default: Lea)
LANGUAGE_CODE=fr-FR             # Language code (default: fr-FR)
OUTPUT_FORMAT=mp3               # Audio output format (mp3/ogg_vorbis/pcm)
POLLY_ENGINE=generative         # Polly engine (standard/neural/generative)
TEXT_TYPE=ssml                  # Text input type (ssml/text)
```

#### **AWS Services Configuration**
```bash
# S3 Bucket Configuration
S3_BUCKET_NAME=sample-bucket-dev  # S3 bucket for audio files

# Retry Configuration
MAX_RETRY_ATTEMPTS=3            # Maximum retry attempts for AWS API calls
```

#### **Application Settings**
```bash
# Timeout and Memory Configuration
TIMEOUT=120                     # Lambda function timeout in seconds
TIMEOUT_BULK=900                # Bulk operations timeout
MEMORY_SIZE=512                 # Lambda memory size in MB
MEMORY_SIZE_BULK=1024           # Bulk operations memory size
```

### **Local Development Setup**

1. **Copy the example file:**
   ```bash
   cp env.local.example .env.local
   ```

2. **Configure your local environment:**
   ```bash
   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_PROFILE=default
   
   # Development Environment
   NODE_ENV=development
   STAGE=dev
   
   # AWS Polly Configuration
   VOICE_ID=Lea
   LANGUAGE_CODE=fr-FR
   OUTPUT_FORMAT=mp3
   POLLY_ENGINE=generative
   TEXT_TYPE=ssml
   MAX_RETRY_ATTEMPTS=3
   
   # AWS Services Configuration
   S3_BUCKET_NAME=sample-bucket-dev
   
   # Application Settings
   TIMEOUT=120
   TIMEOUT_BULK=900
   MEMORY_SIZE=512
   MEMORY_SIZE_BULK=1024
   ```

### **GitHub Actions Environment Variables**

For GitHub Actions deployment, you can set environment variables in several ways:

#### **Method 1: Repository Secrets**
Add these as secrets in your GitHub repository:
- Go to **Settings** → **Secrets and variables** → **Actions**
- Add each environment variable as a secret

#### **Method 2: Environment-Specific Variables**
Create environment-specific variable files:

**Development Environment (.env.dev):**
```bash
S3_BUCKET_NAME=sample-bucket-dev
MAX_RETRY_ATTEMPTS=2
TIMEOUT=120
MEMORY_SIZE=512
```

**Staging Environment (.env.staging):**
```bash
S3_BUCKET_NAME=sample-bucket-staging
MAX_RETRY_ATTEMPTS=3
TIMEOUT=120
MEMORY_SIZE=512
```

**Production Environment (.env.production):**
```bash
S3_BUCKET_NAME=sample-bucket-prod
MAX_RETRY_ATTEMPTS=5
TIMEOUT=300
MEMORY_SIZE=1024
```

### **Environment Variable Reference**

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `VOICE_ID` | `Lea` | AWS Polly voice ID | No |
| `LANGUAGE_CODE` | `fr-FR` | Language code for speech synthesis | No |
| `OUTPUT_FORMAT` | `mp3` | Audio output format | No |
| `POLLY_ENGINE` | `generative` | Polly engine type | No |
| `TEXT_TYPE` | `ssml` | Text input type | No |
| `S3_BUCKET_NAME` | `sample-bucket-dev` | S3 bucket name | **Yes** |
| `MAX_RETRY_ATTEMPTS` | `3` | Retry attempts for AWS calls | No |
| `TIMEOUT` | `120` | Lambda timeout in seconds | No |
| `TIMEOUT_BULK` | `900` | Bulk operations timeout | No |
| `MEMORY_SIZE` | `512` | Lambda memory size in MB | No |
| `MEMORY_SIZE_BULK` | `1024` | Bulk operations memory size | No |

### **Configuration Examples**

#### **French Voice Configuration**
```bash
VOICE_ID=Lea
LANGUAGE_CODE=fr-FR
TEXT_TYPE=ssml
```

#### **English Voice Configuration**
```bash
VOICE_ID=Joanna
LANGUAGE_CODE=en-US
TEXT_TYPE=text
```

#### **High-Performance Configuration**
```bash
TIMEOUT=900
MEMORY_SIZE=1024
MAX_RETRY_ATTEMPTS=5
```

#### **Development Configuration**
```bash
TIMEOUT=120
MEMORY_SIZE=512
MAX_RETRY_ATTEMPTS=2
S3_BUCKET_NAME=sample-bucket-dev
```

### **Validation and Testing**

To validate your environment variables:

1. **Check local configuration:**
   ```bash
   npm run deploy:local
   ```

2. **Test with specific environment:**
   ```bash
   # Test development
   STAGE=dev npm run deploy
   
   # Test staging
   STAGE=staging npm run deploy
   ```

3. **Verify in AWS Console:**
   - Check Lambda function configuration
   - Verify S3 bucket access
   - Test SNS topic permissions

## 🔐 AWS Permissions Required

To deploy this application, you need to create an IAM user or role with the following permissions. Copy the JSON policies below and attach them to your AWS user/role.

### **Quick Setup (All Permissions Combined)**

Copy this complete policy for full deployment access:

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

### **Step-by-Step AWS Setup**

1. **Go to AWS IAM Console**
   - Navigate to [IAM Console](https://console.aws.amazon.com/iam/)
   - Click "Users" → "Add user"

2. **Create User**
   - Username: `polly-id3-deployer`
   - Access type: "Programmatic access"

3. **Attach Permissions**
   - Select "Attach policies directly"
   - Click "Create policy"
   - Choose JSON tab
   - Paste the policy above
   - Name: `PollyID3DeploymentPolicy`

4. **Get Access Keys**
   - After user creation, download the CSV file
   - Save your Access Key ID and Secret Access Key

### **Individual Service Policies** (Optional)

If you prefer to create separate policies for each service:

#### **CloudFormation Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["cloudformation:*"],
      "Resource": "*"
    }
  ]
}
```

#### **Lambda Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["lambda:*"],
      "Resource": "*"
    }
  ]
}
```

#### **IAM Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:PassRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

#### **S3 Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

#### **SNS Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:CreateTopic",
        "sns:DeleteTopic",
        "sns:GetTopicAttributes",
        "sns:SetTopicAttributes",
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
```

#### **CloudWatch Logs Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
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

### **Production Security Recommendations**

For production environments, consider these additional security measures:

1. **Restrict Resources**: Replace `"Resource": "*"` with specific ARNs
2. **Use IAM Roles**: Instead of access keys for EC2/ECS deployments
3. **Enable MFA**: Require Multi-Factor Authentication
4. **Rotate Keys**: Regularly rotate access keys
5. **Monitor Access**: Enable CloudTrail for audit logging

### **Example Restricted Policy** (Production)

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
        "iam:DetachRolePolicy"
      ],
      "Resource": [
        "arn:aws:cloudformation:us-east-1:YOUR_ACCOUNT_ID:stack/polly-id3-*",
        "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:polly-id3-*",
        "arn:aws:iam::YOUR_ACCOUNT_ID:role/polly-id3-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy"
      ],
      "Resource": [
        "arn:aws:s3:::polly-id3-*",
        "arn:aws:s3:::polly-id3-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:CreateTopic",
        "sns:DeleteTopic",
        "sns:GetTopicAttributes",
        "sns:SetTopicAttributes",
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:polly-id3-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DeleteLogGroup"
      ],
      "Resource": "arn:aws:logs:us-east-1:YOUR_ACCOUNT_ID:log-group:/aws/lambda/polly-id3-*"
    }
  ]
}
```

**Remember to replace `YOUR_ACCOUNT_ID` with your actual AWS account ID.**

## Usage

### Manual Deployment

1. Go to **Actions** tab in your GitHub repository
2. Select **Manual Deploy** workflow
3. Click **Run workflow**
4. Choose environment and options:
   - **Verbose**: Enable for detailed output
5. Click **Run workflow**

## Workflow Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `verbose` | boolean | No | Enable verbose output |

## Environment-Specific Deployments

### Development
- **Environment:** `dev`
- **Retry Attempts:** 2

### Staging
- **Environment:** `staging`
- **Retry Attempts:** 3

### Production
- **Environment:** `production`
- **Retry Attempts:** 5

**Note:** S3 bucket names are configured via environment variables in the deployment process.

## Workflow Steps

1. **Checkout code**: Clones the repository
2. **Setup Node.js**: Installs Node.js 22.x
3. **Install dependencies**: Runs `npm ci`
4. **Build project**: Runs `npm run build`
5. **Configure AWS credentials**: Sets up AWS authentication
6. **Deploy**: Runs the deployment script with provided parameters
7. **Notify status**: Reports deployment success or failure

## Troubleshooting

### Common Issues

1. **AWS Credentials Error:**
   - Ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
   - Verify the credentials have proper permissions

2. **Deployment Fails:**
   - Check the workflow logs for specific error messages
   - Verify the target environment exists and is accessible
   - Enable verbose output for more detailed logs

3. **Build Fails:**
   - Ensure all dependencies are properly installed
   - Check for TypeScript compilation errors

4. **S3 Bucket Issues:**
   - Verify the S3 bucket name is configured in environment variables
   - Ensure the bucket exists and is accessible
   - Check IAM permissions for S3 access

### Debugging

- Enable verbose output in manual deployments
- Check the **Actions** tab for detailed logs
- Review the deployment status in the workflow output
- Verify environment variables are set correctly

## Security

- AWS credentials are stored as encrypted secrets
- Workflows run in isolated environments
- No sensitive data is logged in workflow outputs
- All deployments use least-privilege IAM roles
- S3 bucket names are configured via environment variables
- Cross-platform deployment using Node.js scripts
