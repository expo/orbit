import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerCheckToolsTool } from './checkTools';
import { registerDetectAppleAppTypeTool } from './detectAppleAppType';
import { registerListDevicesTool } from './listDevices';
import { registerTrustedSourcesTools } from './trustedSources';

export function registerPhase1Tools(server: McpServer) {
  registerListDevicesTool(server);
  registerCheckToolsTool(server);
  registerTrustedSourcesTools(server);
  registerDetectAppleAppTypeTool(server);
}
