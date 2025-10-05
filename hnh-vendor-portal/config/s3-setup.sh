#!/bin/bash

# HashNHedge S3 Setup Script
# Creates S3 buckets for vendor document storage

echo "📦 Setting up AWS S3 for HashNHedge..."

# Configuration
BUCKET_NAME="hashnhedge-vendor-documents"
REGION="us-east-1"  # Change as needed

# Create S3 bucket
echo "Creating S3 bucket: $BUCKET_NAME"
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION

# Enable versioning
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Enable encryption
echo "Enabling server-side encryption..."
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
echo "Blocking public access..."
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Set lifecycle policy (delete old documents after 7 years)
echo "Setting lifecycle policy..."
cat > lifecycle-policy.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldDocuments",
      "Status": "Enabled",
      "Expiration": {
        "Days": 2555
      },
      "Filter": {
        "Prefix": ""
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "Id": "MoveToGlacierAfter1Year",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ],
      "Filter": {
        "Prefix": "archive/"
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET_NAME \
  --lifecycle-configuration file://lifecycle-policy.json

# Set CORS policy (for direct browser uploads)
echo "Setting CORS policy..."
cat > cors-policy.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://hashnhedge.com", "https://*.hashnhedge.com"],
      "AllowedMethods": ["PUT", "POST", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket $BUCKET_NAME \
  --cors-configuration file://cors-policy.json

# Create folder structure
echo "Creating folder structure..."
aws s3api put-object --bucket $BUCKET_NAME --key vendors/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key vendors/w9/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key vendors/insurance/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key vendors/licenses/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key vendors/other/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key jobs/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key jobs/inputs/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key jobs/outputs/ --content-length 0
aws s3api put-object --bucket $BUCKET_NAME --key archive/ --content-length 0

# Create IAM policy for application access
echo "Creating IAM policy..."
cat > s3-app-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowVendorDocumentAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ]
    },
    {
      "Sid": "AllowPresignedURLGeneration",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::$BUCKET_NAME/vendors/*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name HashNHedgeS3Access \
  --policy-document file://s3-app-policy.json

# Create IAM user for application
echo "Creating IAM user..."
aws iam create-user --user-name hashnhedge-app

# Attach policy to user
echo "Attaching policy to user..."
POLICY_ARN=$(aws iam list-policies --query 'Policies[?PolicyName==`HashNHedgeS3Access`].Arn' --output text)
aws iam attach-user-policy \
  --user-name hashnhedge-app \
  --policy-arn $POLICY_ARN

# Create access keys
echo "Creating access keys..."
aws iam create-access-key --user-name hashnhedge-app > access-keys.json

ACCESS_KEY_ID=$(cat access-keys.json | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(cat access-keys.json | jq -r '.AccessKey.SecretAccessKey')

# Save to environment file
cat > .env.s3 <<EOF
# AWS S3 Configuration
AWS_REGION=$REGION
AWS_S3_BUCKET=$BUCKET_NAME
AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY

# S3 URLs
S3_VENDOR_DOCUMENTS_PATH=vendors/
S3_JOB_INPUTS_PATH=jobs/inputs/
S3_JOB_OUTPUTS_PATH=jobs/outputs/

# DO NOT COMMIT THIS FILE TO GIT
EOF

# Create S3 bucket policy for CloudFront (optional)
cat > bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

# Clean up temp files
rm -f lifecycle-policy.json cors-policy.json s3-app-policy.json access-keys.json bucket-policy.json

echo ""
echo "✅ S3 setup complete!"
echo ""
echo "📦 Bucket created: $BUCKET_NAME"
echo "🔐 Encryption: Enabled (AES-256)"
echo "📋 Versioning: Enabled"
echo "🚫 Public access: Blocked"
echo ""
echo "📝 Credentials saved to .env.s3"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Add .env.s3 to .gitignore"
echo "   2. Store credentials in Vault: vault kv put hashnhedge/aws access_key=$ACCESS_KEY_ID secret_key=$SECRET_ACCESS_KEY"
echo "   3. Set up CloudFront distribution for secure document delivery (optional)"
echo "   4. Configure S3 event notifications for document processing (optional)"
echo ""
echo "📊 S3 Console: https://$REGION.console.aws.amazon.com/s3/buckets/$BUCKET_NAME"
