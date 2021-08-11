---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
publishDate: {{ .Date }}
draft: true
description: TODO
categories:
- Jenkins
- DevOps
tags: ["jenkins", "DevOps"]
menu:
  sidebar:
    name: "{{ replace .Name "-" " " | title }}"
    parent: jenkins
    identifier: {{ .Name }}
    weight: 1
---
