/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BI_HOME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
