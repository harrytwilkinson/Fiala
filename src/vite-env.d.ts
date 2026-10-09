/// <reference types="vite/client" />

/** False in store builds (`vite build --mode store`), which omit the dose converter. */
declare const __CONVERTER__: boolean;

interface ImportMetaEnv {
  /** Fiala Plus unlock-code public key (hex), set at build time. */
  readonly VITE_PLUS_PUBLIC_KEY?: string;
}
