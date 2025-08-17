# GitHub Actions Workflow Documentation

This document describes the GitHub Actions workflow for the Polly ID3 Tag Manager application.

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
   - Node.js version: 22.x
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

### Environment Variables

The workflow uses environment variables from GitHub repository settings:

#### Variables (Repository Variables)

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

#### Secrets (Repository Secrets)

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

## Configuration

### Setting Up Repository Variables

1. **Go to Repository Settings**
   ```
   Repository → Settings → Secrets and variables → Actions
   ```

2. **Add Variables**
   - Click **Variables** tab
   - Click **New repository variable**
   - Add each variable with appropriate values

3. **Add Secrets**
   - Click **Secrets** tab
   - Click **New repository secret**
   - Add each secret with appropriate values

### Example Configuration

**Variables**:
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

**Secrets**:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
SERVERLESS_ACCESS_KEY=...
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Verify AWS credentials are correct
   - Check IAM permissions for the AWS user

2. **Cache Issues**
   - Clear cache by deleting the cache key
   - Check `package-lock.json` for changes

3. **Environment Variable Errors**
   - Verify all required variables are set
   - Check variable names and values

4. **Deployment Failures**
   - Enable verbose output for detailed logs
   - Check CloudFormation stack events in AWS Console

### Debugging

1. **Enable Verbose Output**
   - Check the verbose option when running workflow
   - Review detailed logs in each step

2. **Check AWS Console**
   - Verify CloudFormation stack status
   - Check Lambda function logs in CloudWatch

3. **Review Workflow Logs**
   - Check each step's output
   - Look for error messages and stack traces

## Security Considerations

1. **Secrets Management**
   - Never commit secrets to version control
   - Use GitHub repository secrets for sensitive data
   - Rotate secrets regularly

2. **IAM Permissions**
   - Use least privilege principle
   - Grant only necessary permissions to AWS user
   - Consider using OIDC for better security

3. **Access Control**
   - Limit who can trigger workflows
   - Use branch protection rules
   - Review workflow permissions

## Best Practices

1. **Environment Management**
   - Use different variables for different environments
   - Test deployments in staging before production
   - Use descriptive stage names

2. **Monitoring**
   - Monitor deployment success rates
   - Set up notifications for failures
   - Track deployment times

3. **Documentation**
   - Keep this documentation updated
   - Document any custom configurations
   - Share knowledge with team members

## Support

For issues with the GitHub Actions workflow:

1. **Check this documentation**
2. **Review workflow logs**
3. **Create an issue in the repository**
4. **Contact the development team**
