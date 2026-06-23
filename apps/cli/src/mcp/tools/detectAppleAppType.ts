import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { dispatchCliAsync } from '../dispatch';
import { toToolResult } from '../errors';
import { registerTool } from './register';

export function registerDetectAppleAppTypeTool(server: McpServer) {
  registerTool(
    server,
    'detect_apple_app_type',
    'Inspect a local .app, .ipa, or build archive and report whether it targets a simulator or a physical device, plus its bundle identifier.',
    {
      appPath: z
        .string()
        .min(1)
        .describe('Local path to the .app, .ipa, or archive containing the app.'),
    },
    { readOnlyHint: true, openWorldHint: false, title: 'Detect Apple app type' },
    async ({ appPath }) => {
      const result = await dispatchCliAsync('detect-apple-app-type', [appPath]);
      return toToolResult(result);
    }
  );
}
