import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { dispatchCliAsync } from '../dispatch';
import { toToolResult } from '../errors';
import { registerTool } from './register';

export function registerTrustedSourcesTools(server: McpServer) {
  registerTool(
    server,
    'get_trusted_sources',
    'Return the user-configured allowlist of URL glob patterns from which Orbit will download builds and updates.',
    { readOnlyHint: true, openWorldHint: false, title: 'Get trusted sources' },
    async () => {
      const result = await dispatchCliAsync<string[]>('get-custom-trusted-sources');
      return toToolResult(result);
    }
  );
}
