import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { dispatchCliAsync } from '../dispatch';
import { toToolResult } from '../errors';
import { registerTool } from './register';

export function registerCheckToolsTool(server: McpServer) {
  registerTool(
    server,
    'check_tools',
    'Validate that the local iOS and/or Android development tools are installed (Xcode, Android SDK). Returns success or a structured failure reason per platform.',
    {
      platform: z
        .enum(['ios', 'android', 'all'])
        .optional()
        .describe('Filter by platform. Defaults to "all".'),
    },
    { readOnlyHint: true, openWorldHint: false, title: 'Check development tools' },
    async ({ platform }) => {
      const result = await dispatchCliAsync('check-tools', [
        '--platform',
        platform ?? 'all',
      ]);
      return toToolResult(result);
    }
  );
}
