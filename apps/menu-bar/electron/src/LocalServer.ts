import { app as electronApp } from 'electron';
import express, { Express } from 'express';

const PORTS = [35783, 47909, 44171, 50799];
const WHITELISTED_DOMAINS = ['expo.dev', 'expo.test', 'exp.host'];

export class LocalServer {
  app: Express;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
  }

  setupMiddlewares() {
    this.app.use((req, res, next) => {
      const origin = req.get('origin');
      const referer = req.get('referer');
      if (!origin || !referer || !WHITELISTED_DOMAINS.includes(this.extractRootDomain(origin))) {
        res.sendStatus(403);
        return;
      }
      next();
    });
  }

  setupRoutes() {
    this.app.get('/orbit/status', (_, res) => {
      res.json({ ok: true, version: electronApp.getVersion() });
    });

    this.app.get('/orbit/open', (req, res) => {
      const urlParam = req.query.url as string | undefined;
      if (!urlParam || !WHITELISTED_DOMAINS.includes(this.extractRootDomain(urlParam))) {
        res.sendStatus(400);
        return;
      }

      const deeplinkURL = urlParam
        .replace('https://', 'expo-orbit://')
        .replace('exp://', 'expo-orbit://');

      electronApp.emit('open-url', null, deeplinkURL);
      res.json({ ok: true });
    });
  }

  start(port: number = PORTS[0]) {
    this.app
      .listen(port, () => {
        console.log(`Local server running on port ${port}`);
      })
      .on('error', (err) => {
        console.error(`Failed to start server on port ${port}: ${err.message}`);
        const nextPort = PORTS[PORTS.indexOf(port) + 1];
        if (nextPort) {
          this.start(nextPort);
        } else {
          console.error(`Server start error: ${err.message}`);
        }
      });
  }

  extractRootDomain(urlString: string) {
    try {
      const originUrl = new URL(decodeURIComponent(urlString));
      let hostName = originUrl.hostname;

      if (!hostName) {
        // Orbit deeplink may include specific routes in the URL e.g. /update, /snack, /download, etc.
        const urlStringFromParams = originUrl.searchParams.get('url');
        const urlFromParams = new URL(decodeURIComponent(urlStringFromParams));
        hostName = urlFromParams.hostname;
      }

      if (!hostName.includes('.')) {
        hostName = originUrl.pathname.split('/').filter(Boolean)[1];
      }
      const components = hostName.split('.');
      return components.slice(-2).join('.');
    } catch (error) {
      console.error('Error extracting root domain:', error);
      return '';
    }
  }
}
