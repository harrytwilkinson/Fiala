/// <reference types="vite/client" />

/** False in store builds (`vite build --mode store`), which omit the dose converter. */
declare const __CONVERTER__: boolean;
