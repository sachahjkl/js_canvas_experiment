import {
  makeGlobal,
  signal,
  effect,
  derived,
  makeRenderer,
  makeSampler,
  makeChart,
} from "./lib.js";

const MAX_MAX_BOX_COUNT = 100_000;
const DEFAULT_MAX_BOX_COUNT = 25_000;
const MEASURE_INTERVAL_BOX = 100;
const MEASURE_INTERVAL_MS = 10;
const MIN_BOX_COUNT = 0;
const MIN_BOX_COUNT_LABEL = MIN_BOX_COUNT.toLocaleString("en");
const requestSamples = signal([]);
const timeoutSamples = signal([]);
const maxBoxCount = signal(DEFAULT_MAX_BOX_COUNT);
const mediumMaxBoxCount = derived(() => Math.ceil(maxBoxCount.value / 10));
const smallMaxBoxCount = derived(() => Math.ceil(maxBoxCount.value / 100));
const boxCount = signal(50);
const shouldSample = signal(false);
const autoIncr = signal(false);

makeGlobal(
  { maxBoxCount },
  { boxCount },
  { mediumBoxCountInput: window.mediumBoxCountInput },
  { smallBoxCountInput: window.smallBoxCountInput },
  { labelText: window.labelText },
  { labelTextMedium: window.labelTextMedium },
  { labelTextSmall: window.labelTextSmall },
  { shouldSample },
  { autoIncr },
);

document.addEventListener("DOMContentLoaded", () => {
  const {
    request,
    timeout,
    boxCountLabel,
    boxCountInput,
    mediumBoxCountInput,
    smallBoxCountInput,
    labelText,
    labelTextMedium,
    labelTextSmall,
    shouldSample,
    autoIncr,
    fpsCanvas,
    maxBoxCountInput,
    maxBoxCountLabel,
  } = window;

  maxBoxCountInput.max = MAX_MAX_BOX_COUNT;
  boxCountInput.min = MIN_BOX_COUNT;
  mediumBoxCountInput.min = MIN_BOX_COUNT;
  maxBoxCountInput.min = MIN_BOX_COUNT;

  effect(() => (shouldSample.checked = shouldSample.value ? "checked" : ""));
  effect(() => (autoIncr.checked = autoIncr.value ? "checked" : ""));
  effect(() => (maxBoxCountLabel.textContent = maxBoxCount.value.toLocaleString("en")));

  effect(() => console.log("should sample:", shouldSample.value ? "enabled" : "disabled"));
  effect(() => console.log("auto-incr:", autoIncr.value ? "enabled" : "disabled"));

  effect(() => {
    const currentMaxBoxCount = maxBoxCount.value;
    labelText.textContent = `${MIN_BOX_COUNT_LABEL} to ${currentMaxBoxCount.toLocaleString("en")}`;
    boxCountInput.max = currentMaxBoxCount;
    boxCountInput.value = Math.min(currentMaxBoxCount, Number(boxCountInput.value));
    maxBoxCountInput.value = currentMaxBoxCount;

    const currentMediumMaxBoxCount = mediumMaxBoxCount.value;
    labelTextMedium.textContent = `${MIN_BOX_COUNT_LABEL} to ${currentMediumMaxBoxCount.toLocaleString("en")}`;
    mediumBoxCountInput.max = currentMediumMaxBoxCount;

    const currentSmallMaxBoxCount = smallMaxBoxCount.value;
    labelTextSmall.textContent = `${MIN_BOX_COUNT_LABEL} to ${currentSmallMaxBoxCount.toLocaleString("en")}`;
    smallBoxCountInput.max = currentSmallMaxBoxCount;

    const currentBoxCount = boxCount.value;
    boxCountLabel.textContent = currentBoxCount.toLocaleString("en");
    boxCountInput.value = currentBoxCount;
    mediumBoxCountInput.value = currentBoxCount;
    smallBoxCountInput.value = currentBoxCount;
  });

  const MAX_SAMPLES = 2_500;
  const ctxRequest = request.getContext("2d");
  const ctxTimeout = timeout.getContext("2d");

  const samplerRequest = makeSampler({
    maxSamples: MAX_SAMPLES,
    measureIntervalMs: MEASURE_INTERVAL_BOX,
    get active() {
      return shouldSample.value;
    },
    get samples() {
      return requestSamples.value;
    },
    set samples(value) {
      requestSamples.value = value;
    },
  });

  const samplerTimeout = makeSampler({
    maxSamples: MAX_SAMPLES,
    measureIntervalMs: MEASURE_INTERVAL_MS,
    get active() {
      return shouldSample.value;
    },
    get samples() {
      return timeoutSamples.value;
    },
    set samples(value) {
      timeoutSamples.value = value;
    },
  });

  const startRequestRenderer = makeRenderer({
    name: "requestAnimationFrame",
    ctx: ctxRequest,
    sampler: samplerRequest,
    nextFrameStrategy: (loop) => () => requestAnimationFrame(loop),
    get numberOfBoxesToDraw() {
      return boxCount.value;
    },
    get active() {
      return window.playRequest.checked;
    },
  });

  const startTimeoutRenderer = makeRenderer({
    name: "setTimeout(0)",
    ctx: ctxTimeout,
    sampler: samplerTimeout,
    nextFrameStrategy: (loop) => {
      let lastTimeoutId = null;
      return () => {
        if (lastTimeoutId) {
          clearTimeout(lastTimeoutId);
        }
        lastTimeoutId = setTimeout(() => loop(Date.now()), 0);
      };
    },
    get numberOfBoxesToDraw() {
      return boxCount.value;
    },
    get active() {
      return window.playTimeout.checked;
    },
  });

  startRequestRenderer();
  startTimeoutRenderer();

  const updateChart = makeChart({
    canvas: fpsCanvas,
    dataSources: [
      {
        label: "requestAnimationFrame",
        get data() {
          return requestSamples.value;
        },
      },
      {
        label: "setTimeout(0)",
        get data() {
          return timeoutSamples.value;
        },
      },
    ],
    chartUpdateIntervalMs: 1000,
  });

  effect(() => updateChart(requestSamples.value));

  setInterval(() => {
    if (!autoIncr.value) return;
    boxCount.value = (boxCount.value + MEASURE_INTERVAL_BOX) % maxBoxCount.value;
  }, MEASURE_INTERVAL_MS);
});
