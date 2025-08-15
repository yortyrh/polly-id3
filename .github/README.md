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
   - **Environment**: dev, staging, or production
   - **S3 Bucket Name**: Custom S3 bucket name for deployment (required)
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

**Note:** S3 bucket names can be customized during manual deployment using the `s3BucketName` input parameter.

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
   - Verify the S3 bucket name is correct
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
- S3 bucket names are configurable for different environments
- Cross-platform deployment using Node.js scripts
