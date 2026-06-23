import { fork } from 'child_process';

export type CliErrorPayload = {
  name?: string;
  code?: string;
  message: string;
  details?: unknown;
  stack?: string;
};

export type DispatchResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: CliErrorPayload };

export async function dispatchCliAsync<T = unknown>(
  command: string,
  args: string[] = []
): Promise<DispatchResult<T>> {
  const cliPath = process.argv[1];

  return new Promise<DispatchResult<T>>((resolve) => {
    const child = fork(cliPath, [command, ...args], {
      env: { ...process.env, EXPO_MENU_BAR: 'true' },
      stdio: 'pipe',
    });

    let mode: 'pre' | 'return' | 'error' = 'pre';
    let payload = '';
    let stderr = '';

    const handleStream = (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line === '') continue;
        if (line === '---- return output ----') {
          mode = 'return';
        } else if (line === '---- thrown error ----') {
          mode = 'error';
        } else if (mode !== 'pre') {
          payload += line;
        }
      }
    };

    child.stdout?.on('data', handleStream);
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
      handleStream(d);
    });

    child.once('close', () => {
      if (mode === 'error') {
        try {
          resolve({ ok: false, error: JSON.parse(payload) });
        } catch {
          resolve({
            ok: false,
            error: { message: payload || stderr || 'CLI exited with an unparseable error' },
          });
        }
        return;
      }

      if (mode === 'return') {
        try {
          resolve({ ok: true, value: JSON.parse(payload) as T });
        } catch {
          resolve({ ok: true, value: payload as unknown as T });
        }
        return;
      }

      resolve({
        ok: false,
        error: { message: stderr.trim() || 'CLI exited without producing output' },
      });
    });

    child.once('error', (err) => {
      resolve({ ok: false, error: { message: err.message, name: err.name } });
    });
  });
}
