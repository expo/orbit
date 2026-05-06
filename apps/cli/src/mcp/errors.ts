import { CliErrorPayload, DispatchResult } from './dispatch';

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export function toToolResult<T>(
  result: DispatchResult<T>,
  formatValue: (value: T) => string = defaultFormat
): ToolResult {
  if (result.ok) {
    return { content: [{ type: 'text', text: formatValue(result.value) }] };
  }
  return {
    isError: true,
    content: [{ type: 'text', text: formatErrorMessage(result.error) }],
  };
}

function formatErrorMessage(error: CliErrorPayload): string {
  const code = error.code ? `[${error.code}] ` : '';
  return `${code}${error.message}`;
}

function defaultFormat(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
