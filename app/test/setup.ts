import "@testing-library/jest-dom/vitest"

// jsdom lacks ResizeObserver; the corpora-ui app layout observes its shell
// on mount, so without this stub every route inside the layout crashes to
// the root ErrorBoundary.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as typeof ResizeObserver

// jsdom also lacks the Web Animations API; Base UI's ScrollArea polls
// viewport.getAnimations() on a timer, which otherwise surfaces as dozens
// of unhandled TypeErrors after the tests themselves have passed.
Element.prototype.getAnimations ??= () => []

// jsdom lacks matchMedia; the sidebar's useMediaQuery hook needs it
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
