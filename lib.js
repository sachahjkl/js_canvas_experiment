import { Chart, registerables } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm";
import throttle from "https://cdn.jsdelivr.net/npm/lodash.throttle@4.1.1/+esm";

// this allows exporting any name to the js global scope
export function makeGlobal(...args) {
  args.forEach((it) => Object.assign(window, it));
}

// Signals

let subscriber = null;

export function signal(value) {
  const subscriptions = new Set();

  return {
    get value() {
      if (subscriber) {
        subscriptions.add(subscriber);
      }
      return value;
    },
    set value(updated) {
      value = updated;
      subscriptions.forEach((fn) => fn());
    },
  };
}

export function effect(fn) {
  subscriber = fn;
  fn();
  subscriber = null;
}

export function derived(fn) {
  const derived = signal();
  effect(() => {
    derived.value = fn();
  });
  return derived;
}

// Generic render logic from context and frame delta time

/**
 *
 * @param {{
 *   numberOfBoxesToDraw: number,
 *   canvasId: string,
 *   active: boolean,
 *   ctx: CanvasRenderingContext2D,
 *   delta: number,
 *   nextFrame: () => void,
 *   sampler: (data: { x: number, y: number }) => void,
 * }} options
 */
export const render = (
  options = {
    numberOfBoxesToDraw: 0,
    canvasId: "You should override the canvasId",
    active: true,
    ctx,
    delta: 0,
    nextFrame() {
      console.log("You should override the endFrame function");
    },
    sampler(x = 0, y = 0) {
      console.log("You should override the sampler function", x, y);
    },
  }
) => {
  const { ctx, active, numberOfBoxesToDraw, delta, nextFrame, sampler } = options;

  if (active) {
    const { width, height } = ctx.canvas;
    const MAX_COLOR = parseInt("FFFFFF", 16);
    const ONE_SECOND_IN_MS = 1000;
    const FONT_SIZE = 32;
    const BLOCK_SIZE = 20;
    const MARGIN = 10;

    // Draw background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    // Draw some bs to make shit lag
    for (let index = 0; index < numberOfBoxesToDraw; index++) {
      ctx.fillStyle = `#${Math.round(Math.random() * MAX_COLOR).toString(16)}`;
      ctx.fillRect(
        Math.random() * (width - width * 0.2 - BLOCK_SIZE) + width * 0.1,
        Math.random() * (height - height * 0.2 - BLOCK_SIZE) + height * 0.1,
        BLOCK_SIZE,
        BLOCK_SIZE
      );
    }

    // Draw framerate

    let framerate = 0;
    if (delta > 0) {
      // display framerate with 1 decimal place
      framerate = (ONE_SECOND_IN_MS / delta).toFixed(1);
    }
    let framerateLabel = `${framerate} fps`;

    // console.info("Framerate (FPS) for canvas", canvasId, ": ", framerate);

    // draw framerate
    ctx.fillStyle = "rgba(255, 255, 0, 1)";
    ctx.fillRect(MARGIN, MARGIN, FONT_SIZE * 5 + 2, FONT_SIZE + 2 * 2);

    ctx.fillStyle = "black";
    ctx.font = `${FONT_SIZE}px monospace `;
    ctx.fillText(framerateLabel, MARGIN, FONT_SIZE + MARGIN);

    sampler(numberOfBoxesToDraw, Math.round(framerate));
  }

  nextFrame();
};
/**
 *
 * @param {{
 *   name: string,
 *   ctx: CanvasRenderingContext2D,
 *   sampler: (data: { x: number, y: number }) => void,
 *   nextFrameStrategy: (loop: (number) => void) => () => unknown,
 *   get numberOfBoxesToDraw(): number,
 *   get active(): boolean,
 * }} options
 * @returns
 */
export function makeRenderer(
  options = {
    name: "default renderer",
    ctx,
    get active() {
      return true;
    },
    get numberOfBoxesToDraw() {
      return 0;
    },
    nextFrameStrategy: (loop) => () => requestAnimationFrame(loop),
    sampler(x = 0, y = 0) {
      console.log("You should override the sampler function", x, y);
    },
  }
) {
  let previousRenderStartTimestamp = 0;

  const loop = (currentTimestamp = 0) => {
    // delta (in ms)
    const delta = currentTimestamp - previousRenderStartTimestamp;
    render({
      numberOfBoxesToDraw: options.numberOfBoxesToDraw,
      active: options.active,
      ctx: options.ctx,
      delta,
      nextFrame: strategy,
      sampler: options.sampler,
    });
    previousRenderStartTimestamp = currentTimestamp;
  };

  const strategy = options.nextFrameStrategy(loop);

  // return the start function
  return () => loop(0);
}

// Sampling

/**
 *
 * @param {{
 *   maxSamples: number,
 *   measureIntervalMs: number,
 *   get active(): boolean,
 *   get samples(): Array<{x: number, y: number}>,
 *   set samples(value: Array<{x: number, y: number}>): void,
 * }} options
 * }} options
 * @returns
 */
export function makeSampler(
  options = {
    maxSamples: 2_500,
    measureIntervalMs: 10,
    get active() {
      return true;
    },
    /** @type {Array<{x: number, y: number}>} */
    get samples() {
      return [];
    },
    set samples(value) {
      console.log("You should override the samples setter function", value);
    },
  }
) {
  const { maxSamples, measureIntervalMs } = options;
  return throttle((x, y) => {
    if (!options.active) return;
    const samples = options.samples;
    if (samples.length >= maxSamples) return;
    samples.push({ x, y });
    options.samples = samples;
  }, measureIntervalMs);
}

// Chart
/**
 *
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   dataSources: Array<{label: string, get data(): Array<{x: number, y: number}>}>,
 * }} options
 * @returns
 */
export function makeChart(
  options = {
    canvas,
    dataSources: [
      {
        label: "requestAnimationFrame",
        get data() {
          return [];
        },
      },
      {
        label: "setTimeout(0)",
        get data() {
          return [];
        },
      },
    ],
    chartUpdateIntervalMs: 1000,
  }
) {
  Chart.register(...registerables);
  const chart = new Chart(options.canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "requestAnimationFrame",
          data: [],
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235,0.5)",
        },
        {
          label: "setTimeout(0)",
          data: [],
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132,0.5)",
        },
      ],
    },
    options: {
      responsive: true,
      animation: {
        duration: 0,
      },
      transition: {
        duration: 0,
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
        },
      },
    },
  });

  return throttle(() => {
    console.log("samples length", options.dataSources[0].data.length);

    options.dataSources.forEach((source) => {
      chart.data.datasets.find((it) => it.label === source.label).data = source.data;
    });

    chart.update();
  }, options.chartUpdateIntervalMs);
}
