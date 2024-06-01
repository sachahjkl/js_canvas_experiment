// this allows exporting any name to the js global scope
export function makeGlobal(...args) {
  args.forEach((it) => Object.assign(window, it));
}

// signals

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

// state

/**
 * @function
 * @template T
 * @param {T} initialValue
 */
export function makeState(initialValue) {
  let state = {
    /** @type {T} */
    value: initialValue,
    /** @type {Array<{source: HTMLElement, setter: (v: T) => void }>} */
    subscribers: [],
    /** @type {(source: HTMLElement, newValue: T) => void} */
    update: (source, newValue) => {
      state.value = newValue;
      state.subscribers.filter((s) => source !== s.source).forEach((s) => s.setter(newValue));
    },
  };

  /**
   * @type {[ () => T, (source: HTMLElement, newValue: T) => void, (source: HTMLElement, setter: (v: T) => void) => void ]}
   */
  let stateAccess = [
    (get) => state.value,
    state.update,
    (source, setter) => state.subscribers.push({ source, setter }),
  ];
  return stateAccess;
}
