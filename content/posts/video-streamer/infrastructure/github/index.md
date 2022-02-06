---
title: "Video Streamer GitHub Terraform"
date: 2022-02-05T17:30:00-5:00
publishDate: 2022-02-05T20:00:00-5:00
description: "So you want to know more of how I setup my repo with Terraform eh?"
hero: Octocat.jpg
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
    name: GitHub Terraform
    identifier: gh-terraform
    parent: infrastructure
    weight: 2
---


### GitHub Terraform
Thank you for your interest in the possible mundane of how I setup my repository for the video streamer.

So how did I do it? It's pretty straight forward. I started by defining the GitHub repository. I turned off most of the features as if those features are not on, I will be less likely to get distracted and playing with them. For example, I turned off the wiki for it since I would spend time keeping it up to date as I made small modifications during a time where the code will change a lot. And honestly, that's what this blog will be for at this time. I can document what and why I am doing things so that I am not going into the detail of how or support with the wiki.

I did choose to leave issues, and vulnerability_alerts open so that if someone did decide to contribute they had opportunities to do so.

```hcl
#tfsec:ignore:github-repositories-private
resource "github_repository" "video_streamer" {
  name                 = "videoStreamer"
  description          = "This is a video streaming application I wanted to test"
  has_downloads        = false
  has_issues           = true
  has_projects         = false
  has_wiki             = false
  vulnerability_alerts = true
  auto_init            = true
  visibility           = "public"
}
```

If you notice, I had to add a {{< link/tfsec >}} ignore rule here as it would rather you have private repos. That's fair in some use cases, but part of my wishes this wasn't a rule as I would rather see more software be open to be viewed by the public. I get that would give more opportunities for competitors though. So :shrug:, I get from a business sense, this is the right way.

You will notice as  well, that I have enabled auto_init. This was because of the next item. I would have thought a `github_branch` would create the branch, but if your repo is not initilized with at least one branch it can not create more branches. Since I only define the main branch, I could have went with a data source instead, but I didn't bother to update it. The only thing I can see this resource good for would be keeping a release branch available.

```hcl
resource "github_branch" "video_streamer_main" {
  repository = github_repository.video_streamer.name
  branch     = "main"
}

resource "github_branch_default" "video_streamer_default_branch" {
  repository = github_repository.video_streamer.name
  branch     = github_branch.video_streamer_main.branch
}
```

I did make sure the branch was defined as the default for ease of use, but I think GitHub already does that for your main branch.

I then added my branch protections. These protections make sure that general rules are always applied to this branch, and it also allows me to define the status checks which we can get into later.

```hcl
resource "github_branch_protection_v3" "video_streamer_branch_protection" {
  repository = github_repository.video_streamer.name
  branch     = github_branch.video_streamer_main.branch

  require_conversation_resolution = true
  require_signed_commits          = true

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    dismissal_teams                 = []
    dismissal_users                 = ["Rihoj"]
    require_code_owner_reviews      = true
    required_approving_review_count = 1
  }

  required_status_checks {
    contexts = [
      "Run tfsec sarif report",
      "Snyk IaC",
      "infrastructure_plan",
      "snyk",
      "tflint-frontend (ubuntu-latest)",
      "tflint-main (ubuntu-latest)",
      "tfsec",
    ]
    strict = true
  }

  restrictions {
    users = [
      "Rihoj",
    ]
  }
}

```

The only other thing I added, was grabbing the name of my {{< link/aws/iam >}} roles from remote state and set those as secrets on the repository so that I can use them in the {{< link/github >}} actions as variables in case I change my naming conventions later on.

```hcl
resource "github_actions_secret" "terraform_aws_plan_role" {
  repository      = github_repository.video_streamer.name
  secret_name     = "TERRAFORM_AWS_PLAN_ROLE"
  plaintext_value = data.terraform_remote_state.iam.outputs.role_video_plan_arn
}

resource "github_actions_secret" "terraform_aws_deploy_role" {
  repository      = github_repository.video_streamer.name
  secret_name     = "TERRAFORM_AWS_DEPLOY_ROLE"
  plaintext_value = data.terraform_remote_state.iam.outputs.role_video_deploy_arn
}
```

And that's it for the {{< link/github >}} Terraform.
