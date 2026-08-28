/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOSSNET_API_URL?: string;
  readonly VITE_ENABLE_MOCK_AUTH?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
