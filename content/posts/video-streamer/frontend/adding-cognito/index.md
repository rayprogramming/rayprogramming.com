---
title: "Adding Cognito"
date: 2022-03-03T00:25:21-05:00
publishDate: 2022-03-03T00:25:21-05:00
description: "The steps and notes I took with adding cognito"
hero: braydon-anderson-wOHH-NUTvVc-unsplash.jpg
categories:
- vuejs
- frontend
- projects
- cognito
tags:
- vue 3
- vuejs
- vuejs 3
- frontend
- videojs
- video
- js
- javascripts
- cognito
menu:
  sidebar:
    name: "Adding Cognito"
    identifier: adding-cognito
    parent: frontend
    weight: 1
---

### Why do I torture myself?
Not only do I hate frontend code, I hate trying to handle user authentication. It feels like anything I can think of doing is not secure enough or so complicated I can't wrap my head around it. I once was told that for something like user security you shouldn't try to do it yourself, you should allow those who specialize in it to handle it. So here I go, I'm going to try to use {{< link/aws/cognito >}} to do just that form me.

#### Amplify vs Cognito
So, I keep going back and forth about if I want to do the full {{< link/aws/amplify >}} or just do some basic work with {{< link/aws/cognito >}}. The idea with Amplify is that I will be able to quickly build out a UI and integrate it with Cognito, but do I really need all of that?

Didn't I just say I hate UI and user generation? Why not use it? Because I don't like the idea of all the setup I will have to do. It even includes creating an IAM user to handle parts of this. It just feels wrong, but do you know something? I give up. Every time I search a good way to use Cognito, Amplify shows up and it comes through, so I am going to follow [this tutorial](https://javascript.plainenglish.io/get-started-with-aws-cloud9-amplify-vue-js-with-cognito-authentication-2021-a93a1ba71932) and see how it goes.

#### Deviation
Of course! I had played with {{< link/aws/amplify >}} before, that's how I new I didn't like the fact that I had to create an IAM role. When I ran the `amplify configure` I realized I still had a username I could use. So I looked into it, and found I needed to run `amplify init` to start in this project. This is the inputs I used.

```text
frontend|login ⇒ amplify init
Note: It is recommended to run this command from the root of your app directory
? Enter a name for the project VideoStreamer
The following configuration will be applied:

Project information
| Name: VideoStreamer
| Environment: dev
| Default editor: Visual Studio Code
| App type: javascript
| Javascript framework: vue
| Source Directory Path: src
| Distribution Directory Path: dist
| Build Command: npm run-script build
| Start Command: npm run-script serve

? Initialize the project with the above configuration? No
? Enter a name for the environment dev
? Choose your default editor: Atom Editor
? Choose the type of app that you're building javascript
Please tell us about your project
? What javascript framework are you using vue
? Source Directory Path:  src
? Distribution Directory Path: dist
? Build Command:  npm run build
? Start Command: npm run serve
Using default provider  awscloudformation
? Select the authentication method you want to use: AWS profile
```

#### Amplify Next Steps
Amplify says these should be some next steps, so I am going to add it here so I don't miss out later

```text
Some next steps:
"amplify status" will show you what you've added already and if it's locally configured or deployed
"amplify add <category>" will allow you to add features like user login or a backend API
"amplify push" will build all your local backend resources and provision it in the cloud
"amplify console" to open the Amplify Console and view your project status
"amplify publish" will build all your local backend and frontend resources (if you have hosting category added) and provision it in the cloud

Pro tip:
Try "amplify add api" to create a backend API and then "amplify push" to deploy everything
```

### Continuing
Well, here is another thing I am not a fan of. Because {{< link/aws/amplify >}} is trying to be user friendly, they are giving my prompts to auto create items with {{< link/aws/cloudformation >}}. I appreciate CloudFormation for what it is, but I want to use it with Terraform, this makes it annoying to have two different IACs going right now. This might be something I will have to clean up later.

Overall though, I think that the process was rather smooth, and I was able to get a login form, and communicate with cognito. I am not a fan of how it wraps the whole page after the tutorial, but for now, I think I can work with that and get the rest of my app working. The point of doing this wasn't to get something flashy, but functional so I can move on.

{{< link/unsplash-hero userTag="@braydona" user="Braydon Anderson" >}}
