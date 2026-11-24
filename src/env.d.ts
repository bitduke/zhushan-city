declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}

declare const wx: any;

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_CLOUDBASE_ENV_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
