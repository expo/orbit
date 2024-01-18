const DeviceEventEmitter = {
  addListener(eventType: string, listener: (event: any) => void) {
    (globalThis as any)?.electron?.addListener(eventType, listener);

    return {
      remove: () => {},
    };
  },
};

export { DeviceEventEmitter };
