import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
export * from 'node-fetch';
import { systemCertsSync } from 'system-ca';
import https from 'https';

const agent = new https.Agent({
  ca: systemCertsSync({ includeNodeCertificates: true }),
});

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly response: Response
  ) {
    super(message);
  }
}

export default async function (url: RequestInfo, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    agent,
    ...init,
  });
  if (response.status >= 400) {
    throw new RequestError(`Request failed: ${response.status} (${response.statusText})`, response);
  }
  return response;
}
