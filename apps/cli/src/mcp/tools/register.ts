import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZodRawShape, z } from 'zod';

import { ToolResult } from '../errors';

export type ToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export function registerTool<Schema extends ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  schema: Schema,
  annotations: ToolAnnotations,
  handler: (args: z.objectOutputType<Schema, z.ZodTypeAny>) => Promise<ToolResult>
): void;
export function registerTool(
  server: McpServer,
  name: string,
  description: string,
  annotations: ToolAnnotations,
  handler: () => Promise<ToolResult>
): void;
export function registerTool(
  server: McpServer,
  name: string,
  description: string,
  schemaOrAnnotations: ZodRawShape | ToolAnnotations,
  annotationsOrHandler: ToolAnnotations | (() => Promise<ToolResult>),
  maybeHandler?: (args: any) => Promise<ToolResult>
): void {
  // The @modelcontextprotocol/sdk `tool()` overloads cause TS2589 ("type
  // instantiation is excessively deep") when the inferred `Args` involves
  // `.optional()` — the conditional `BaseToolCallback` tries to distribute
  // over the v3/v4 zod union. Cast to `any` at the boundary; the public
  // signature above still gives callers typed args.
  const anyServer = server as any;
  if (typeof annotationsOrHandler === 'function') {
    anyServer.tool(name, description, schemaOrAnnotations, annotationsOrHandler);
  } else {
    anyServer.tool(name, description, schemaOrAnnotations, annotationsOrHandler, maybeHandler);
  }
}
