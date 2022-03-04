---
title: "Writing Mocha 1"
date: 2022-03-02T17:05:25-05:00
publishDate: 2022-03-05T11:00:00-05:00
description: "Writing Mocha Tests"
hero: koushik-pal-C_vE8ZIHJ3Y-unsplash.jpg
categories:
- vuejs
- frontend
- projects
- mochajs
tags:
- vue 3
- vuejs
- vuejs 3
- frontend
- videojs
- video
- js
- javascript
- mocha
- chia
- chiajs
- mochajs
- unit test
menu:
  sidebar:
    name: "Writing Mocha Part 1/?"
    identifier: writing-mocha-1
    parent: frontend
    weight: 1
---

### Let's get started with Mocha
Be forewarned this post is going to be a brain dump as I work through this information.

I have never wrote [Mocha](https://mochajs.org/) before, and to be honest I have never been good about TDD. I always write my code and then go back and write my tests. This is mainly because I am not always sure what I expect to get out of my code until it's too late. However, with this project I am trying to push myself to work on myself just as much create something in my head from start to finish.

So I got started with knowing I need to have a login form. Since I am working in {{< link/vuejs3 >}} I set it up to have mocha as my unit tests, and it came with an example for the Login HelloWWorld file. So I copied that and started replacing everything for a login form.

```js
import { expect } from "chai";
import { shallowMount } from "@vue/test-utils";
import LoginForm from "@/components/LoginForm.vue";

describe("LoginForm.vue", () => {
  it("renders username field when passed", () => {
    const wrapper = shallowMount(LoginForm);
    expect(wrapper.find("input.email")).to.include();
  });
  it("should have props for email and password", () => {
    const wrapper = shallowMount(LoginForm);
    expect(wrapper.props("email")).to.defined;
    expect(wrapper.props("password")).to.defined;
  });
});
```

My idea here is that my login form component should contain a username and password. Right now the test is not working because I don't have the component created as a file to even include in the test. So I am going to go fix that really quick.

```html
<template>
  <div class="login">
    <form action="/login" method="post">
      <input type="email" name="email" value="" />
      <input type="password" name="password" value="" />
    </form>
  </div>
</template>

<script>
export default {
  name: "LoginForm",
  props: {},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
```

And the errors turned out better than I had hoped to be honest (given I don't know what I am doing with mocha)

```text
MOCHA  Testing...

 LoginForm.vue
   1) renders username field when passed
   2) should have props for email and password

 HelloWorld.vue
   ✓ renders props.msg when passed


 1 passing (128ms)
 2 failing

 1) LoginForm.vue
      renders username field when passed:
    Error: Cannot call Symbol(Symbol.toStringTag) on an empty DOMWrapper.
     at Object.get (dist/js/webpack:/node_modules/@vue/test-utils/dist/vue-test-utils.esm-bundler.js:1649:1)
     at Object.typeDetect [as type] (dist/js/webpack:/node_modules/type-detect/type-detect.js:238:1)
     at Proxy.include (dist/js/webpack:/node_modules/chai/lib/chai/core/assertions.js:476:1)
     at Proxy.chainableMethodWrapper (dist/js/webpack:/node_modules/chai/lib/chai/utils/addChainableMethod.js:113:1)
     at Context.<anonymous> (dist/js/webpack:/tests/unit/example.spec.js:8:1)
     at processImmediate (node:internal/timers:466:21)

 2) LoginForm.vue
      should have props for email and password:
    Error: Invalid Chai property: defined. Did you mean "undefined"?
     at Object.proxyGetter [as get] (dist/js/webpack:/node_modules/chai/lib/chai/utils/proxify.js:75:1)
     at Context.<anonymous> (dist/js/webpack:/tests/unit/example.spec.js:12:1)
     at processImmediate (node:internal/timers:466:21)



MOCHA  Tests completed with 2 failure(s)

ERROR  mochapack exited with code 2.
```

:'( and of course I started off with a silly mistake of naming the test with username and then expecting email. So I'll fix that, but then I need to find out why it's got an empty DOMWrapper. Any time I tried to search [mochajs](https://mochajs.org/) for documentation I only really got instructions on how to set it up, but I saw something mention [chaijs](https://www.chaijs.com/) when I searched "[mochajs](https://mochajs.org/) to include" so I looked into that and found that [mochajs](https://mochajs.org/) uses [chaijs](https://www.chaijs.com/) to handle [assertions](https://www.chaijs.com/api/bdd/).

Once I did that I was able to quickly find that I was not using the correct selector, and so I needed to switch that and the insertion.

```js
it("renders email field when passed", () => {
    const wrapper = shallowMount(LoginForm);
    expect(wrapper.find("#email")).to.exist;
  });
```

This one now tests correctly and I can move onto other tests. These tests took me a minute to figure out because I was not expecting this to be the use case too, but sure enough exist works on them as well.

```js
it("should have props for email and password", () => {
    const wrapper = shallowMount(LoginForm);
    expect(wrapper.props("email")).to.exist;
    expect(wrapper.props("password")).to.exist;
  });
```


The final products look like the following:

```html
<template>
  <div class="login">
    <form action="/login" method="post">
      <input type="email" name="email" id="email" value="" />
      <input type="password" name="password" id="password" value="" />
    </form>
  </div>
</template>

<script>
export default {
  name: "LoginForm",
  props: {
    email: String,
    password: String
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>

```


```js
import { expect } from "chai";
import { shallowMount } from "@vue/test-utils";
import LoginForm from "@/components/LoginForm.vue";

describe("LoginForm.vue", () => {
  it("renders email field when passed", () => {
    const wrapper = shallowMount(LoginForm);
    expect(wrapper.find("#email")).to.exist;
  });
  it("should have props for email and password", () => {
    const wrapper = shallowMount(LoginForm);
    expect(wrapper.props("email")).to.exist;
    expect(wrapper.props("password")).to.exist;
  });
});
```

### Next steps
The next steps will be to incorporate test to make sure that logging in will actually work as expected.

{{< link/unsplash-hero userTag="@koushikpal" user="Koushik Pal" >}}
