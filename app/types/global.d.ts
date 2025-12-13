interface Window {
  tronWeb: TronWeb | undefined;
  tronLink?: {
    ready: boolean;
    tronWeb: TronWeb;
    request: <M extends string, P = unknown, R = unknown>(args: { method: M; params?: P }) => Promise<R>;
  };
}
