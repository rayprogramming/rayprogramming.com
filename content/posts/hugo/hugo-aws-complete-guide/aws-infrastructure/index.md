---
title: "Part 2: Complete AWS Infrastructure"
date: 2025-09-08T08:00:00-06:00
publishDate: 2025-09-08T08:00:00-06:00
description: "Set up Route 53, CloudFront, SSL certificates, and advanced caching for production-grade Hugo hosting on AWS."
categories:
  - devops
  - terraform
  - aws
  - blog
tags:
  - Route 53
  - CloudFront
  - S3
  - SSL/TLS
  - Infrastructure as Code
  - CDN
weight: 3
menu:
  sidebar:
    name: "Part 2: AWS Infrastructure"
    identifier: hugo-aws-infra
    parent: hugo-aws-guide
---

In [Part 1](../github-actions-cicd/), we set up automated deployments to S3. While functional, your site is still missing crucial production features: a custom domain, SSL certificate, and global content delivery. In this part, we'll complete the AWS infrastructure stack using Terraform to create a professional, high-performance hosting solution.

> This is **Part 2** of our [Complete Guide to Hugo on AWS](../). Make sure you've completed [Part 1: CI/CD Pipeline](../github-actions-cicd/) first.

## Why CloudFront and Route 53?

While you can serve a Hugo site directly from S3, using CloudFront and Route 53 provides significant benefits:

- **🌍 Global performance**: CloudFront's edge locations serve content from the closest geographic location to users
- **🔒 SSL/TLS encryption**: Automatic HTTPS with certificates from AWS Certificate Manager
- **🏷️ Custom domains**: Professional URLs instead of S3 bucket URLs
- **⚡ Advanced caching**: Fine-grained control over cache behavior for different content types
- **🛡️ DDoS protection**: Built-in protection against distributed denial-of-service attacks
- **💰 Cost optimization**: CloudFront can reduce S3 data transfer costs for high-traffic sites

## Architecture overview

Our complete setup will include:

1. **Route 53 hosted zone** for DNS management
2. **ACM SSL certificate** for HTTPS encryption
3. **S3 bucket** for static file storage (from Part 1)
4. **CloudFront distribution** for global content delivery
5. **Origin Access Control (OAC)** for secure S3 access
6. **Updated IAM policies** for CloudFront invalidation

## Prerequisites

Before starting, ensure you have:

1. Completed [Part 1: CI/CD Pipeline](../github-actions-cicd/)
2. A domain name that you can configure DNS for
3. The existing Terraform state from Part 1

## Setting up the complete infrastructure

Let's extend our Terraform configuration from Part 1. Update your providers to include the us-east-1 region (required for CloudFront certificates):

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "hugo-infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

# CloudFront requires certificates to be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "aws" {
  region = "us-east-2"
}

locals {
  domain_name = "example.com"
  bucket_name = "example.com"
}
```

### Route 53 hosted zone

First, create the Route 53 hosted zone for your domain:

```hcl
resource "aws_route53_zone" "main" {
  name = local.domain_name

  tags = {
    Name        = local.domain_name
    Environment = "production"
  }
}

# Output the name servers for domain configuration
output "name_servers" {
  description = "Name servers for the domain"
  value       = aws_route53_zone.main.name_servers
}
```

### ACM SSL certificate

Create an SSL certificate with both the root domain and www subdomain:

```hcl
resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = local.domain_name
  subject_alternative_names = ["www.${local.domain_name}"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = local.domain_name
  }
}

# DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

### S3 bucket configuration

Update your S3 bucket from Part 1 with additional security settings:

```hcl
resource "aws_s3_bucket" "website" {
  bucket = local.bucket_name

  tags = {
    Name        = local.bucket_name
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
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

### CloudFront distribution

Create a CloudFront distribution with Origin Access Control for secure S3 access:

```hcl
# Origin Access Control for CloudFront
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = local.domain_name
  description                       = "OAC for ${local.domain_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
    origin_id                = "S3-${local.bucket_name}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [local.domain_name, "www.${local.domain_name}"]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${local.bucket_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern           = "*.css"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${local.bucket_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 31536000
    default_ttl = 31536000
    max_ttl     = 31536000
  }

  ordered_cache_behavior {
    path_pattern           = "*.js"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${local.bucket_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 31536000
    default_ttl = 31536000
    max_ttl     = 31536000
  }

  # Custom error pages
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  price_class = "PriceClass_100"  # Use only North America and Europe edge locations

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = local.domain_name
    Environment = "production"
  }
}
```

### S3 bucket policy for CloudFront

Allow CloudFront to access your S3 bucket:

```hcl
data "aws_iam_policy_document" "website_bucket_policy" {
  statement {
    sid       = "AllowCloudFrontServicePrincipal"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.website.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = data.aws_iam_policy_document.website_bucket_policy.json
}
```

### Route 53 DNS records

Create DNS records pointing to your CloudFront distribution:

```hcl
# Root domain A record
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# WWW subdomain A record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${local.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

### Output important values

```hcl
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.website.bucket
}

output "website_url" {
  description = "Website URL"
  value       = "https://${local.domain_name}"
}
```

## Updating IAM permissions for CloudFront

Now that you have CloudFront set up, you need to add CloudFront invalidation permissions to your deployment policy from Part 1:

```hcl
resource "aws_iam_policy" "hugo_deploy" {
  name        = "hugo_deploy"
  path        = "/service/personal/"
  description = "Policy for deploying Hugo site to S3 and invalidating CloudFront"

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
          "arn:aws:s3:::${local.bucket_name}",
          "arn:aws:s3:::${local.bucket_name}/*"
        ]
      },
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = [
          aws_cloudfront_distribution.main.arn
        ]
      }
    ]
  })
}
```

## Deploying the infrastructure

1. **Update your variables**: Replace `example.com` with your actual domain name in the `locals` block.

2. **Initialize and apply Terraform**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

3. **Configure your domain**: After Terraform completes, note the name servers from the output and configure them with your domain registrar.

4. **Update your Hugo configuration**: Modify your `config.toml` to use CloudFront invalidation:
   ```toml
   [deployment]
   [[deployment.targets]]
   URL = "s3://your-domain.com?region=us-east-2"
   cloudFrontDistributionID = "YOUR_DISTRIBUTION_ID"
   ```

## Testing your setup

After deployment, test your infrastructure:

1. **DNS propagation**: Use `dig` or online tools to verify your DNS records point to CloudFront
2. **SSL certificate**: Visit your site and verify the SSL certificate is valid
3. **Cache behavior**: Check that static assets receive long cache headers
4. **Global performance**: Test your site speed from different geographic locations

## Performance optimization tips

- **Enable Gzip compression** in CloudFront for text-based content
- **Use appropriate cache TTLs** for different content types
- **Consider using CloudFront functions** for redirects and header modifications
- **Monitor CloudWatch metrics** to optimize cache hit ratios
- **Use Route 53 health checks** for uptime monitoring

## Cost considerations

This setup includes several AWS services with different pricing models:

- **Route 53**: $0.50/month per hosted zone + query charges
- **CloudFront**: Free tier includes 1TB data transfer and 10M requests
- **S3**: Storage costs are minimal for static sites
- **ACM**: SSL certificates are free when used with CloudFront

## What's next?

You now have a production-ready Hugo hosting solution with custom domain, SSL, and global CDN! However, we haven't yet implemented security protections against malicious traffic.

In [Part 3: Security with AWS WAF](../aws-waf-security/), we'll add:
- AWS WAF for web application protection
- Rate limiting and DDoS protection
- IP allowlists/blocklists
- Security monitoring and alerting

---

## Series Navigation

📚 **Complete Hugo on AWS Guide**
- [Overview & Setup](../)
- [Part 1: GitHub Actions CI/CD](../github-actions-cicd/)
- **Part 2: AWS Infrastructure** ← You are here
- [Part 3: AWS WAF Security](../aws-waf-security/)
- [Part 4: Monitoring & Operations](../monitoring-operations/)

---

Continue to **[Part 3: Security with AWS WAF](../aws-waf-security/)** →
