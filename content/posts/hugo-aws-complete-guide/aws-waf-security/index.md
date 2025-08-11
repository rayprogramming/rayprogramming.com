---
title: "Part 3: Security and WAF - Complete Hugo on AWS Guide"
date: 2025-09-15T08:00:00-06:00
publishDate: 2025-09-15T08:00:00-06:00
description: "Secure your Hugo site with AWS WAF, DDoS protection, and security headers for production-grade web application security."
categories:
  - devops
  - terraform
  - aws
  - security
tags:
  - AWS WAF
  - Security
  - DDoS Protection
  - Rate Limiting
  - Infrastructure as Code
menu:
  sidebar:
    name: "Part 3: WAF Security"
    identifier: hugo-aws-waf
    parent: hugo-aws-guide
    weight: 4
---

In [Part 2](../aws-infrastructure/), we set up a production-ready hosting infrastructure with CloudFront and Route 53. While CloudFront provides some built-in DDoS protection, adding AWS WAF (Web Application Firewall) gives us granular control over traffic filtering, rate limiting, and protection against common web attacks. In this part, we'll implement comprehensive security measures for your Hugo site.

> This is **Part 3** of our [Complete Guide to Hugo on AWS](../). Make sure you've completed [Part 2: AWS Infrastructure](../aws-infrastructure/) first.

## Why use AWS WAF?

Even though Hugo generates static sites, they can still be targets for various attacks:

- **🛡️ DDoS protection**: Rate limiting prevents overwhelming your CloudFront distribution
- **🚫 Bot blocking**: Filter out malicious crawlers and scrapers
- **🌍 Geographic filtering**: Block traffic from specific countries if needed
- **📊 Traffic analysis**: Detailed logging and monitoring of blocked requests
- **💰 Cost protection**: Prevent unexpected CloudFront charges from traffic spikes
- **🔍 Real-time monitoring**: Get alerts when attacks are detected

## WAF architecture overview

Our WAF setup will include:

1. **Rate limiting rules** to prevent traffic spikes
2. **IP reputation lists** to block known bad actors
3. **Geographic restrictions** (optional)
4. **Custom IP allowlists/blocklists**
5. **Logging and monitoring** for security events
6. **CloudWatch alarms** for automated alerting

## Setting up AWS WAF

AWS WAF v2 (WAFV2) integrates seamlessly with CloudFront. Let's add WAF protection to our existing infrastructure.

### Basic WAF configuration

First, create the WAF WebACL:

```hcl
resource "aws_wafv2_web_acl" "main" {
  provider = aws.us_east_1  # WAF for CloudFront must be in us-east-1
  
  name  = "${local.domain_name}-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }

  # Rule 1: Rate limiting
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000  # requests per 5-minute period
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.domain_name}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS IP Reputation List
  rule {
    name     = "AWSIPReputationList"
    priority = 2

    action {
      block {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.domain_name}-ip-reputation"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Known Bad Inputs
  rule {
    name     = "AWSKnownBadInputs"
    priority = 3

    action {
      block {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.domain_name}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Core Rule Set (OWASP)
  rule {
    name     = "AWSCoreRuleSet"
    priority = 4

    action {
      block {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that might block legitimate Hugo requests
        excluded_rule {
          name = "SizeRestrictions_BODY"
        }
        excluded_rule {
          name = "GenericRFI_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.domain_name}-core-rules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.domain_name}-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${local.domain_name}-waf"
    Environment = "production"
  }
}
```

### Optional: Geographic restrictions

If you want to restrict access based on geographic location:

```hcl
resource "aws_wafv2_web_acl" "main" {
  # ... previous configuration ...

  # Rule 5: Geographic restrictions (optional)
  rule {
    name     = "GeoRestriction"
    priority = 5

    action {
      block {}
    }

    statement {
      geo_match_statement {
        # Block these country codes (example: high-risk countries)
        country_codes = ["CN", "RU", "KP"]  # China, Russia, North Korea
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.domain_name}-geo-block"
      sampled_requests_enabled   = true
    }
  }
}
```

### Custom IP sets for allow/block lists

Create IP sets for custom allow and block lists:

```hcl
# IP set for allowlisted IPs (always allow)
resource "aws_wafv2_ip_set" "allowlist" {
  provider = aws.us_east_1
  
  name               = "${local.domain_name}-allowlist"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"

  # Add your office/home IP addresses here
  addresses = [
    "203.0.113.0/32",  # Example IP - replace with your actual IPs
    "198.51.100.0/24", # Example subnet
  ]

  tags = {
    Name = "${local.domain_name}-allowlist"
  }
}

# IP set for blocklisted IPs (always block)
resource "aws_wafv2_ip_set" "blocklist" {
  provider = aws.us_east_1
  
  name               = "${local.domain_name}-blocklist"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"

  # Add malicious IP addresses here
  addresses = [
    # Will be populated as needed
  ]

  tags = {
    Name = "${local.domain_name}-blocklist"
  }
}

# Add allowlist rule to WAF (highest priority)
resource "aws_wafv2_web_acl" "main" {
  # ... add this rule at priority 0 ...

  rule {
    name     = "AllowlistRule"
    priority = 0

    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.allowlist.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.domain_name}-allowlist"
      sampled_requests_enabled   = true
    }
  }

  # Add blocklist rule
  rule {
    name     = "BlocklistRule"
    priority = 1

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.blocklist.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.domain_name}-blocklist"
      sampled_requests_enabled   = true
    }
  }
}
```

### Attach WAF to CloudFront

Update your CloudFront distribution to use the WAF:

```hcl
resource "aws_cloudfront_distribution" "main" {
  # ... existing configuration ...

  web_acl_id = aws_wafv2_web_acl.main.arn

  # ... rest of configuration ...
}
```

## WAF logging

Enable detailed logging for security analysis:

```hcl
# S3 bucket for WAF logs
resource "aws_s3_bucket" "waf_logs" {
  bucket = "${local.domain_name}-waf-logs"

  tags = {
    Name        = "${local.domain_name}-waf-logs"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "waf_logs" {
  bucket = aws_s3_bucket.waf_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "waf_logs" {
  bucket = aws_s3_bucket.waf_logs.id

  rule {
    id     = "delete_old_logs"
    status = "Enabled"

    expiration {
      days = 90  # Keep logs for 90 days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# WAF logging configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  provider = aws.us_east_1
  
  resource_arn            = aws_wafv2_web_acl.main.arn
  log_destination_configs = [aws_s3_bucket.waf_logs.arn]

  redacted_field {
    single_header {
      name = "authorization"
    }
  }

  redacted_field {
    single_header {
      name = "cookie"
    }
  }
}
```

## CloudWatch monitoring and alerts

Set up monitoring and alerting for security events:

```hcl
# CloudWatch alarm for high rate limiting
resource "aws_cloudwatch_metric_alarm" "rate_limit_alarm" {
  alarm_name          = "${local.domain_name}-waf-rate-limit"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "${local.domain_name}-rate-limit"
  namespace           = "AWS/WAFV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "This metric monitors WAF rate limiting blocks"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Rule   = "RateLimitRule"
  }
}

# CloudWatch alarm for IP reputation blocks
resource "aws_cloudwatch_metric_alarm" "ip_reputation_alarm" {
  alarm_name          = "${local.domain_name}-waf-ip-reputation"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "${local.domain_name}-ip-reputation"
  namespace           = "AWS/WAFV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors WAF IP reputation blocks"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Rule   = "AWSIPReputationList"
  }
}

# SNS topic for security alerts
resource "aws_sns_topic" "security_alerts" {
  name = "${local.domain_name}-security-alerts"

  tags = {
    Name = "${local.domain_name}-security-alerts"
  }
}

# SNS topic subscription (replace with your email)
resource "aws_sns_topic_subscription" "security_alerts_email" {
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = "your-email@example.com"
}
```

## Cost optimization for WAF

WAF pricing is based on Web ACLs, rules, and requests processed. Here are some optimization tips:

```hcl
# Output estimated monthly costs
output "waf_cost_estimate" {
  description = "Estimated monthly WAF costs"
  value = <<EOF
WAF Web ACL: $1.00/month
WAF Rules: $1.00/month per rule (${length(aws_wafv2_web_acl.main.rule)} rules = $${length(aws_wafv2_web_acl.main.rule)}.00)
WAF Requests: $0.60 per million requests
Estimated total: $${1 + length(aws_wafv2_web_acl.main.rule)}.60/month + $0.60 per million requests
EOF
}
```

## Testing your WAF setup

After deploying WAF, test your security rules:

1. **Rate limiting test**: Use tools like `ab` (Apache Bench) to simulate high traffic:
   ```bash
   ab -n 3000 -c 50 https://your-domain.com/
   ```

2. **Check CloudWatch metrics**: Monitor the WAF dashboard in CloudWatch

3. **Review WAF logs**: Check S3 for detailed request logs

4. **Test geographic blocking**: Use a VPN to test from blocked countries

5. **Verify allowlist**: Confirm your IP addresses bypass rate limiting

## Troubleshooting common issues

### False positives
If legitimate traffic is being blocked:

```hcl
# Add exceptions to managed rule groups
statement {
  managed_rule_group_statement {
    name        = "AWSManagedRulesCommonRuleSet"
    vendor_name = "AWS"

    excluded_rule {
      name = "RuleCausingFalsePositives"
    }
  }
}
```

### High costs
Monitor WAF usage in CloudWatch and adjust rules if costs are too high.

### Performance impact
WAF adds minimal latency (~1-2ms) but monitor CloudFront performance metrics.

## What's next?

You now have comprehensive security protection for your Hugo site! Your infrastructure includes DDoS protection, rate limiting, and monitoring for malicious traffic.

In [Part 4: Monitoring and Operations](../monitoring-operations/), we'll add:
- Comprehensive monitoring dashboards
- Real User Monitoring (RUM)
- Performance optimization
- Automated health checks

---

## Series Navigation

📚 **Complete Hugo on AWS Guide**
- [Overview & Setup](../)
- [Part 1: GitHub Actions CI/CD](../github-actions-cicd/)
- [Part 2: AWS Infrastructure](../aws-infrastructure/)  
- **Part 3: AWS WAF Security** ← You are here
- [Part 4: Monitoring & Operations](../monitoring-operations/)

---

## Security best practices

- **Regular review**: Periodically review WAF logs and adjust rules
- **Keep updated**: AWS regularly updates managed rule groups
- **Monitor costs**: Set up billing alerts for unexpected WAF charges  
- **Test changes**: Always test WAF rules in a staging environment first
- **Document exceptions**: Keep track of why certain rules are excluded

Continue to **[Part 4: Monitoring & Operations](../monitoring-operations/)** →

Your Hugo site now has enterprise-grade security protection! 🛡️
