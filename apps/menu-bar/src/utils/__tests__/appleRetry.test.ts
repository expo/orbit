import { parseRetryLine, retryNoticeMessage } from '../appleRetry';

describe(parseRetryLine, () => {
  it('parses a retry line emitted by the CLI', () => {
    const info = parseRetryLine('retry: {"attempt":2,"maxAttempts":5,"delayMs":4000,"status":503}');
    expect(info).toEqual({ attempt: 2, maxAttempts: 5, delayMs: 4000, status: 503 });
  });

  it('parses a retry with no status (the transport threw)', () => {
    const info = parseRetryLine('retry: {"attempt":1,"maxAttempts":5,"delayMs":2000}');
    expect(info?.attempt).toBe(1);
    expect(info?.status).toBeUndefined();
  });

  it('ignores an ordinary progress line', () => {
    expect(parseRetryLine('step: authenticating')).toBeNull();
    expect(parseRetryLine('retrying later')).toBeNull();
  });

  it('ignores a retry prefix with malformed or incomplete JSON', () => {
    expect(parseRetryLine('retry: not json')).toBeNull();
    expect(parseRetryLine('retry: {"attempt":2}')).toBeNull();
  });
});

describe(retryNoticeMessage, () => {
  it('renders a short, 1-based progress notice', () => {
    expect(retryNoticeMessage({ attempt: 2, maxAttempts: 5, delayMs: 4000 })).toBe(
      "Apple's servers are busy. Retrying… (2 of 5)"
    );
  });
});
