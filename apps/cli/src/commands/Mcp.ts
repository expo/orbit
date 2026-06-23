import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import http, { IncomingMessage, ServerResponse } from 'http';

import { ensureMcpTokenAsync, isAuthorized, isLocalhost } from '../mcp/auth';
import { registerPhase1Tools } from '../mcp/tools';

const SERVER_INFO = { name: 'expo-orbit', version: '0.1.0' };
const MAX_BODY_BYTES = 4 * 1024 * 1024;

type McpOptions = {
  port?: string;
  token?: string;
};

export async function mcpServerAsync(options: McpOptions = {}): Promise<void> {
  const port = parsePort(options.port);
  const token = await ensureMcpTokenAsync(options.token);

  const httpServer = http.createServer((req, res) => {
    handleRequest(req, res, token).catch((err) => {
      logErr('unhandled request error', err);
      writeError(res, 500, 'Internal Server Error');
    });
  });

  httpServer.on('error', (err) => {
    logErr('HTTP server error', err);
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, '127.0.0.1', () => resolve());
  });

  const address = httpServer.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  log(`Expo Orbit MCP listening on http://127.0.0.1:${boundPort}/mcp`);
  log(`Token: ${token}`);

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, token: string) {
  if (!isLocalhost(req.socket.remoteAddress)) {
    return writeError(res, 403, 'Forbidden');
  }

  if (!isAuthorized(req.headers.authorization, token)) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return writeError(res, 401, 'Unauthorized');
  }

  const url = req.url ?? '';
  const pathOnly = url.split('?')[0];
  if (pathOnly !== '/mcp') {
    return writeError(res, 404, 'Not Found');
  }

  let body: unknown;
  if (req.method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch (err) {
      return writeError(res, 400, err instanceof Error ? err.message : 'Bad Request');
    }
  }

  const server = new McpServer(SERVER_INFO);
  registerPhase1Tools(server);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on('close', () => {
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  let total = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function writeError(res: ServerResponse, status: number, message: string) {
  if (!res.headersSent) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
  }
  res.end(JSON.stringify({ error: message }));
}

function parsePort(value: string | undefined): number {
  const parsed = value ? Number(value) : NaN;
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) return parsed;
  return 8765;
}

function log(message: string) {
  process.stderr.write(`[mcp] ${message}\n`);
}

function logErr(message: string, error: unknown) {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`[mcp] ${message}: ${detail}\n`);
}
