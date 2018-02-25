import { createHash } from 'crypto';
import * as ElectronStore from 'electron-store';
import { lstatSync, pathExistsSync, readdir } from 'fs-extra';
import * as musicMetadata from 'music-metadata';
import { join } from 'path';

import { Music, validate } from '../shared';

import { LastfmApi } from './lastfm-api';
import { Logger } from './logger';

const logger = Logger.create('Browser');
const previewApi = LastfmApi.create();
const store = new ElectronStore();

export class Browser {

  static create(): Browser {
    return new Browser();
  }

  async getMusicList(folderPath: string): Promise<Music[]> {
    logger.info('Retrieve music list');

    if (!pathExistsSync(folderPath)) {
      throw new Error('Invalid path');
    }

    let musics: Music[];

    console.time('musicList');

    if (store.has('musicList')) {
      logger.debug('From cache');
      const musicList = store.get('musicList');
      musics = musicList.musics;
    } else {
      logger.debug('From file system');

      logger.info(`Lists musics from ${folderPath}`);
      console.time('listFiles');
      const musicPaths = (await this.listMusics(folderPath));
      console.timeEnd('listFiles');

      console.time('metadata');
      musics = await this.retrieveMetadata(musicPaths);
      console.timeEnd('metadata');

      console.time('lastfm');
      musics = await this.addImages(musics);
      console.timeEnd('lastfm');

      const md5 = createHash('md5').update(musicPaths.join('')).digest('hex');
      store.set('musicList', { md5, musics });

      logger.info('Music list updated');
    }

    console.timeEnd('musicList');

    return musics;
  }

  private constructor() {}

  private async getMusicInfo(path: string): Promise<any> {
    const { common, format } = await musicMetadata.parseFile(path);
    const { album, artist, artists, composer, disk, genre, title, track, year } = common;
    const { duration, sampleRate } = format;
    return { album, artist, artists, composer, disk, duration, genre, sampleRate, title, track, year };
  }

  private isSupported(path: string): boolean {
    return /\.(aac|aif|m4a|mp3|ogg|wav)$/i.test(path);
  }

  private async listMusics(path: string): Promise<string[]> {
    if (lstatSync(path).isDirectory()) {
      const res = [];

      const filePromises = (await readdir(path))
        .map(async dir => this.listMusics(join(path, dir)));

      (await Promise.all<string[][]>(filePromises))
        .forEach(a => res.push(...a));

      return res.filter(this.isSupported);
    }
    return [path];
  }

  private async addImages(musics: Music[]): Promise<Music[]> {
    const promises = [];
    let i = 0;

    const musicToAdd = musics.filter(music => !validate.string(music.imageUrl));

    for (const music of musicToAdd) {
      const promise = previewApi.getPreview(music)
        .then(imageUrl => {
          logger.debug(`addImages: ${++i}/${musicToAdd.length} ${imageUrl}`);

          if (validate.string(imageUrl)) {
            music.imageUrl = imageUrl;
          }
        })
        .catch(logger.error);

      promises.push(promise);
    }

    await Promise.all(promises);
    return musics;
  }

  private async retrieveMetadata(musicPaths: string[]): Promise<Music[]> {
    logger.info('Retrieves metadata');

    const res = [];
    let i = 0;

    for (const path of musicPaths) {
      try {
        const metadata = await this.getMusicInfo(path);
        res.push({ path, ...metadata });
      } catch (error) {
        logger.error(path, error);
      }
      logger.debug(`retrieveMetadata: ${++i}/${musicPaths.length}`);
    }

    return res;
  }
}
