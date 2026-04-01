import { app as electronApp } from 'electron';
import express, { Express } from 'express';
import http from 'http';
import path from 'path';
import WebSocket, { WebSocketServer } from 'ws';

import { StreamManager } from './StreamManager';
import { getUserSettingsJsonFile } from '../../modules/menu-bar/electron/main';
import spawnCliAsync from '../../modules/menu-bar/electron/spawnCliAsync';

const PORTS = [35783, 47909, 44171, 50799];
const WHITELISTED_DOMAINS = ['expo.dev', 'expo.test', 'exp.host', 'localhost'];

export class LocalServer {
  app: Express;
  streamManager: StreamManager;

  constructor() {
    this.app = express();
    this.streamManager = new StreamManager();
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

      const deeplinkURL = urlParam
        .replace('https://', 'expo-orbit://')
        .replace('exp://', 'expo-orbit://');

      electronApp.emit('open-url', null, deeplinkURL);
      res.json({ ok: true });
    });

    // List available devices using the CLI with proper env vars from user settings
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

    // Serve the stream viewer page
    this.app.get('/orbit/stream', (_, res) => {
      res.sendFile(path.join(__dirname, './static/stream.html'));
    });
  }

  setupWebSocket(server: http.Server) {
    const wss = new WebSocketServer({ server, path: '/orbit/ws' });

    wss.on('connection', (ws: WebSocket) => {
      console.log('[ws] client connected');

      ws.on('message', (raw: WebSocket.RawData) => {
        let msg: {
          type: string;
          deviceId?: string;
          platform?: 'ios' | 'android';
          captureMode?: 'auto' | 'mjpeg' | 'h264';
        };
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
          return;
        }

        switch (msg.type) {
          case 'start':
            if (!msg.deviceId || !msg.platform) {
              ws.send(
                JSON.stringify({ type: 'error', message: 'deviceId and platform are required' })
              );
              return;
            }
            this.streamManager.startStream(msg.deviceId, msg.platform, ws, msg.captureMode);
            break;

          case 'stop':
            if (msg.deviceId) {
              this.streamManager.stopStream(msg.deviceId, ws);
            }
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
        }
      });

      ws.on('close', () => {
        console.log('[ws] client disconnected');
        this.streamManager.removeClient(ws);
      });
    });
  }

  start(port: number = PORTS[0]) {
    const server = http.createServer(this.app);
    this.setupWebSocket(server);

    server
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
