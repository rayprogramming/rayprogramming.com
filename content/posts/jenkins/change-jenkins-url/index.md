---
title: "Change Jenkins URL from CLI"
date: 2021-08-05
publishDate: "2021-08-11T12:00:00-04:00"
description: A quick guide on how to disable Jenkins security when locked out of the UI.
categories:
- Day in the life
- Jenkins
- DevOps
tags: ["jenkins", "security", "SecOps", "DevOps", "cli"]
menu:
  sidebar:
    name: Change Jenkins URL
    parent: jenkins
    identifier: chage-jenkins-url-cli
    weight: 500
---

### Where did I go wrong?!
Well, as I stated in [Disabling Jenkins Security]({{< relref "disable-security" >}}) I am not experienced in managing Jenkins servers to the degree that I would like. And so when I perform updates I like to create an AMI backup and spin that one up to be able to test upgrades of packages and Jenkins itself. Once I started up the AMI I tried to access it with it's public dns record. The only issue was it kept redirecting me over to the production version's domain name.

I knew that Jenkins stored a lot of values in files, but surely it must be in the `config.yaml` right? NOPE! It was in a much more obvious place. `jenkins.model.JenkinsLocationConfiguration.xml` Looking back I am not sure how I was so blind to it, but sure enough it was right there.

### Why blog this?
Honestly, because I needed to rant about my oblivious nature a bit. But, and more importantly, I wanted to have a record to help me remember and collect my thoughts if I ever miss something like this again.

{{< link/unsplash-hero userTag="@bbestamis" user="Bestami Sarıkaya" >}}
