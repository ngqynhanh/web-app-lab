import { storage } from "./ui.js";
// A small reducer keeps all persistent client transitions in one place.
const KEY = "lab03-client-v1";
export function createStore() {
  const initial = storage.read(KEY, {});
  let state = {
    cart: [],
    queue: [],
    profile: {},
    history: [],
    future: [],
    ...initial,
  };
  const listeners = new Set();
  function dispatch(action) {
    switch (action.type) {
      case "CART_ADD":
        if (!state.cart.some((c) => c.code === action.item.code))
          state = { ...state, cart: [...state.cart, action.item] };
        break;
      case "CART_REMOVE":
        state = {
          ...state,
          cart: state.cart.filter((c) => c.code !== action.code),
        };
        break;
      case "SECTION":
        state = {
          ...state,
          cart: state.cart.map((c) =>
            c.code === action.code ? { ...c, sectionId: action.sectionId } : c,
          ),
        };
        break;
      case "PROFILE":
        state = { ...state, profile: action.profile };
        break;
      case "QUEUE":
        state = { ...state, queue: [...state.queue, action.operation] };
        break;
      case "COMMIT": {
        const { operation, command } = action;
        const mode = operation.mode || "normal";
        state = {
          ...state,
          queue: state.queue.filter((o) => o.requestId !== operation.requestId),
          cart:
            operation.kind === "enroll"
              ? state.cart.filter((c) => c.code !== operation.code)
              : state.cart,
        };
        if (mode === "undo")
          state = {
            ...state,
            history: state.history.slice(0, -1),
            future: [...state.future, command],
          };
        else if (mode === "redo")
          state = {
            ...state,
            history: [...state.history, command],
            future: state.future.slice(0, -1),
          };
        else
          state = {
            ...state,
            history: [...state.history, command],
            future: [],
          };
        break;
      }
      case "DEQUEUE":
        state = {
          ...state,
          queue: state.queue.filter((o) => o.requestId !== action.requestId),
        };
        break;
      case "HISTORY":
        state = {
          ...state,
          history: [...state.history, action.command],
          future: [],
        };
        break;
      case "UNDO_DONE":
        state = {
          ...state,
          history: state.history.slice(0, -1),
          future: [...state.future, action.command],
        };
        break;
      case "REDO_DONE":
        state = {
          ...state,
          history: [...state.history, action.command],
          future: state.future.slice(0, -1),
        };
        break;
    }
    storage.write(KEY, state);
    listeners.forEach((fn) => fn(state));
  }
  return {
    getState: () => state,
    dispatch,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
