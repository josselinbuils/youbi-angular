import { createHash } from 'crypto';
import * as DataURI from 'datauri';
import { lstatSync, pathExistsSync, readdir } from 'fs-extra';
import * as jimp from 'jimp';
import * as moment from 'moment';
import * as musicMetadata from 'music-metadata';
import { join } from 'path';
import 'source-map-support/register';

import { Music } from '../shared/interfaces';
import { validate } from '../shared/utils';

import { LastfmApi } from './lastfm-api';
import { Logger } from './logger';
import { Store } from './store';

export class Browser {

  private covers: { [hash: string]: string };
  private dataURI: DataURI;

  static create(): Browser {
    return new Browser(Logger.create('Browser'), LastfmApi.create(), Store.getInstance());
  }

  getCoverDataURL(hash: string): string | undefined {
    this.logger.debug('getCoverDataURL():', hash);
    return this.covers[hash];
  }

  async getMusicList(folderPath: string): Promise<Music[]> {
    this.logger.debug('getMusicList()');

    if (!pathExistsSync(folderPath)) {
      throw new Error('Invalid path');
    }

    let musics: Music[];

    this.logger.time('musicList');

    if (this.store.has('musicList')) {
      this.logger.debug('From cache');
      const musicList = this.store.get('musicList');
      musics = musicList.musics;
    } else {
      this.logger.debug('From file system');

      this.logger.info(`Lists musics from ${folderPath}`);
      this.logger.time('listsMusics');
      let musicPaths: string[];
      if (this.store.has('musicPaths')) {
        musicPaths = this.store.get('musicPaths');
      } else {
        musicPaths = (await this.listMusics(folderPath));
        this.store.set('musicPaths', musicPaths);
      }
      this.logger.timeEnd('listsMusics');

      const startTime = Date.now();
      let i = 0;
      musics = [];

      this.covers = {};
      this.dataURI = new DataURI();

      this.logger.time('processesMusics');
      for (const path of musicPaths) {
        let remainingTime = '';

        if (i > 0) {
          const now = Date.now();
          const endTime = now + (musicPaths.length - i) * (now - startTime) / i;
          remainingTime = ` (${moment().to(endTime, true)} remaining)`;
        }

        this.logger.debug(`Processes music ${++i}/${musicPaths.length}${remainingTime}`);

        const music = await this.getMusicInfo(path);
        await this.generateCover(music);
        delete music.picture;
        musics.push(music);
      }
      this.logger.timeEnd('processesMusics');

      const md5 = createHash('md5').update(musicPaths.join('')).digest('hex');
      this.store.set('musicList', { md5, musics });
      this.store.set('covers', this.covers);

      this.logger.info('Music list updated');
    }
    this.logger.timeEnd('musicList');

    return musics;
  }

  private constructor(private logger: Logger,
                      private previewApi: LastfmApi,
                      private store: Store) {

    logger.debug('constructor()');
    this.covers = store.has('covers') ? store.get('covers') : {};
  }

  private async generateCover(music: Music): Promise<void> {
    const { picture } = music;

    try {
      if (picture !== undefined && picture[0] !== undefined) {
        const hash = createHash('md5').update(picture[0].data).digest('hex');

        if (this.covers[hash] === undefined) {
          const coverData = await new Promise<any>(async resolve => {
            (await jimp.read(picture[0].data))
              .resize(220, 220)
              .quality(85)
              .getBuffer('image/jpeg', (error, buffer) => {
                if (error instanceof Error) {
                  throw error;
                }
                resolve(buffer);
              });
          });
          this.covers[hash] = this.dataURI.format('.jpg', coverData).content;
        }
        music.coverKey = hash;

      } else {
        const coverURL = await this.previewApi.getPreview(music);

        if (validate.string(coverURL)) {
          music.coverURL = coverURL;
        }
      }
    } catch (error) {
      this.logger.error(`Unable to generate preview: ${error.stack}`);
    }
  }

  private async getMusicInfo(path: string): Promise<any> {
    const { common, format } = await musicMetadata.parseFile(path);
    const { album, albumartist, artist, artists, comment, composer, disk, genre, picture, title, track, year } = common;
    const { duration, sampleRate } = format;
    const readableDuration = moment.utc(duration * 1000).format('mm:ss');
    return {
      album, albumArtist: albumartist, artist, artists, comment, composer, disk, duration, genre, path, picture, readableDuration,
      sampleRate, title, track, year,
    };
  }

  private isSupported(path: string): boolean {
    return /\.(aac|aif|m4a|mp3|ogg|wav)$/i.test(path);
  }

  private async listMusics(path: string): Promise<string[]> {
    this.logger.debug('listMusics():', path);

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
}
