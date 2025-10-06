/// <reference types="vite/client" />

interface Window {
  api?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
}
