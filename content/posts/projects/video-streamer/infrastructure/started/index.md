---
title: "Getting Started"
date: 2022-02-05T17:30:00
publishDate: 2022-02-05T20:00:00-05:00
description: "Getting started with infrastructure for my video streamer project"
hero: Terraform_PrimaryLogo_ColorWhite_RGB.png
categories:
- terraform
- backend
- projects
tags:
- terraform
- hashicorp
- IaC
- Infrastructure
- AWS
menu:
  sidebar:
    name: Getting Started
    identifier: starter
    parent: infrastructure
    weight: 1
---

### Going over board
So, for those that don't know. I love {{< link/terraform >}}. And when you are building your infrastructure it's easy to take things too far. I am not sure if I did, but sure enough, the first place I started with {{< link/terraform >}} was not actually the IaC that will be running any code. I started with building out the {{< link/github  >}} repo, and {{< link/aws/iam >}} permissions with {{< link/terraform >}}. And no, not the {{< link/aws/iam >}} permissions to run the code either... I defined the {{< link/aws/iam >}} permissions for {{< link/github  >}} to be able to plan and build the infrastructure. If you want to know more about what I am doing with that, feel free to look at [GitHub Infrastructure]({{< relref "posts/projects/video-streamer/infrastructure/github" >}}).

### Setup
I expect this project to be large, and so I decided that I needed to have a folder structure to help organize the pieces. However, with {{< link/terraform >}} that means I will need to use modules. It bugs me a little because I am not intending to reuse them in the project, but I needed some organization.

So I started by defining my `terraform` block and providers. I had to define two providers, because even though {{< link/aws/cloudfront >}} is global, some resources like {{< link/aws/waf >}} are required to be built in `us-east-1` because the linked resource is seen as being in that region.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
  backend "s3" {
    bucket = "rayprogramming-terraform"
    key    = "video"
    region = "us-east-2"
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "us-east-2"
}
provider "aws" {
  region = "us-east-1"
  alias  = "east-1"
}
```

I went ahead and defined my root domain/zone as a data source so that I can use it in the modules to link resources to my domain.

```hcl
data "aws_route53_zone" "selected" {
  name = "rayprogramming.com"
}
```

### Frontend
I only have the front end module for now, and I expect it to change overtime as well.

```hcl
module "frontend" {
  source = "./frontend/"
  name   = "video"
  domain = data.aws_route53_zone.selected.name
  zoneid = data.aws_route53_zone.selected.zone_id
}
```

However, inside of that this is my file structure I am going with at this time. This structure is to help me separate concerns and organize my thoughts into code. I think at this time, I will leave this as my final bit of getting started. I have the code and it can be viewed on {{< link/github/video_streamer >}}

{{< img src="images/folder-structure.png" >}}
