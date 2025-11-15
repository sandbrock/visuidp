/// <reference types="vite/client" />

declare global {
  var localStorage: Storage;
  var global: typeof globalThis;
}

export {};
