export type DesktopBridge = {
  isDesktop(): boolean;
  notify(message: string): Promise<void>;
  saveExport?(filename: string, content: string): Promise<void>;
};

export const browserDesktopBridge: DesktopBridge = {
  isDesktop() {
    return false;
  },
  async notify(message: string) {
    console.info(`[browserDesktopBridge] ${message}`);
  }
};
