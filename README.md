# JS Canvas Speed Experiment

In this repo, I tested rendering to the native HTML canvas element using two different methods:

- The native mechanism via calling the [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) function add the end of the rendering function. Using this method, the `delta` is provided to the rendering function by the API
- Calling the rendering function manually, computing the delta manually and calling the function on a [`setTimeout(0)`](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)

To control how much strain I apply on the rendering loop each cycle, I use a slider that controls how many random squares we draw for each frame.

## Signals implementation in JS

To manage the state of the app, I use a homemade signals implementation. You can find the code in the [lib.js](./lib.js) file.
This greatly simplifies the code and makes it easier to reason about the (not so complex) state of the page.
It allows me to have a single source of truth to coordinate updates to the state.

> NB: This is a very simple implementation. I'm not sure if it's the best way to do it. I'm open to suggestions. (And more importantly, it might not be the best solution for performance)

A native Javascript implementation of signals is currently being evaluated in a TC39 proposal. see [Propose signals](https://github.com/tc39/proposal-signals)

[Demo](https://sachahjkl.github.io/js_canvas_experiment/):

[![Demo](./images/demo.png)](https://sachahjkl.github.io/js_canvas_experiment/)
