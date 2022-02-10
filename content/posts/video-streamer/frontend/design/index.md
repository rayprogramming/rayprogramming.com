---
title: "Designing the Front End Part 1"
date: 2022-02-09T22:15:00
publishDate: 2022-02-9T22:45:00-5:00
description: "The first steps I took in designing the front end"
hero: daniel-korpai-pKRNxEguRgM-unsplash.jpg
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
    name: Front End Design 1/?
    identifier: frontend-design-1
    parent: frontend
    weight: 1
---

## Choosing my framework
So I am a gluten for punishment some times. I do not enjoy front end designing at all. I also don't take the time to layout a workflow, or any form of design structure. So where do you start if you don't even know how your site is going to behave? How do you know if you are going to get the right framework? IDK. I just grabbed the one I like the most. I grabbed {{< link/vuejs3 >}} because the last time I tried to build a front end it was very easy to use. The library sets everything up for you, it's very responsive in nature, and since I already knew about it, that helped.

I used the vue cli to start the project and during this process I chose all the features, Sass, babel, pwa, router, vuex, eslint, unit-mocha, and e2e-cypress. Do I know half of these, nope. Am I excited to learn. You can bet your bottom dollar I am.

## Video.js
So when I was first playing around with {{< link/aws/mediaconvert >}} I found that I couldn't get my mp4 files to play in Chrome. Come to find out, this is because chrome sucks, so I tried using m3u8s because someone had said it was a playlist file that allowed the browser to be able to grab the correct quality needed. {{< link/videojs >}} adds support for these files, and made my job easier. And now I just need to find a way to allow the choice of resolution in the player. There are some good contenders, but we will see. To include this, I just did a basic `npm install video.js`, and moved on with my life.

## Details
I started with modifying the router, all I did was add the following code to `src/router/index.js` simple enough. Although I did learn about route level code-splitting, but that was documented in this file by default. Thank you {{< link/vuejs3 >}} for amazing documentation and code comments.

```js
{
  path: "/video",
  name: "Video",
  component: () =>
    import(/* webpackChunkName: "video" */ "../views/Video.vue"),
},
```

Next up I had to create the base component for the video player, I used [Videojs documentation](https://docs.videojs.com/tutorial-vue.html), to find the base information I needed. My linter (default install with vue 3) hated the copy paste, but once I installed [prettier-atom](https://atom.io/packages/prettier-atom), all that just went away. I only had to update one deprecated function; "beforeDestroy" changed to "beforeUnmount". At this stage it was an almost copy paste. This was all put in `src/components/VideoPlayer.js`

Then came the video view that allowed me to call that. Guess what, it's in that documentation, and the only thing I really had to change was the URL it pointed at, and then add the style tag to point at the included css files, and bingo bango we got it working.


```html
<style src="video.js/dist/video-js.css"></style>
```

{{< img src="images/videoPage.png" >}}

It's nothing special, but it's one step closer to the goal.

## Verbage
I don't know, and to be honest, I am too lazy to look it up, is it Frontend or Front end? Same question for the backend. You will probably see me switch between the two, my guess is that my subconcious will be telling me I want the the Front to End when I start spacing them. We will see as time goes I guess. Oh and did I mention I dislike frontend coding? Sure it's cool to see the end product, but the perfectionist in me gets crazy trying to make everything look nice, and then I don't make good strides forward. I keep telling myself, I am only going to get basic functionality working with the frontend, and then see where things go, but who knows.

{{< link/unsplash-hero userTag="@danielkorpai" user="Daniel Korpai" >}}
