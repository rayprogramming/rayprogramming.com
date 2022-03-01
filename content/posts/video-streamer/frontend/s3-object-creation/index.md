---
title: "S3 Object Creation"
date: 2022-03-01T10:44:15-05:00
publishDate: 2022-03-05T10:44:15-05:00
description: "How I uploaded my frontend to S3 the wrong way"
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
    name: "S3 Object Creation"
    identifier: s3-object-creation
    parent: infrastructure
    weight: 1
---

### Whoops
Ever gone down that path of trying to be too smart for your own good? Yeah that happened to me this time. I want to start out by saying, I am not a frontend developer, so some of the "normal" things that they would expect are still beyond my knowledge. But the thing that really bit me in the butt may not have been the frontend code. So let me give you the backdrop here.

I am a {{< link/hashicorp >}} fan almost to a fault, and so when I think about the tools that are provided by them, I tend to forget that everything has a specific usecase. So, when I tried to use their [aws_s3_object](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object) I ran into a major issue. I was trying to sync the entire {{< link/github/video_streamer_tree folder=frontend >}} directory of my repository, this was after the setups and install of node_modules. And the memes were real for me. You can see in {{< link/github/video_streamer_commit name="this upgrade commit" commit=def29de1a09301c90aae0c8f87b94d158fcd414b >}} that I was trying to get every file and treat it as an individual resource in {{< link/terraform >}}. I thought I was SO smart.

{{< giphy/homer_iamthesmart >}}


### 6 hours later...
The github build fails on the build, it couldn't get through all the calls it was making. Each individual file was treated like a resource so each one had to perform at least one get call with {{< link/terraform >}} to check to see if it existed. The frontend folder has about 50 thousand files in it. And that's when the obvious hit me... {{< link/terraform >}} was not built to be your code build and deploy, why was I doing this? Because I had spent so much time getting to this point, and I was about ready to see it all come together in a deploy-able packages I was so excited. When it failed, it hit harder than I wished it would have. It actually caused me to put the project away, and then between that and other things going on, I ended up retreating to video games as an escape. I actually had a possible fix given to me by a couple co-workers (thank you, I hope you know who you are if you're reading this), but the problem was, I was so involved with Minecraft, that I stopped caring about what I was doing here.

### The fix
So I was suggest to use rsync to perform this task. It sounded great, I started learning about the config file, and grabbing the GitHub action so I could upload it. Well, it failed because it couldn't grab the permissions from the aws GitHub action. When I went to see what kind of outputs that action had I got slapped right in the brain. Their example had the exact command I needed.

`aws s3 sync . s3://bucket`

ARE YOU KIDDING ME! I should have thought about this better. I knew better about all this, I was just trying to be too smart for my own britches. Heck, I new I could of easily used the {{< link/aws/codepipeline >}} to handle this, but I wanted to try to be smarter than everyone else and handle it myself. So I used that sync, and bingo was his name-o. I was able to move forward, unfortunately that wasn't the end of my issue. I found out shortly after, that I had ended up not uploading the `dist/` folder and so it was not a deployable package. Easy enough to fix, but that knowledge might have worked with terraform at least at the begining because those files consist of only 44 files right now. Would it have worked in the long run? Probably not. Not if I intend to honestly keep building this out to the extent I want to.
