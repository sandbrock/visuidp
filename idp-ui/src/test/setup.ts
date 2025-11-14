import '@testing-library/jest-dom';

// Mock localStorage for tests
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};

(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = localStorageMock as unknown as Storage;

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = () => {};
