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
