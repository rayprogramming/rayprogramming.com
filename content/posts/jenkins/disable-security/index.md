---
title: "Disabling Jenkins Security"
date: 2021-08-05
description: A quick guide on how to disable Jenkins security when locked out of the UI.
categories:
- Day in the life
- Jenkins
- DevOps
tags: ["jenkins", "security", "SecOps", "DevOps"]
menu:
  sidebar:
    name: Disabling Jenkins Security
    parent: jenkins
    identifier: disabling-jenkins-security
    weight: 500
---
### The start to my troubles

So I started my day off the other day making an AMI of a Jenkins server, because we needed to update the server and wanted to make sure that the updates didn't break anything. I ran into two issues when I started; the first was I couldn't access the GUI and the Second was once I could access the GUI I couldn't login due to the domain not matching for Google. Given I have very little experience with managing Jenkins (AWS Codebuild for the win), I had to hunt down how I could disable the security settings from the command line and files without breaking anything.

### The struggle
I thought this would be an easy adventure. I mean how else are you supposed to get into the server? I can't just keep the Jenkins server down while I make sure everything upgrades correctly. Can I? I mean... I probably could have. My boss may not have minded to much. I could have also just tried to update the Google Credentials settings... but who has time for that. I don't even know if I have permission to access those settings [^1].

I still had access to be able to ssh into the server. I tried digging around to find the files to edit on my own. However, I don't know if my eyes were tired, or what. I could not find the setting for the life of me. I found resources that said that those settings would be in the ``config.xml`` file of the Jenkins install directory. I found that no matter how much digging I did in that file though. I could not find the settings I expected.

### Finally the answer is upon us
After digging through the internet more I finally found the answer. It  was simple it was genius. It was so spectacular it blew my mind like the Forth of July :boom:! It was so obvious! Why didn't I think of it?!

It was a simple xml tag about 5-10 lines down of ``<useSecurity>true</useSecurity>``

Crap! :sweat_smile: Man did I feel stupid after that one. It took a good hour on this because I was just blind as a bat. Well suffice it to say I am still beating myself over this one. I like to think I am a smart man, but then things like this happen and I question everything.

[^1]: I find it unnerving and weird how I am given many permissions, some more than I need, but then other times I am left out in the cold for things I might actually need to work on.
