---
title: "Disabling Jenkins Security"
date: 2021-08-03
description: A quick guide on how to disable Jenkins security when locked out of the UI.
categories:
- Day in the life
- Jenkins
- DevOps
tags: ["jenkins", "security", "SecOps", "DevOps"]
menu:
  sidebar:
    name: Disabling Jenkins Security
    identifier: disabling-jenkins-security
    weight: 500
---

So I started my day off yesterday making an AMI of a Jenkins server. This was because we needed to update the server, and wanted to make sure that the updates didn't break anything. I ran into two issues when I started; the first was I couldn't access the GUI and the Second was once I could access the GUI I couldn't login due to the domain not matching for Google.

Given I have very little experience with managing Jenkins (AWS Codebuild for the win), I had to hunt down how I could disable the security settings from the command line and files without breaking anything.
