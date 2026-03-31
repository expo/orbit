import { ChildProcess, spawn } from 'child_process';
import WebSocket from 'ws';

type Platform = 'ios' | 'android';

interface StreamSession {
  deviceId: string;
  platform: Platform;
  process: ChildProcess;
  clients: Set<WebSocket>;
}

export class StreamManager {
  private sessions: Map<string, StreamSession> = new Map();

  startStream(deviceId: string, platform: Platform, ws: WebSocket): void {
    const existing = this.sessions.get(deviceId);
    if (existing) {
      existing.clients.add(ws);
      ws.send(JSON.stringify({ type: 'started', deviceId, platform }));
      return;
    }

    const captureProcess = this.spawnCaptureProcess(deviceId, platform);
    if (!captureProcess) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to start capture process' }));
      return;
    }

    const session: StreamSession = {
      deviceId,
      platform,
      process: captureProcess,
      clients: new Set([ws]),
    };

    this.sessions.set(deviceId, session);

    captureProcess.stdout?.on('data', (chunk: Buffer) => {
      if (platform === 'ios') {
        this.broadcastJpegFrames(session, chunk);
      } else {
        this.broadcastRaw(session, chunk);
      }
    });

    captureProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString();
      console.error(`[stream:${deviceId}] ${message}`);
    });

    captureProcess.on('close', (code) => {
      console.log(`[stream:${deviceId}] capture process exited with code ${code}`);
      for (const client of session.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'stopped', deviceId }));
        }
      }
      this.sessions.delete(deviceId);
    });

    captureProcess.on('error', (err) => {
      console.error(`[stream:${deviceId}] capture process error:`, err);
      for (const client of session.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'error', message: err.message }));
        }
      }
      this.sessions.delete(deviceId);
    });

    ws.send(JSON.stringify({ type: 'started', deviceId, platform }));
  }

  stopStream(deviceId: string, ws: WebSocket): void {
    const session = this.sessions.get(deviceId);
    if (!session) {
      return;
    }

    session.clients.delete(ws);

    if (session.clients.size === 0) {
      session.process.kill('SIGTERM');
      this.sessions.delete(deviceId);
    }
  }

  removeClient(ws: WebSocket): void {
    for (const [deviceId, session] of this.sessions) {
      if (session.clients.has(ws)) {
        session.clients.delete(ws);
        if (session.clients.size === 0) {
          session.process.kill('SIGTERM');
          this.sessions.delete(deviceId);
        }
      }
    }
  }

  private spawnCaptureProcess(deviceId: string, platform: Platform): ChildProcess | null {
    if (platform === 'ios') {
      return this.spawnIosCapture(deviceId);
    } else if (platform === 'android') {
      return this.spawnAndroidCapture(deviceId);
    }
    return null;
  }

  private spawnIosCapture(deviceId: string): ChildProcess {
    // Continuous JPEG screenshot capture via xcrun simctl
    // The shell loop captures screenshots at ~10fps and writes JPEG to stdout
    // with a 4-byte length prefix for frame delimiting
    return spawn('bash', [
      '-c',
      `while true; do
        frame=$(xcrun simctl io ${deviceId} screenshot --type=jpeg -)
        if [ $? -eq 0 ] && [ -n "$frame" ]; then
          len=$(echo -n "$frame" | wc -c)
          printf '%08x' "$len"
          echo -n "$frame"
        fi
        sleep 0.08
      done`,
    ]);
  }

  private spawnAndroidCapture(deviceId: string): ChildProcess {
    // Use adb screenrecord to stream h264 to stdout
    return spawn('adb', [
      '-s',
      deviceId,
      'shell',
      'screenrecord',
      '--output-format=h264',
      '--size',
      '720x1280',
      '-',
    ]);
  }

  // iOS frames are JPEG with a hex length prefix (8 chars)
  private jpegBuffers: Map<string, Buffer> = new Map();

  private broadcastJpegFrames(session: StreamSession, chunk: Buffer): void {
    const deviceId = session.deviceId;
    const existing = this.jpegBuffers.get(deviceId);
    const buffer = existing ? Buffer.concat([existing, chunk]) : chunk;

    let offset = 0;
    while (offset + 8 <= buffer.length) {
      const lenHex = buffer.subarray(offset, offset + 8).toString('ascii');
      const frameLen = parseInt(lenHex, 16);

      if (isNaN(frameLen) || frameLen <= 0) {
        // Corrupted frame header, skip a byte and try again
        offset++;
        continue;
      }

      if (offset + 8 + frameLen > buffer.length) {
        break; // Incomplete frame, wait for more data
      }

      const frame = buffer.subarray(offset + 8, offset + 8 + frameLen);
      this.broadcastRaw(session, frame);
      offset += 8 + frameLen;
    }

    if (offset < buffer.length) {
      this.jpegBuffers.set(deviceId, buffer.subarray(offset));
    } else {
      this.jpegBuffers.delete(deviceId);
    }
  }

  private broadcastRaw(session: StreamSession, data: Buffer): void {
    for (const client of session.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}
