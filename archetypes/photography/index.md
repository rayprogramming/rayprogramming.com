---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
publishDate: {{ .Date }}
draft: true
description: TODO
categories:
- TODO
tags:
- TODO
menu:
  photography:
    name: "{{ replace .Name "-" " " | title }}"
    identifier: {{ .Name }}
    parent: photography
    weight: 100
---
