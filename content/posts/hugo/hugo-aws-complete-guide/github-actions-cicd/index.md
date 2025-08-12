---
title: "Part 1: CI/CD Pipeline with GitHub Actions"
date: 2025-09-01T08:00:00-06:00
publishDate: 2025-09-01T08:00:00-06:00
description: "Set up automated Hugo deployments with GitHub Actions and AWS OIDC for secure, keyless authentication."
categories:
  - devops
  - terraform
  - blog
tags:
  - GitHub Actions
  - Continuous Delivery
  - Infrastructure as Code
  - AWS OIDC
weight: 2
menu:
  sidebar:
    name: "Part 1: CI/CD Pipeline"
    identifier: hugo-aws-cicd
    parent: hugo-aws-guide
---

Building and deploying a static site with [Hugo](https://gohugo.io/) can be as simple as running a couple of commands on your local machine. But if you want to publish updates frequently, automate your workflow, and avoid the possibility of human error, a continuous integration/continuous delivery (CI/CD) pipeline is essential. In this first part of our comprehensive guide, we'll set up GitHub Actions to automatically build and deploy your Hugo site to AWS S3 using [Terraform](https://www.terraform.io/) for infrastructure management and AWS OIDC for secure, keyless authentication.

> This is **Part 1** of our [Complete Guide to Hugo on AWS](../). Make sure to check out the [overview](../) for the full architecture and roadmap.

## Why automate your Hugo deployment?

Manual deployments are fine for hobby projects, but as your site grows you may find yourself juggling different versions of Hugo, copying files to a server, invalidating caches, and double‑checking permissions. Automating the build and deploy process ensures that:

- **Every change is tested and built consistently**. If it works in CI, it will work in production.
- **Infrastructure changes are version controlled**. Terraform configuration can be reviewed via pull requests just like your content and code.
- **Security is enhanced with OIDC**. Instead of long-lived AWS access keys, GitHub Actions can authenticate with AWS using short-lived tokens through OpenID Connect (OIDC), eliminating the risk of credential exposure.
- **Scheduled publishing becomes effortless**. Using Hugo's `publishDate` frontmatter, you can write posts in advance and have them automatically published at specific times when GitHub Actions runs your deployment pipeline.

## Prerequisites

To follow along, you should have:

1. A Hugo site stored in a GitHub repository
2. An AWS account with permissions to create S3 buckets, IAM roles, and OIDC providers
3. Terraform installed locally for initial infrastructure bootstrapping

We'll create the necessary AWS infrastructure including an OIDC identity provider, IAM roles for GitHub Actions, and S3 buckets for both the site files and Terraform state.

## Setting up AWS OIDC for GitHub Actions

Before diving into the Hugo-specific infrastructure, we need to establish trust between GitHub Actions and AWS using OIDC. This approach is more secure than using long-lived access keys because it uses short-lived tokens that are automatically rotated.

First, create the GitHub OIDC identity provider in AWS:

```hcl
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
  
  client_id_list = [
    "sts.amazonaws.com",
  ]
}
```

> **Note**: As of July 2023, the `thumbprint_list` parameter is no longer required for GitHub Actions OIDC integration. AWS now automatically manages certificate validation for GitHub's OIDC provider. See the [GitHub changelog](https://github.blog/changelog/2023-07-13-github-actions-oidc-integration-with-aws-no-longer-requires-pinning-of-intermediate-tls-certificates/) for more details.

Next, create an IAM role that GitHub Actions can assume. This role will be restricted to only your specific repository and branch:

```hcl
resource "aws_iam_role" "hugo_deploy" {
  name = "hugo_deploy"
  path = "/service/personal/"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
            "token.actions.githubusercontent.com:sub" = "repo:your-username/your-repo:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}
```

Create a policy that grants the necessary permissions for Hugo deployment to S3:

```hcl
resource "aws_iam_policy" "hugo_deploy" {
  name        = "hugo_deploy"
  path        = "/service/personal/"
  description = "Policy for deploying Hugo site to S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Operations"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "s3:PutObjectAcl"
        ]
        Resource = [
          "arn:aws:s3:::your-domain.com",
          "arn:aws:s3:::your-domain.com/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "hugo_deploy" {
  role       = aws_iam_role.hugo_deploy.name
  policy_arn = aws_iam_policy.hugo_deploy.arn
}
```

## Bootstrapping AWS resources with Terraform

First, define the Terraform providers and backend. Store your state in a dedicated bucket to keep configuration changes consistent across machines:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "hugo-site/terraform.tfstate"
    region = "us-east-2"
  }
}

provider "aws" {
  region = "us-east-2"
}
```

Create the S3 bucket for your website with proper versioning and security settings:

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "your-domain.com"
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

> **Note**: Since your Hugo site is already version-controlled with Git, S3 bucket versioning may be redundant for personal sites. You can set `status = "Disabled"` if you prefer to rely solely on Git for version history and want to avoid additional S3 storage costs.

Output the IAM role ARN that you'll need for GitHub Actions:

```hcl
output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions"
  value       = aws_iam_role.hugo_deploy.arn
}
```

Run `terraform init` and `terraform apply` to create the resources. Make note of the role ARN from the output—you'll need it for the GitHub Actions configuration.

## Configuring GitHub Actions

Create a file named `.github/workflows/deploy.yaml` in your repository. This workflow will build your Hugo site and deploy it using OIDC authentication—no long-lived AWS credentials required!

```yaml
name: Deploy Hugo site

on:
  push:
    branches: [ main ]
  schedule:
    # Run daily at 10 AM UTC to catch any scheduled posts
    - cron: '0 10 * * *'

permissions:
  id-token: write   # Required for OIDC
  contents: read    # Required to checkout code

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Check out source
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/service/personal/hugo_deploy
          aws-region: us-east-2

      - name: Set up Hugo
        uses: noesya/actions-hugo@release
        with:
          hugo-version: 'latest'
          extended: true
          withdeploy: true

      - name: Build
        run: hugo --minify

      - name: Deploy to S3
        run: |
          hugo deploy --maxDeletes -1
```

> **Important**: We're using `noesya/actions-hugo@release` instead of the more common `peaceiris/actions-hugo` because the peaceiris action doesn't support Hugo's deploy functionality. The `withdeploy: true` parameter ensures Hugo is built with deploy support, which is required for the `hugo deploy` command to work with S3.

Notice how we're using the `aws-actions/configure-aws-credentials` action with OIDC instead of hardcoded access keys. The `permissions` section is crucial—it grants the workflow the ability to request an identity token that AWS can verify.

## Configuring Hugo for AWS deployment

Create or update your Hugo configuration file (`config.toml` or `hugo.toml`) to include deployment settings:

```toml
[deployment]
[[deployment.targets]]
URL = "s3://your-domain.com?region=us-east-2"

[[deployment.matchers]]
# Cache static assets for 1 year.
pattern = "^.+\\.(js|css|svg|ttf)$"
cacheControl = "max-age=31536000, no-transform, public"
gzip = true

[[deployment.matchers]]
pattern = "^.+\\.(png|jpg|jpeg|webp)$"
cacheControl = "max-age=31536000, no-transform, public"
gzip = false

[[deployment.matchers]]
# Set custom content type for /sitemap.xml
pattern = "^sitemap\\.xml$"
contentType = "application/xml"
gzip = true

[[deployment.matchers]]
pattern = "^.+\\.(html|xml|json)$"
gzip = true
```

This configuration tells Hugo how to deploy your site to S3 and automatically compress appropriate files with gzip.

## Security benefits of OIDC

Using OIDC provides several security advantages over traditional access keys:

- **No long-lived credentials**: Tokens are automatically rotated and expire quickly
- **Repository-specific trust**: The IAM role can only be assumed from your specific repository and branch
- **Audit trail**: AWS CloudTrail shows exactly which GitHub Actions runs assumed the role
- **Reduced attack surface**: No secrets to steal, rotate, or accidentally commit to your repository

## Testing your deployment

After setting everything up:

1. **Commit and push** your changes to trigger the GitHub Actions workflow
2. **Monitor the workflow** in the GitHub Actions tab of your repository
3. **Verify S3 deployment** by checking your S3 bucket for the uploaded files
4. **Test the site** by accessing your S3 bucket's website endpoint (if configured)

## Troubleshooting

If your deployment fails, check these common issues:

1. **OIDC trust relationship**: Ensure the repository name and branch in the IAM role's trust policy exactly match your GitHub repository
2. **Permissions**: Verify that the IAM policy includes all necessary S3 permissions
3. **Hugo configuration**: Double-check your deployment target URL
4. **GitHub Actions permissions**: Make sure your workflow has `id-token: write` permissions

## What's next?

You now have a functional CI/CD pipeline that automatically deploys your Hugo site to S3! However, your site is only accessible via the S3 website endpoint and doesn't have a custom domain or SSL certificate.

In [Part 2: Complete AWS Infrastructure](../aws-infrastructure/), we'll set up:
- Route 53 for custom domain management
- CloudFront for global content delivery and SSL
- Advanced caching strategies
- Performance optimization

---

## Series Navigation

📚 **Complete Hugo on AWS Guide**
- [Overview & Setup](../)
- **Part 1: GitHub Actions CI/CD** ← You are here
- [Part 2: AWS Infrastructure](../aws-infrastructure/)  
- [Part 3: AWS WAF Security](../aws-waf-security/)
- [Part 4: Monitoring & Operations](../monitoring-operations/)

---

Continue to **[Part 2: Complete AWS Infrastructure](../aws-infrastructure/)** →
