import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs';
import stream from 'stream';
import util from 'util';

import { Options } from './options';

const pipeline = util.promisify(stream.pipeline);

export default class HttpClient {
  options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  async getJson(url: string) {
    const { data } = await axios.get(url, this.getHttpOptions());
    return data;
  }

  async downloadFile(url: string, savePath: fs.PathLike) {
    const { data: httpRequest } = await axios.get(url, {
      ...this.getHttpOptions(),
      responseType: 'stream',
    });
    return pipeline(httpRequest, fs.createWriteStream(savePath));
  }

  getHttpOptions(): AxiosRequestConfig {
    const options = this.options.http || {};
    return {
      ...options,
      headers: {
        'User-Agent': 'auto-updater 1.0',
        ...options.headers,
      },
    };
  }
}
