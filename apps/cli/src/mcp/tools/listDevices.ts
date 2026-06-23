import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { dispatchCliAsync } from '../dispatch';
import { toToolResult } from '../errors';
import { registerTool } from './register';

export function registerListDevicesTool(server: McpServer) {
  registerTool(
    server,
    'list_devices',
    'List connected iOS devices, iOS/tvOS/watchOS simulators, Android devices, and Android emulators.',
    {
      platform: z
        .enum(['ios', 'android', 'tvos', 'watchos', 'all'])
        .optional()
        .describe('Filter by platform. Defaults to "all".'),
    },
    { readOnlyHint: true, openWorldHint: false, title: 'List devices' },
    async ({ platform }) => {
      const result = await dispatchCliAsync('list-devices', [
        '--platform',
        platform ?? 'all',
      ]);
      return toToolResult(result);
    }
  );
}
