#!/bin/bash

# Create the bucket directory if it doesn't exist
mkdir -p .bucket

# Sync the bucket to the local directory
aws s3 sync s3://${S3_BUCKET_NAME} .bucket
