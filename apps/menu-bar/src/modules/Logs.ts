import { Platform } from 'react-native';

export type Log = { command: string; info: string };
export class Logs {
  private logs: Log[] = [];

  push(log: Log) {
    if (Platform.OS === 'web') {
      const logs = this.get();
      logs.push(log);
      localStorage.setItem('logs', JSON.stringify(logs));
    } else {
      this.logs.push(log);
    }
  }

  get(): Log[] {
    if (Platform.OS === 'web') {
      return JSON.parse(localStorage.getItem('logs') ?? '[]');
    }
    return this.logs ?? [];
  }
}
