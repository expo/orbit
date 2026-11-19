import { Platform } from 'react-native';

// `ok` is a command's result, `info` its streamed output or a Debug Menu action, `error` a failure.
export type LogLevel = 'ok' | 'info' | 'error';
export type Log = { id: string; time: number; level: LogLevel; command: string; info: string };

export class Logs {
  private logs: Log[] = [];
  private listeners = new Set<() => void>();

  push({ level = 'ok', ...log }: { command: string; info: string; level?: LogLevel }) {
    const entry = { ...log, level, time: Date.now(), id: Math.random().toString(36).slice(2) };
    if (Platform.OS === 'web') {
      const logs = this.get();
      logs.push(entry);
      localStorage.setItem('logs', JSON.stringify(logs));
    } else {
      // A new array, so a subscriber's setState sees the change.
      this.logs = [...this.logs, entry];
    }
    this.listeners.forEach((listener) => listener());
  }

  clear() {
    if (Platform.OS === 'web') {
      localStorage.removeItem('logs');
    } else {
      this.logs = [];
    }
    this.listeners.forEach((listener) => listener());
  }

  // Calls `listener` after each push. On web every window has its own JS runtime, so pushes
  // from other windows arrive through the localStorage `storage` event.
  subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => event.key === 'logs' && listener();
    this.listeners.add(listener);
    if (Platform.OS === 'web') window.addEventListener('storage', onStorage);
    return () => {
      this.listeners.delete(listener);
      if (Platform.OS === 'web') window.removeEventListener('storage', onStorage);
    };
  }

  get(): Log[] {
    if (Platform.OS === 'web') {
      return JSON.parse(localStorage.getItem('logs') ?? '[]');
    }
    return this.logs ?? [];
  }
}
