import * as request from 'request-promise-native';

import { validate } from '../shared';

import { LASTFM_API_KEY } from './config';
import { Logger } from './logger';
import { PromiseQueue } from './promise-queue';

const logger = Logger.create('LastfmApi');
const queue = PromiseQueue.create(5);

export class LastfmApi {

  private readonly uri = 'http://ws.audioscrobbler.com/2.0';

  static create(): LastfmApi {
    return new LastfmApi();
  }

  async getAlbumPreview(album: string, artist?: string): Promise<string | undefined> {
    const options = this.getBaseRequest();

    options.qs.method = 'album.search';
    options.qs.album = `${encodeURIComponent(artist)} ${encodeURIComponent(album)}`;

    try {
      return queue
        .enqueue(() => request(options))
        .then(response => {
          const matches = response.results.albummatches.album;

          if (validate.array(matches)) {
            const res = matches.filter(r => validate.string(r.image[0]['#text']))[0];
            return res !== undefined ? res.image[res.image.length - 1]['#text'] : undefined;
          }
        });
    } catch (error) {
      logger.error(error);
    }
  }

  private getBaseRequest(): any {
    return {
      uri: this.uri,
      qs: {
        api_key: LASTFM_API_KEY,
        format: 'json',
      },
      json: true,
    };
  }
}
