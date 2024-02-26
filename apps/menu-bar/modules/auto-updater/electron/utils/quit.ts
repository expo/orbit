import { app } from 'electron';

export function quit() {
  if (app) {
    app.quit();
  } else {
    process.exit();
  }
}
