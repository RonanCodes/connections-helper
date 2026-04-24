/// <reference types="vite/client" />

declare module '*.wasm' {
  const value: WebAssembly.Module
  export default value
}

declare module '*.ttf?url' {
  const src: string
  export default src
}
