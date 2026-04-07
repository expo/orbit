import { app as electronApp } from 'electron';
import express, { Express } from 'express';
import path from 'path';

import { getUserSettingsJsonFile } from '../../modules/menu-bar/electron/main';
import spawnCliAsync from '../../modules/menu-bar/electron/spawnCliAsync';

const PORTS = [35783, 47909, 44171, 50799];
const WHITELISTED_DOMAINS = ['expo.dev', 'expo.test', 'exp.host', 'localhost'];

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
      if (!origin || !WHITELISTED_DOMAINS.includes(this.extractRootDomain(origin))) {
        res.sendStatus(403);
        return;
      }

      res.set('Access-Control-Allow-Origin', origin);
      next();
    });
  }

  setupRoutes() {
    this.app.get('/orbit/status', (_, res) => {
      res.json({ ok: true, version: electronApp.getVersion() });
    });

    this.app.get('/orbit/open', (req, res) => {
      const urlParam = req.query.url as string | undefined;
      if (!urlParam) {
        res.sendStatus(400);
        return;
      }

      // Extract the path and query from the URL to build a clean deeplink.
      // This handles URLs from orbit.expo.dev and expo-orbit.expo.app,
      // converting e.g. https://orbit.expo.dev/download?url=... to expo-orbit:///download?url=...
      let deeplinkURL: string;
      try {
        const parsed = new URL(urlParam);
        deeplinkURL = `expo-orbit://${parsed.pathname}${parsed.search}`;
      } catch {
        deeplinkURL = urlParam
          .replace('https://', 'expo-orbit://')
          .replace('exp://', 'expo-orbit://');
      }

      electronApp.emit('open-url', null, deeplinkURL);
      res.json({ ok: true });
    });

    this.app.get('/orbit/devices', async (req, res) => {
      const cliPath = path.join(__dirname, './cli/index.js');

      const userSettingsJsonFile = getUserSettingsJsonFile();
      const { envVars } = await userSettingsJsonFile.readAsync();

      try {
        const commandOutput = await spawnCliAsync(cliPath, 'list-devices', [], undefined, envVars);

        res.json(JSON.parse(commandOutput));
      } catch (error) {
        res.json({ error: `Failed to run CLI: ${error instanceof Error ? error.message : error}` });
      }
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
        const pathSegments = originUrl.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 1) {
          hostName = pathSegments[1];
        }
      }
      const components = hostName.split('.');
      return components.slice(-2).join('.');
    } catch (error) {
      console.error('Error extracting root domain:', error);
      return '';
    }
  }
}
