import { createHash } from 'crypto';
import * as ElectronStore from 'electron-store';
import { lstatSync, pathExistsSync, readdir } from 'fs-extra';
import * as moment from 'moment';
import * as musicMetadata from 'music-metadata';
import { join } from 'path';
import * as sharp from 'sharp';

import { Music } from '../shared/interfaces';
import { validate } from '../shared/utils';

import { COVERS_FOLDER } from './constants';
import { LastfmApi } from './lastfm-api';
import { Logger } from './logger';
import { Main } from './main';

export class Browser {

  static create(): Browser {
    return new Browser(Logger.create('Browser'), LastfmApi.create(), new ElectronStore());
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
      this.logger.time('listFiles');
      let musicPaths: string[];
      if (this.store.has('musicPaths')) {
        musicPaths = this.store.get('musicPaths');
      } else {
        musicPaths = (await this.listMusics(folderPath));
        this.store.set('musicPaths', musicPaths);
      }
      this.logger.timeEnd('listFiles');

      this.logger.time('metadata');
      musics = await this.retrieveMetadata(musicPaths);
      this.logger.timeEnd('metadata');

      this.logger.time('covers');
      musics = await this.addImages(musics);
      this.logger.timeEnd('covers');

      const md5 = createHash('md5').update(musicPaths.join('')).digest('hex');
      this.store.set('musicList', { md5, musics });

      this.logger.info('Music list updated');
    }

    this.logger.timeEnd('musicList');

    return musics;
  }

  private constructor(private logger: Logger,
                      private previewApi: LastfmApi,
                      private store: ElectronStore) {
    logger.debug('constructor()');
  }

  private async getMusicInfo(path: string): Promise<any> {
    this.logger.debug('getMusicInfo():', path);
    const { common, format } = await musicMetadata.parseFile(path);
    const { album, artist, artists, composer, disk, genre, picture, title, track, year } = common;
    const { duration, sampleRate } = format;
    return { album, artist, artists, composer, disk, duration, genre, picture, sampleRate, title, track, year };
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

  private async addImages(musics: Music[]): Promise<Music[]> {
    this.logger.debug('addImages()');

    const promises = [];
    let i = 0;

    const musicToAdd = musics.filter(music => !validate.string(music.imageUrl));

    for (const music of musicToAdd) {
      const picture = music.picture;

      if (picture !== undefined && picture[0] !== undefined) {
        try {
          const coversPath = join(Main.getAppDataPath(), COVERS_FOLDER);
          const coverFileName = `${music.path.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.webp`;
          const coverPath = join(coversPath, coverFileName);

          if (!pathExistsSync(coverPath)) {
            await sharp(picture[0].data)
              .resize(220)
              .webp({ quality: 100 })
              .toFile(coverPath);
          }

          music.imageUrl = `file:///${coverPath.replace(/\\/g, '/')}`;
          this.logger.debug(`addImages: ${++i}/${musicToAdd.length} ${music.imageUrl} (from file)`);
        } catch (error) {
          this.logger.error(error);
        }
      } else {
        const promise = this.previewApi.getPreview(music)
          .then(imageUrl => {
            this.logger.debug(`addImages: ${++i}/${musicToAdd.length} ${music.imageUrl} (from lastfm)`);

            if (validate.string(imageUrl)) {
              music.imageUrl = imageUrl;
            }
          })
          .catch(this.logger.error);

        promises.push(promise);
      }

      delete music.picture;
    }

    await Promise.all(promises);
    return musics;
  }

  private async retrieveMetadata(musicPaths: string[]): Promise<Music[]> {
    this.logger.debug('retrieveMetadata()');

    const res = [];
    let i = 0;

    for (const path of musicPaths) {
      try {
        const metadata = await this.getMusicInfo(path);
        const readableDuration = moment.utc(metadata.duration * 1000).format('mm:ss');
        res.push({ path, ...metadata, readableDuration });
      } catch (error) {
        this.logger.error(path, error);
      }
      this.logger.debug(`retrieveMetadata: ${++i}/${musicPaths.length}`);
    }

    return res;
  }
}
