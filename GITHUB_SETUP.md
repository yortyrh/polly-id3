# GitHub Configuration Guide

This guide provides comprehensive instructions for setting up and using GitHub Actions with the Polly ID3 Tag Manager application.

## Overview

The project uses GitHub Actions for continuous integration and deployment (CI/CD) with the following features:

- **Manual Deployment**: Trigger deployments manually from the GitHub Actions UI
- **Cache Management**: Optimized builds with Node.js and dependency caching
- **Environment Variables**: Configurable via GitHub repository variables and secrets
- **Verbose Output**: Optional detailed logging for debugging

## Workflow: Manual Deploy

**File**: `.github/workflows/manual-deploy.yml`

### Trigger

The workflow is triggered manually using `workflow_dispatch` with the following inputs:

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `verbose` | boolean | No | false | Enable verbose output for debugging |

### Jobs

#### Deploy Job

**Runner**: `ubuntu-latest`

**Steps**:

1. **Checkout Code**
   - Uses `actions/checkout@v4`
   - Clones the repository

2. **Setup Node.js**
   - Uses `actions/setup-node@v4`
   - Node.js version: 22.x (minimum required version)
   - Enables npm caching

3. **Cache Node Modules**
   - Uses `actions/cache@v4`
   - Caches `~/.npm` directory
   - Cache key based on `package-lock.json` hash

4. **Cache Dependencies**
   - Uses `actions/cache@v4`
   - Caches `node_modules` directory
   - Cache key based on `package-lock.json` hash

5. **Install Dependencies**
   - Runs `npm ci`
   - Only executes if cache miss occurs

6. **Configure AWS Credentials**
   - Uses `aws-actions/configure-aws-credentials@v4`
   - Configures AWS CLI with provided credentials

7. **Deploy**
   - Runs deployment script
   - Supports verbose output based on input
   - Passes all environment variables

8. **Notify Deployment Status**
   - Reports success/failure
   - Always runs (even on failure)

## Environment Variables Configuration

The workflow uses environment variables from GitHub repository settings:

### Required Variables

Set these in your repository under **Settings → Secrets and variables → Actions → Variables**:

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

Set these in your repository under **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Description | Required |
|--------|-------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | Yes |
| `SERVERLESS_ACCESS_KEY` | Serverless Framework access key | Yes (for CI/CD) |

## Cache Management

The workflow implements comprehensive cache management for faster builds:

### Node Modules Cache
- **Path**: `~/.npm`
- **Key**: `${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}`
- **Fallback**: `${{ runner.os }}-node-`

### Dependencies Cache
- **Path**: `node_modules`
- **Key**: `${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}`
- **Fallback**: `${{ runner.os }}-deps-`

### Benefits
- **Faster builds**: Subsequent runs are much faster
- **Reduced network usage**: Less downloading of npm packages
- **Better reliability**: Reduces dependency on external npm registry
- **Cost optimization**: Faster GitHub Actions minutes usage

## Step-by-Step Setup

### Step 1: Repository Preparation

1. **Fork or Clone Repository**
   ```bash
   git clone <repository-url>
   cd polly-id3
   ```

2. **Push to Your Repository**
   ```bash
   git remote set-url origin <your-repo-url>
   git push -u origin main
   ```

**Note**: Ensure your local environment has Node.js 22.x or higher installed for development.

### Step 2: Configure Repository Variables

1. **Navigate to Repository Settings**
   ```
   Repository → Settings → Secrets and variables → Actions
   ```

2. **Add Variables**
   - Click **Variables** tab
   - Click **New repository variable**
   - Add each variable with appropriate values

**Example Variables**:
```
STAGE=dev
S3_BUCKET_NAME=my-audio-bucket
VOICE_ID=Lea
LANGUAGE_CODE=fr-FR
POLLY_ENGINE=standard
TEXT_TYPE=ssml
MAX_RETRY_ATTEMPTS=3
AWS_REGION=us-east-1
```

### Step 3: Configure Repository Secrets

1. **Add Secrets**
   - Click **Secrets** tab
   - Click **New repository secret**
   - Add each secret with appropriate values

**Required Secrets**:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
SERVERLESS_ACCESS_KEY=...
```

### Step 4: Get Serverless Access Key

1. **Log in to Serverless Dashboard**
   - Go to [Serverless Dashboard](https://app.serverless.com)
   - Sign in with your account

2. **Generate Access Key**
   - Navigate to your profile settings
   - Find the "Access Keys" section
   - Click "Generate new key"
   - Copy the generated key

3. **Add to GitHub Secrets**
   - Add as `SERVERLESS_ACCESS_KEY` secret

## Usage

### Manual Deployment

1. **Navigate to Actions**
   - Go to your repository on GitHub
   - Click on the **Actions** tab

2. **Select Workflow**
   - Click on **Manual Deploy** workflow

3. **Run Workflow**
   - Click **Run workflow** button
   - Choose branch (usually `main` or `master`)
   - Optionally enable verbose output
   - Click **Run workflow**

### Monitoring Deployment

1. **View Progress**
   - Click on the running workflow
   - Monitor step-by-step progress

2. **Check Logs**
   - Click on individual steps to view logs
   - Use verbose output for detailed debugging

3. **Verify Success**
   - Check the final notification step
   - Verify deployment in AWS Console

## Environment-Specific Configurations

### Development Environment

**Variables**:
```
STAGE=dev
S3_BUCKET_NAME=my-audio-bucket-dev
VOICE_ID=Lea
LANGUAGE_CODE=fr-FR
POLLY_ENGINE=standard
TEXT_TYPE=ssml
MAX_RETRY_ATTEMPTS=2
AWS_REGION=us-east-1
```

### Staging Environment

**Variables**:
```
STAGE=staging
S3_BUCKET_NAME=my-audio-bucket-staging
VOICE_ID=Lea
LANGUAGE_CODE=fr-FR
POLLY_ENGINE=neural
TEXT_TYPE=ssml
MAX_RETRY_ATTEMPTS=3
AWS_REGION=us-east-1
```

### Production Environment

**Variables**:
```
STAGE=production
S3_BUCKET_NAME=my-audio-bucket-prod
VOICE_ID=Lea
LANGUAGE_CODE=fr-FR
POLLY_ENGINE=neural
TEXT_TYPE=ssml
MAX_RETRY_ATTEMPTS=5
AWS_REGION=us-east-1
```

## Workflow Customization

### Adding New Environment Variables

1. **Update Workflow File**
   ```yaml
   env:
     NEW_VARIABLE: ${{ vars.NEW_VARIABLE }}
   ```

2. **Add to Repository Variables**
   - Go to repository settings
   - Add the new variable

3. **Update Documentation**
   - Update this guide
   - Update CONFIG.md

### Modifying Cache Strategy

1. **Update Cache Keys**
   ```yaml
   - name: Cache dependencies
     uses: actions/cache@v4
     with:
       path: node_modules
       key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/src/**') }}
   ```

2. **Add New Cache Paths**
   ```yaml
   - name: Cache build artifacts
     uses: actions/cache@v4
     with:
       path: dist
       key: ${{ runner.os }}-build-${{ hashFiles('**/src/**') }}
   ```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Verify AWS credentials are correct
   - Check IAM permissions for the AWS user
   - Ensure secrets are properly set

2. **Cache Issues**
   - Clear cache by deleting the cache key
   - Check `package-lock.json` for changes
   - Verify cache paths are correct

3. **Environment Variable Errors**
   - Verify all required variables are set
   - Check variable names and values
   - Ensure no typos in variable names

4. **Deployment Failures**
   - Enable verbose output for detailed logs
   - Check CloudFormation stack events in AWS Console
   - Review workflow step logs

### Debugging

1. **Enable Verbose Output**
   - Check the verbose option when running workflow
   - Review detailed logs in each step

2. **Check AWS Console**
   - Verify CloudFormation stack status
   - Check Lambda function logs in CloudWatch
   - Review S3 bucket and SNS topic

3. **Review Workflow Logs**
   - Check each step's output
   - Look for error messages and stack traces
   - Verify environment variable values

## Security Considerations

### 1. Secrets Management
- Never commit secrets to version control
- Use GitHub repository secrets for sensitive data
- Rotate secrets regularly
- Use least privilege principle

### 2. Access Control
- Limit who can trigger workflows
- Use branch protection rules
- Review workflow permissions
- Enable required status checks

### 3. Environment Security
- Use different secrets for different environments
- Implement proper IAM roles and policies
- Monitor access and usage
- Enable audit logging

## Best Practices

### 1. Environment Management
- Use different variables for different environments
- Test deployments in staging before production
- Use descriptive stage names
- Implement proper environment separation

### 2. Monitoring
- Monitor deployment success rates
- Set up notifications for failures
- Track deployment times
- Monitor resource usage

### 3. Documentation
- Keep this documentation updated
- Document any custom configurations
- Share knowledge with team members
- Maintain change logs

### 4. Version Control
- Use semantic versioning
- Tag releases appropriately
- Maintain clean commit history
- Use feature branches for development

## Performance Optimization

### 1. Cache Strategy
- Cache dependencies effectively
- Use appropriate cache keys
- Monitor cache hit rates
- Optimize cache invalidation

### 2. Build Optimization
- Minimize build times
- Use parallel jobs when possible
- Optimize dependency installation
- Use appropriate runners

### 3. Resource Management
- Monitor GitHub Actions minutes usage
- Optimize workflow efficiency
- Use appropriate timeout values
- Implement proper error handling

## Support

For issues with GitHub Actions:

1. **Check Documentation**
   - Review this guide
   - Check [CONFIG.md](CONFIG.md)
   - Review [AWS_SETUP.md](AWS_SETUP.md)

2. **GitHub Support**
   - Check workflow logs
   - Review GitHub Actions documentation
   - Contact GitHub Support if needed

3. **Community Support**
   - Create an issue in the repository
   - Check GitHub community forums
   - Review Serverless Framework documentation

4. **Debugging Resources**
   - GitHub Actions troubleshooting guide
   - AWS CloudFormation documentation
   - Serverless Framework documentation
