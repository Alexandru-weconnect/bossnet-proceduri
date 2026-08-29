/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOSSNET_API_URL?: string;
  readonly VITE_ENABLE_MOCK_AUTH?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PREVIEW_EMAIL?: string;
  readonly VITE_PREVIEW_SYSTEM_ROLE?: "admin" | "editor";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
