---
title: "Getting Started"
date: 2022-02-05T17:30:00-5:00
publishDate: 2022-02-13T12:00:00-5:00
description: "Getting started with infrastructure for my video streamer project"
hero: Terraform_PrimaryLogo_ColorWhite_RGB.png
draft: true
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
So, for those that don't know. I love {{< link/terraform >}}. And when you are building your infrastructure it's easy to take things too far. I am not sure if I did, but sure enough, the first place I started with {{< link/terraform >}} was not actually the IaC that will be running any code. I started with building out the {{< link/github  >}} repo, and {{< link/aws/iam >}} permissions with {{< link/terraform >}}. And no, not the {{< link/aws/iam >}} permissions to run the code either... I defined the {{< link/aws/iam >}} permissions for {{< link/github  >}} to be able to plan and build the infrastructure. If you want to know more about what I am doing with that, feel free to look at [GitHub Infrastructure]({{< relref "posts/video-streamer/infrastructure/github" >}}).

### Setup
I expect this project to be large, and so I decided that I needed to have a folder structure to help organize the pieces. However, with {{< link/terraform >}} that means I will need to use modules. It bugs me a little because I am not intending to reuse them in the project, but I needed some organization.

So I started by defining my `terraform` block and providers.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
  backend "s3" {
    bucket = "***REDACTED***"
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
