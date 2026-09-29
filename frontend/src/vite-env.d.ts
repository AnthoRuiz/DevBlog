/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_ROLE_TESTING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
