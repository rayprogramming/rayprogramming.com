---
title: "Life Update: August 2025"
date: 2025-08-11T08:00:00-06:00
publishDate: 2025-08-11T08:00:00-06:00
description: "Reflecting on personal growth, a cross-country move, and rebuilding my homelab."
categories:
  - Life
tags: ["life", "mental health", "update", "homelab", "move"]
menu:
  sidebar:
    name: "Aug. 2025"
    identifier: aug-2025
    weight: 1
    parent: life-updates
---

## Finding balance

This summer has felt like a balancing act. On one hand, I’m excited about the new projects I’m building, both at work and for fun. On the other, I’ve been navigating the usual ups and downs of mental health, family commitments, and the constant work of making time for myself.

I’m coming up on four years with my company, and the work continues to evolve and challenge me. I love solving problems at scale, and I’m always learning more about AWS, Terraform, and the broader reliability toolbox. As the “DevOps person” for our team, I handle CI/CD pipelines, infrastructure as code, monitoring, and incident response. It keeps things interesting and it can be a lot, which is why the personal balance piece matters.

## The move

The biggest change this summer was moving across the country. Coordinating a relocation while keeping production systems healthy was an adventure. There were calls taken from an empty living room, a laptop on a moving box, and a hotspot taped to the window. Worth it. I’m now getting to know the Front Range and settling into a slower, more intentional rhythm.

## Homelab 2.0

With the new place comes a full rebuild of my homelab. I’m treating it like a greenfield project so I can apply what I’ve learned over the last few years instead of dragging forward old assumptions.

**Goals**
- Reliable, self-healing base with clear separation of concerns.
- Strong network fundamentals with VLANs and clean routing.
- Low maintenance, low power draw, easy to back up and restore.
- A safe sandbox for Kubernetes, observability, and automation experiments.

**Networking plan**
- MikroTik at the core for routing, DHCP, and firewall, with proper VLAN segmentation for management, servers, and Wi-Fi.
- Access points that reduce congestion and give full-home coverage.
- Everything defined in code so I can rebuild without clicking around in GUIs.

**Compute and services**
- Docker for most services, with a small cluster reserved for learning and tearing down Kubernetes.
- Observability stack for metrics, logs, and uptime checks.
- Automated, tested backups so restore day is boring.

I’ll document the build in a short series: network design, base services, observability, and automation. If you enjoy home networking or you’re homelab-curious, I think you’ll like it.

## Prioritizing mental health

I’ve written before about depression and anxiety. Therapy helps, but the path isn’t straight. For the last eight weeks I’ve kept a simple morning ritual: sit with coffee for ten minutes and breathe. It’s small, but it sets the tone for the day.

For movement, I’ve been taking the dog on longer walks. It gets me outside, clears my head, and it’s a routine I can keep even on busy days.


## Looking ahead

For fall, I’m setting intentions instead of rigid goals:
- Post weekly through the end of the year.
- Share the homelab rebuild in a way others can copy or adapt.
- Mix technical deep dives with honest notes about health and focus.

On deck: maintainable infrastructure as code patterns, practical observability you can stand up in a weekend, and homelab networking that stays fast and stable without constant tinkering.

Here’s to finishing the summer with care, curiosity, and enough structure to keep moving forward.