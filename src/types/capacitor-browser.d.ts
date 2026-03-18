declare module '@capacitor/browser' {
  export const Browser: {
    open(options: { url: string }): Promise<void>;
  };
}
