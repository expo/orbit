import {
  isMultipartPartWithName,
  parseMultipartMixedResponseAsync,
} from '@expo/multipart-body-parser';
import { NewManifest } from 'expo-manifests';

export type Manifest = NewManifest;

type AssetRequestHeaders = { authorization: string };

async function getManifestBodyAsync(response: Response): Promise<{
  manifest: Manifest;
  assetRequestHeaders: {
    [assetKey: string]: AssetRequestHeaders;
  };
}> {
  const contentType = response.headers.get('content-type');
  if (!contentType) {
    throw new Error('The multipart manifest response is missing the content-type header');
  }

  if (contentType === 'application/expo+json' || contentType === 'application/json') {
    const text = await response.text();
    return { manifest: JSON.parse(text), assetRequestHeaders: {} };
  }

  const bodyBuffer = await response.arrayBuffer();
  const multipartParts = await parseMultipartMixedResponseAsync(
    contentType,
    Buffer.from(bodyBuffer)
  );

  const manifestPart = multipartParts.find((part) => isMultipartPartWithName(part, 'manifest'));
  if (!manifestPart) {
    throw new Error('The multipart manifest response is missing the manifest part');
  }

  const extensionsPart = multipartParts.find((part) => isMultipartPartWithName(part, 'extensions'));
  const assetRequestHeaders = extensionsPart
    ? JSON.parse(extensionsPart.body).assetRequestHeaders
    : {};

  return { manifest: JSON.parse(manifestPart.body), assetRequestHeaders };
}

export async function getManifestAsync(url: string): Promise<{
  manifest: Manifest;
  assetRequestHeaders: {
    [assetKey: string]: AssetRequestHeaders;
  };
}> {
  const response = await fetch(url.replace('exp://', 'http://').replace('exps://', 'https://'), {
    method: 'GET',
    headers: {
      accept: 'multipart/mixed,application/expo+json,application/json',
    },
  });
  return await getManifestBodyAsync(response);
}
