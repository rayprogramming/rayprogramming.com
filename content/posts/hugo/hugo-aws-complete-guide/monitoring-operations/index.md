---
title: "Part 4: Monitoring and Operations - Complete Hugo on AWS Guide"
date: 2025-09-22T08:00:00-06:00
publishDate: 2025-09-22T08:00:00-06:00
description: "Set up comprehensive monitoring, alerting, and performance optimization for your Hugo site on AWS with CloudWatch, Real User Monitoring, and automated health checks."
categories:
  - devops
  - terraform
  - aws
  - monitoring
tags:
  - CloudWatch
  - Real User Monitoring
  - Performance
  - Alerting
  - AWS Lambda
  - SNS
weight: 5
menu:
  sidebar:
    parent: hugo-aws-guide
    name: "Part 4: Monitoring"
---

In this final part of our Hugo on AWS series, we'll implement comprehensive monitoring and operational excellence practices. After building your CI/CD pipeline, infrastructure, and security layer, it's crucial to have visibility into your site's performance, availability, and user experience.

## What We'll Build

By the end of this guide, you'll have:

- **📊 CloudWatch Dashboards** for infrastructure and application metrics
- **🔔 Intelligent Alerting** for availability and performance issues  
- **👥 Real User Monitoring** to understand actual user experience
- **🏥 Automated Health Checks** with multi-region monitoring
- **⚡ Performance Optimization** based on data-driven insights
- **💰 Cost Monitoring** and budget alerts

## Architecture Overview

{{< plantuml alt="Hugo AWS Monitoring Architecture" >}}
@startuml Hugo AWS Monitoring Architecture

!define AWSPuml https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v20.0/dist
!includeurl AWSPuml/AWSCommon.puml
!includeurl AWSPuml/ManagementGovernance/CloudWatch.puml
!includeurl AWSPuml/Compute/Lambda.puml
!includeurl AWSPuml/ApplicationIntegration/SimpleNotificationService.puml
!includeurl AWSPuml/NetworkingContentDelivery/CloudFront.puml
!includeurl AWSPuml/Storage/SimpleStorageServiceBucket.puml

skinparam backgroundColor #FFFFFF

CloudWatch(cw, "CloudWatch", "Metrics & Logs")
Lambda(lambda, "Health Check\nLambda", "Synthetic Monitoring")
SimpleNotificationService(sns, "SNS", "Alerting")
CloudFront(cf, "CloudFront", "CDN")
SimpleStorageServiceBucket(s3, "S3 Bucket", "Static Assets")

actor "Users" as users
actor "DevOps Team" as team

users --> cf: Browse site
cf --> s3: Fetch content
cf --> cw: Metrics
lambda --> cf: Health checks
lambda --> cw: Custom metrics
cw --> sns: Trigger alerts
sns --> team: Notifications

note right of cw
  - Response times
  - Error rates
  - Cache hit ratios
  - Custom business metrics
end note

note right of lambda
  - Multi-region checks
  - Content validation
  - Performance testing
  - SLA monitoring
end note

@enduml
{{< /plantuml >}}

## Step 1: CloudWatch Dashboards

### Infrastructure Monitoring Dashboard

First, let's create a comprehensive dashboard to monitor our infrastructure components.

```hcl {linenos=inline}
# terraform/monitoring.tf

resource "aws_cloudwatch_dashboard" "hugo_site" {
  dashboard_name = "${var.project_name}-infrastructure"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "BytesDownloaded", ".", "."],
            [".", "BytesUploaded", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "CloudFront Traffic"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "CacheHitRate", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "OriginLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "CloudFront Performance"
          period  = 300
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/S3", "BucketRequests", "BucketName", aws_s3_bucket.main.bucket, "FilterId", "EntireBucket"],
            [".", "AllRequests", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "S3 Requests"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/WAFv2", "AllowedRequests", "WebACL", aws_wafv2_web_acl.main.name, "Region", "CloudFront", "Rule", "ALL"],
            [".", "BlockedRequests", ".", ".", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = "us-east-1" # WAF for CloudFront is always in us-east-1
          title   = "WAF Activity"
          period  = 300
        }
      }
    ]
  })
}
```

### Custom Metrics for Business Intelligence

Create custom metrics to track business-specific KPIs:

```hcl {linenos=inline}
resource "aws_lambda_function" "custom_metrics" {
  filename         = "custom_metrics.zip"
  function_name    = "${var.project_name}-custom-metrics"
  role            = aws_iam_role.lambda_metrics.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 60

  environment {
    variables = {
      CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.main.id
      SITE_DOMAIN               = var.domain_name
    }
  }
}

# Schedule the function to run every 5 minutes
resource "aws_cloudwatch_event_rule" "custom_metrics_schedule" {
  name                = "${var.project_name}-custom-metrics"
  description         = "Trigger custom metrics collection"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.custom_metrics_schedule.name
  target_id = "CustomMetricsLambdaTarget"
  arn       = aws_lambda_function.custom_metrics.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.custom_metrics.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.custom_metrics_schedule.arn
}
```

Here's the Lambda function code for custom metrics:

```python {linenos=inline}
# custom_metrics.py
import json
import boto3
import os
from datetime import datetime, timedelta
import requests

def handler(event, context):
    cloudwatch = boto3.client('cloudwatch')
    distribution_id = os.environ['CLOUDFRONT_DISTRIBUTION_ID']
    domain = os.environ['SITE_DOMAIN']
    
    # Custom metric: Site availability
    try:
        response = requests.get(f"https://{domain}", timeout=10)
        availability = 1 if response.status_code == 200 else 0
        
        cloudwatch.put_metric_data(
            Namespace='Hugo/CustomMetrics',
            MetricData=[
                {
                    'MetricName': 'SiteAvailability',
                    'Value': availability,
                    'Unit': 'Count',
                    'Dimensions': [
                        {
                            'Name': 'Domain',
                            'Value': domain
                        }
                    ]
                }
            ]
        )
        
        # Custom metric: Response time
        response_time = response.elapsed.total_seconds() * 1000  # Convert to milliseconds
        cloudwatch.put_metric_data(
            Namespace='Hugo/CustomMetrics',
            MetricData=[
                {
                    'MetricName': 'ResponseTime',
                    'Value': response_time,
                    'Unit': 'Milliseconds',
                    'Dimensions': [
                        {
                            'Name': 'Domain',
                            'Value': domain
                        }
                    ]
                }
            ]
        )
        
    except Exception as e:
        print(f"Error checking site availability: {str(e)}")
        
        # Report failure
        cloudwatch.put_metric_data(
            Namespace='Hugo/CustomMetrics',
            MetricData=[
                {
                    'MetricName': 'SiteAvailability',
                    'Value': 0,
                    'Unit': 'Count',
                    'Dimensions': [
                        {
                            'Name': 'Domain',
                            'Value': domain
                        }
                    ]
                }
            ]
        )
    
    return {
        'statusCode': 200,
        'body': json.dumps('Custom metrics updated successfully')
    }
```

## Step 2: Intelligent Alerting

### Critical Alerts

Set up alerts for critical issues that require immediate attention:

```hcl {linenos=inline}
# SNS topic for critical alerts
resource "aws_sns_topic" "critical_alerts" {
  name = "${var.project_name}-critical-alerts"
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Site down alert
resource "aws_cloudwatch_metric_alarm" "site_down" {
  alarm_name          = "${var.project_name}-site-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SiteAvailability"
  namespace           = "Hugo/CustomMetrics"
  period              = "300"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "This metric monitors site availability"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  ok_actions          = [aws_sns_topic.critical_alerts.arn]

  dimensions = {
    Domain = var.domain_name
  }

  treat_missing_data = "breaching"
}

# High error rate alert
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project_name}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"  # 5% error rate
  alarm_description   = "High 4xx error rate detected"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }
}

# Slow response time alert
resource "aws_cloudwatch_metric_alarm" "slow_response" {
  alarm_name          = "${var.project_name}-slow-response"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "ResponseTime"
  namespace           = "Hugo/CustomMetrics"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000"  # 2 seconds
  alarm_description   = "Site response time is slow"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]

  dimensions = {
    Domain = var.domain_name
  }
}
```

### Cost Monitoring

Monitor and alert on unexpected cost increases:

```hcl {linenos=inline}
resource "aws_budgets_budget" "monthly_cost" {
  name         = "${var.project_name}-monthly-budget"
  budget_type  = "COST"
  limit_amount = "10"  # $10 monthly budget
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filters = {
    Service = [
      "Amazon CloudFront",
      "Amazon Route 53",
      "Amazon Simple Storage Service",
      "AWS WAF"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80  # Alert at 80% of budget
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100  # Alert at 100% of budget
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
```

## Step 3: Real User Monitoring (RUM)

Implement CloudWatch RUM to understand real user experience:

```hcl {linenos=inline}
resource "aws_rum_app_monitor" "hugo_site" {
  name   = "${var.project_name}-rum"
  domain = var.domain_name

  app_monitor_configuration {
    allow_cookies = true
    enable_xray   = true
    session_sample_rate = 0.1  # Sample 10% of sessions

    telemetries = ["errors", "performance", "http"]
  }

  custom_events {
    status = "ENABLED"
  }

  cw_log_enabled = true
}

# IAM role for RUM
resource "aws_iam_role" "rum_role" {
  name = "${var.project_name}-rum-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rum.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rum_policy" {
  role       = aws_iam_role.rum_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchRUMServiceRolePolicy"
}
```

Add the RUM script to your Hugo site's head section:

```go-html-template {linenos=inline}
<!-- layouts/partials/custom-head.html -->
<script>
  (function(n,i,v,r,s,c,x,z){x=window.AwsRumClient={q:[],n:n,i:i,v:v,r:r,c:c};window[n]=function(c,p){x.q.push({c:c,p:p});};z=document.createElement('script');z.async=true;z.src=s;document.head.appendChild(z);})(
    'cwr',
    '{{ .Site.Params.rum_app_id }}',
    '1.0.0',
    '{{ .Site.Params.rum_region }}',
    'https://client.rum.us-east-1.amazonaws.com/1.15.0/cwr.js',
    {
      sessionSampleRate: 0.1,
      identityPoolId: '{{ .Site.Params.rum_identity_pool }}',
      endpoint: "https://dataplane.rum.{{ .Site.Params.rum_region }}.amazonaws.com",
      telemetries: ["performance","errors","http"],
      allowCookies: true,
      enableXRay: true
    }
  );
</script>
```

Configure in your Hugo config:

```toml
# config.toml
[params]
  rum_app_id = "your-rum-app-id"
  rum_region = "us-east-1"
  rum_identity_pool = "your-identity-pool-id"
```

## Step 4: Advanced Health Checks

### Multi-Region Health Monitoring

Create Lambda functions in multiple regions for comprehensive monitoring:

```hcl {linenos=inline}
# Deploy health check Lambda in multiple regions
module "health_check_us_east_1" {
  source = "./modules/health-check"
  
  region      = "us-east-1"
  domain_name = var.domain_name
  sns_topic   = aws_sns_topic.critical_alerts.arn
}

module "health_check_eu_west_1" {
  source = "./modules/health-check"
  
  region      = "eu-west-1"
  domain_name = var.domain_name
  sns_topic   = aws_sns_topic.critical_alerts.arn
}

module "health_check_ap_southeast_1" {
  source = "./modules/health-check"
  
  region      = "ap-southeast-1"
  domain_name = var.domain_name
  sns_topic   = aws_sns_topic.critical_alerts.arn
}
```

Create the health check module:

```hcl {linenos=inline}
# modules/health-check/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_lambda_function" "health_check" {
  filename         = "health_check.zip"
  function_name    = "hugo-health-check-${var.region}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 30

  environment {
    variables = {
      DOMAIN_NAME = var.domain_name
      REGION     = var.region
      SNS_TOPIC  = var.sns_topic
    }
  }
}

# Schedule health checks every minute
resource "aws_cloudwatch_event_rule" "health_check_schedule" {
  name                = "hugo-health-check-${var.region}"
  description         = "Trigger health check from ${var.region}"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.health_check_schedule.name
  target_id = "HealthCheckLambdaTarget"
  arn       = aws_lambda_function.health_check.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check_schedule.arn
}
```

Advanced health check function:

```python {linenos=inline}
# health_check.py
import json
import boto3
import requests
import os
import time
from datetime import datetime

def handler(event, context):
    cloudwatch = boto3.client('cloudwatch')
    sns = boto3.client('sns')
    
    domain = os.environ['DOMAIN_NAME']
    region = os.environ['REGION']
    sns_topic = os.environ['SNS_TOPIC']
    
    # Comprehensive health checks
    checks = {
        'availability': check_availability(domain),
        'performance': check_performance(domain),
        'content_integrity': check_content_integrity(domain),
        'ssl_certificate': check_ssl_certificate(domain)
    }
    
    # Publish metrics
    for check_name, result in checks.items():
        cloudwatch.put_metric_data(
            Namespace='Hugo/HealthCheck',
            MetricData=[
                {
                    'MetricName': f'{check_name}_status',
                    'Value': 1 if result['success'] else 0,
                    'Unit': 'Count',
                    'Dimensions': [
                        {'Name': 'Domain', 'Value': domain},
                        {'Name': 'Region', 'Value': region}
                    ]
                }
            ]
        )
        
        if 'response_time' in result:
            cloudwatch.put_metric_data(
                Namespace='Hugo/HealthCheck',
                MetricData=[
                    {
                        'MetricName': f'{check_name}_response_time',
                        'Value': result['response_time'],
                        'Unit': 'Milliseconds',
                        'Dimensions': [
                            {'Name': 'Domain', 'Value': domain},
                            {'Name': 'Region', 'Value': region}
                        ]
                    }
                ]
            )
    
    # Alert on failures
    failed_checks = [name for name, result in checks.items() if not result['success']]
    if failed_checks:
        message = f"Health check failures from {region}:\n"
        for check in failed_checks:
            message += f"- {check}: {checks[check]['error']}\n"
        
        sns.publish(
            TopicArn=sns_topic,
            Subject=f"Hugo Site Health Check Failure - {region}",
            Message=message
        )
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'region': region,
            'checks': checks,
            'timestamp': datetime.utcnow().isoformat()
        })
    }

def check_availability(domain):
    try:
        start_time = time.time()
        response = requests.get(f"https://{domain}", timeout=10)
        response_time = (time.time() - start_time) * 1000
        
        return {
            'success': response.status_code == 200,
            'response_time': response_time,
            'status_code': response.status_code
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def check_performance(domain):
    try:
        start_time = time.time()
        response = requests.get(f"https://{domain}", timeout=10)
        response_time = (time.time() - start_time) * 1000
        
        # Check if response time is acceptable (< 2 seconds)
        performance_ok = response_time < 2000
        
        return {
            'success': performance_ok,
            'response_time': response_time,
            'threshold': 2000
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def check_content_integrity(domain):
    try:
        response = requests.get(f"https://{domain}", timeout=10)
        
        # Check for expected content
        expected_elements = ['<title>', '<head>', '<body>']
        content_ok = all(element in response.text for element in expected_elements)
        
        return {
            'success': content_ok and response.status_code == 200,
            'content_length': len(response.text)
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def check_ssl_certificate(domain):
    try:
        import ssl
        import socket
        from datetime import datetime
        
        # Get SSL certificate info
        context = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                
                # Check if certificate is valid and not expiring soon
                expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                days_until_expiry = (expiry_date - datetime.utcnow()).days
                
                return {
                    'success': days_until_expiry > 7,  # Alert if expiring within 7 days
                    'days_until_expiry': days_until_expiry,
                    'issuer': cert.get('issuer', [])
                }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
```

## Step 5: Performance Optimization Dashboard

Create a dedicated performance dashboard:

```hcl {linenos=inline}
resource "aws_cloudwatch_dashboard" "performance" {
  dashboard_name = "${var.project_name}-performance"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["Hugo/HealthCheck", "availability_response_time", "Region", "us-east-1"],
            [".", ".", ".", "eu-west-1"],
            [".", ".", ".", "ap-southeast-1"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Global Response Times"
          period  = 300
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "CacheHitRate", "DistributionId", aws_cloudfront_distribution.main.id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Cache Hit Rate"
          period  = 300
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFrontRealTimeMetrics", "101-200", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "201-300", ".", "."],
            [".", "301-400", ".", "."],
            [".", "401-500", ".", "."],
            [".", "501-600", ".", "."]
          ]
          view    = "timeSeries"
          stacked = true
          region  = var.aws_region
          title   = "HTTP Status Code Distribution"
          period  = 60
        }
      }
    ]
  })
}
```

## Step 6: Deployment and Testing

Update your terraform variables:

```hcl {linenos=inline}
# variables.tf additions
variable "alert_email" {
  description = "Email address for receiving alerts"
  type        = string
}

variable "rum_enabled" {
  description = "Enable Real User Monitoring"
  type        = bool
  default     = true
}
```

Deploy the monitoring infrastructure:

```bash
# Add monitoring configuration
terraform plan -var="alert_email=your-email@example.com"
terraform apply -var="alert_email=your-email@example.com"

# Package and deploy Lambda functions
cd terraform
zip custom_metrics.zip custom_metrics.py
zip health_check.zip health_check.py

# Update Lambda functions
aws lambda update-function-code \
  --function-name hugo-custom-metrics \
  --zip-file fileb://custom_metrics.zip

aws lambda update-function-code \
  --function-name hugo-health-check-us-east-1 \
  --zip-file fileb://health_check.zip
```

## Step 7: Creating Operational Runbooks

### Incident Response Playbook

Create documentation for common scenarios:

```markdown
# Hugo Site Incident Response Playbook

## Site Down Alert

### Immediate Actions (< 5 minutes)
1. Check CloudWatch dashboard for error patterns
2. Verify DNS resolution: `nslookup yourdomain.com`
3. Check CloudFront distribution status
4. Review recent deployments in GitHub Actions

### Investigation Steps
1. Check S3 bucket accessibility
2. Review WAF logs for blocked requests
3. Examine Lambda function logs
4. Verify SSL certificate status

### Resolution Steps
1. If S3 issue: Check bucket policies and CORS
2. If CloudFront issue: Create invalidation for affected paths
3. If DNS issue: Verify Route 53 configuration
4. If code issue: Rollback via GitHub Actions

## Performance Degradation

### Investigation
1. Check cache hit ratio trends
2. Review origin latency metrics
3. Examine user location distribution
4. Analyze content size and compression

### Optimization Actions
1. Enable additional compression in CloudFront
2. Review and optimize image sizes
3. Implement additional caching headers
4. Consider adding more edge locations
```

## Monitoring Checklist

✅ **Infrastructure Monitoring**
- CloudFront metrics and alarms
- S3 request monitoring  
- WAF activity tracking
- DNS query monitoring

✅ **Application Monitoring**
- Site availability checks
- Performance monitoring
- Content integrity validation
- SSL certificate monitoring

✅ **User Experience Monitoring**
- Real User Monitoring (RUM) setup
- Core Web Vitals tracking
- Error rate monitoring
- Geographic performance analysis

✅ **Operational Excellence**
- Automated alerting configured
- Incident response procedures documented
- Cost monitoring and budgets set
- Regular review processes established

## Next Steps

With comprehensive monitoring in place, consider these advanced optimizations:

1. **A/B Testing Setup**: Implement CloudFront behaviors for testing different content versions
2. **Advanced Analytics**: Integrate with Google Analytics or Adobe Analytics for deeper insights
3. **Automated Scaling**: Set up auto-scaling for increased traffic periods
4. **Disaster Recovery**: Implement multi-region failover capabilities

## Conclusion

You now have a production-grade monitoring and operations setup for your Hugo site on AWS. This monitoring system provides:

- **Proactive alerting** to catch issues before users do
- **Performance insights** to guide optimization efforts  
- **Cost visibility** to prevent budget surprises
- **Operational excellence** through automated monitoring and alerting

Your Hugo site is now equipped with enterprise-grade monitoring that will scale with your needs and provide the visibility required for reliable operations.

---

## Series Navigation

📚 **Complete Hugo on AWS Guide**
- [Overview & Setup](../)
- [Part 1: GitHub Actions CI/CD](../github-actions-cicd/)
- [Part 2: AWS Infrastructure](../aws-infrastructure/)  
- [Part 3: AWS WAF Security](../aws-waf-security/)
- **Part 4: Monitoring & Operations** ← You are here

---

*Ready to implement monitoring for your Hugo site? Start with the CloudWatch dashboards and gradually add the advanced monitoring features as needed.*
