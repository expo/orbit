import { Platform } from 'react-native';

export type Log = { command: string; info: string };
export class Logs {
  private logs = this.get();

  push(log: Log) {
    this.logs.push(log);
    if (Platform.OS === 'web') {
      localStorage.setItem('logs', JSON.stringify(this.logs));
    }
  }

  get(): Log[] {
    if (Platform.OS === 'web') {
      return JSON.parse(localStorage.getItem('logs') ?? '[]');
    }
    return this.logs ?? [];
  }
}
