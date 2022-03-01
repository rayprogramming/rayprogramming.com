---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
publishDate: {{ .Date }}
draft: true
description: "TODO"
categories:
- vuejs
- frontend
- projects
tags:
- vue 3
- vuejs
- vuejs 3
- frontend
- videojs
- video
- js
- javascripts
menu:
  sidebar:
    name: "{{ replace .Name "-" " " | title }}"
    identifier: {{ .Name }}
    parent: frontend
    weight: 1
---

### Opener
Start with something really good for an opener. Draw them in!

### Main content
Talk about the main ideas

### Summary
Self explanatory
