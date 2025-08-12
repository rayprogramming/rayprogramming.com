---
title: "Maintenance Mode"
date: 2021-08-15T13:23:11-04:00
publishDate: 2021-08-18T12:00:00-04:00
description: "How I handle maintenance mode"
categories:
- Day in the life
- Jenkins
- DevOps
tags: ["ecs", "aws", "cdn", "route53", "terraform", "codebuild", "codepipeline", "IaC"]
menu:
  sidebar:
    name: "Maintenance Mode"
    identifier: maintenance-mode
    parent: tips-tooling
    weight: 5
---

### Backstory

What do you do when you are a small company and don't want to have a multi regional roll out, but need to upgrade a core feature? I throw out a maintenance mode message. I would love to find a better way, but I have yet to find it. It would be wonderful if someone could point me in that direction, but for now, I will stick with this methodology.

Some of the core features could be mitigated a bit better, like the Redis servers that we use to reduce strain on our database and speed up load times for the end user. However, we have unfortunately not handled that with grace and so if our Redis server is down we get errors about it instead of falling back to the database. But, even if we had that fail safe what do we do about the database? What if we are doing something to our load balancer? Well, we have a solution, and it's elegance is up for debate.

To give a bit more backstory, we use {{< link/aws/route53 >}} to point at a {{< link/aws/alb >}} that targets {{< link/aws/fargate >}} tasks. All of this is built using {{< link/hashicorp >}}'s {{< link/terraform >}}. I have coded the entire infrastructure using this IaC setup, and I don't regret it. Well, I regret how I went about a few things, but doing all this in a month was a rush job I had to get done.

### How I did it

The {{< link/aws/codepipeline >}} runs {{< link/terraform >}} to build itself and every other bit of the infrastructure. So to enable to maintenance mode I threw a variable in there called `maintenance_mode`.

```hcl
variable "maintenance_mode" {
  description = "Set to true to redirect users to maintenance URL instead"
  type        = bool
  default     = false
}
```

This maintenance_mode boolean then allows me to trigger the {{< link/aws/route53 >}} record to point to a CDN that we do not have controlled with IaC so that it can't be effected during maintenance. I am using [Terraform's dynamic blocks](https://www.terraform.io/docs/language/expressions/dynamic-blocks.html) to handle the switch without having to be too crazy about the if statements and state management.


```hcl
resource "aws_route53_record" "environment" {
  zone_id         = var.route53_zone_id
  name            = var.url
  type            = "A"
  allow_overwrite = true

  dynamic "alias" {
    for_each = var.maintenance_mode ? [] : [1]
    content {
      name                   = aws_lb.load_balancer.dns_name
      zone_id                = aws_lb.load_balancer.zone_id
      evaluate_target_health = false
    }
  }
  dynamic "alias" {
    for_each = var.maintenance_mode ? [1] : []
    content {
      name                   = data.aws_cloudfront_distribution.maintenance.domain_name
      zone_id                = data.aws_cloudfront_distribution.maintenance.hosted_zone_id
      evaluate_target_health = false
    }
  }
}
```

I wanted to point out this wonderful usage of `for_each` that I had found. It works similar to the ideas that have been seen with counts where it will not build if set to 0, and so I just provide an empty array when I don't want to use it. You are not required to use the `each.` variables anywhere in the block so it just manages to work. I was hoping dynamic blocks allowed the use of count, but this works for me just the same.

I will note I am not thrilled I have to allow an overwrite of the record, but without that flag set to true you can't change it for yourself. I hope this finds it to someone who needs it.

{{< link/unsplash-hero userTag="@loran01" user="Dan Loran" >}}
