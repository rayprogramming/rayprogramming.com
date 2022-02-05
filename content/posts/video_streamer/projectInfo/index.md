---
title: "Video Streamer Project"
date: 2022-02-05T17:30:00-5:00
publishDate: 2022-02-06T12:00:00-5:00
description: "Info about my video streamer project"
hero: hero.jpg
categories:
- projects
tags:
- AWS
menu:
  sidebar:
    name: Video Streamer Info
    identifier: project
    parent: streamer
    weight: 1
---

### Premise
The premise of my idea here is to actually make an open source, cloud native, and serverless competitor to [Float Plane](https://www.floatplane.com/). Do I think this will take off and fly? No, but I wanted to explore more AWS services, and give myself something to do that was not work. I greatly admire what LMG and Float Plane is doing with their software. It really feels like they are caring for their creators. Granted, I may not see the dark side as I just sit here looking in without paying for any of the content there.

### Business plan
There is none. I have no plan to make money off this. I am just wanting to make a cool bit of software and get some programming energy out.

### Open Source
Yes, I plan on making this open source from start to end. It is host on [GitHub](https://github.com/rayprogramming/videoStreamer/), and I would welcome help, feedback, etc.

### Plans

#### Users
Users will be authenticated and authorized using {{< link/aws/cognito >}} user pools. User sign up will not be open to the public any time soon if ever. The first goal for users is for them to be able to view content without logging in. The next step be to allow uploads of content and automatic creation of conversion jobs. Once that is done, I will work on setting up some form of subscription payment system to be able to allow people to subscribe to creators.

#### Frontend
The front end will be an SPA built in [VueJS 3](https://v3.vuejs.org/) and served with an {{< link/aws/cloudfront >}} CDN.The video player will be [videojs](https://videojs.com/)

#### Backend
The backend will be built using {{< link/aws/api >}} and {{< link/aws/lambda >}}. We will also pull in {{< link/aws/mediaconvert >}} for any video converstions.

#### Infrastructure
The infrastructure will all be built with {{< link/terraform >}}.

#### Security
I am starting the SLDC with security in mind, and I am using {{< link/tfsec >}} and {{< link/snyk >}} to form IaC scans. I will also be using {{< link/snyk >}} to perform dependency scans and hopefully see about code analysis as well.


{{< link/unsplash-hero userTag="@wahidkhene" user="Wahid Khene" >}}
