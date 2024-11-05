import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
export { Response, RequestInit } from 'node-fetch';
import https from 'https';
import { systemCertsSync } from 'system-ca';

let ca: string[] | undefined = undefined;
try {
  ca = systemCertsSync({ includeNodeCertificates: true });
} catch (error) {}
const agent = new https.Agent({
  ca,
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
