#!/usr/bin/env node

/**
 * Deploy script for Polly ID3 Tag Manager
 * This script loads environment variables from .env.local and deploys to the specified environment
 */

const { spawn } = require('child_process');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Function to print colored output
function printStatus(message) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function printSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function printError(message) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

// Function to run serverless deploy
function runServerlessDeploy(stage, verbose = false) {
  return new Promise((resolve, reject) => {
    const args = ['deploy'];
    
    if (stage) {
      args.push('--stage', stage);
    }
    
    if (verbose) {
      args.push('--verbose');
    }
    
    printStatus(`Running: npx serverless ${args.join(' ')}`);
    
    const serverless = spawn('npx', ['serverless', ...args], {
      stdio: 'inherit',
      env: process.env
    });
    
    serverless.on('close', (code) => {
      if (code === 0) {
        printSuccess('Deployment completed successfully!');
        resolve();
      } else {
        printError(`Deployment failed with code ${code}`);
        reject(new Error(`Deployment failed with code ${code}`));
      }
    });
    
    serverless.on('error', (error) => {
      printError(`Failed to start serverless: ${error.message}`);
      reject(error);
    });
  });
}

// Function to show usage
function showUsage() {
  console.log('Usage: node scripts/deploy.js [OPTIONS] [STAGE]');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help     Show this help message');
  console.log('  -v, --verbose  Enable verbose output');
  console.log('');
  console.log('Arguments:');
  console.log('  STAGE          Deployment stage (default: from .env.local or \'dev\')');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/deploy.js              # Deploy using stage from .env.local');
  console.log('  node scripts/deploy.js dev          # Deploy to dev stage');
  console.log('  node scripts/deploy.js staging      # Deploy to staging stage');
  console.log('  node scripts/deploy.js production   # Deploy to production stage');
}

// Main function
async function main() {
  let stage = '';
  let verbose = false;
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        showUsage();
        process.exit(0);
        break;
      case '-v':
      case '--verbose':
        verbose = true;
        break;
      default:
        if (arg.startsWith('-')) {
          printError(`Unknown option: ${arg}`);
          showUsage();
          process.exit(1);
        } else {
          stage = arg;
        }
        break;
    }
  }
  
  try {
    // Use stage from .env.local if not specified
    if (!stage) {
      stage = process.env.STAGE || 'dev';
      printStatus(`Using stage from .env.local: ${stage}`);
    }

    // Set AWS region if specified
    if (process.env.AWS_REGION) {
      process.env.AWS_DEFAULT_REGION = process.env.AWS_REGION;
      printStatus(`Using AWS region: ${process.env.AWS_REGION}`);
    }

    // Set AWS profile if specified
    if (process.env.AWS_PROFILE) {
      printStatus(`Using AWS profile: ${process.env.AWS_PROFILE}`);
    }

    // Deploy
    await runServerlessDeploy(stage, verbose);

  } catch (error) {
    printError(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}
