declare module "*?binary" {
  const value: Uint8Array<ArrayBuffer>;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_BUILD_DATE: string;
  readonly VITE_COMMIT_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
