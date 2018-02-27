import { createHash } from 'crypto';
import * as ElectronStore from 'electron-store';
import { lstatSync, outputFileSync, pathExistsSync, readdir } from 'fs-extra';
import * as moment from 'moment';
import * as musicMetadata from 'music-metadata';
import { join } from 'path';

import { COVERS_FOLDER, Music, validate } from '../shared';

import { LastfmApi } from './lastfm-api';
import { Logger } from './logger';
import { Main } from './main';

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
      let musicPaths: string[];
      if (store.has('musicPaths')) {
        musicPaths = store.get('musicPaths');
      } else {
        musicPaths = (await this.listMusics(folderPath));
        store.set('musicPaths', musicPaths);
      }
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
    const { album, artist, artists, composer, disk, genre, picture, title, track, year } = common;
    const { duration, sampleRate } = format;
    return { album, artist, artists, composer, disk, duration, genre, picture, sampleRate, title, track, year };
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
      const picture = music.picture;

      if (picture !== undefined && picture[0] !== undefined) {
        try {
          const coversPath = join(Main.getAppDataPath(), COVERS_FOLDER);
          const coverName = `${music.artist} ${music.album} ${music.year}`;
          const coverFileName = `${coverName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${picture[0].format}`;
          const coverPath = join(coversPath, coverFileName);

          if (!pathExistsSync(coverPath)) {
            outputFileSync(coverPath, picture[0].data, 'binary');
          }

          music.imageUrl = `file:///${coverPath.replace(/\\/g, '/')}`;
          logger.debug(`addImages: ${++i}/${musicToAdd.length} ${music.imageUrl} (from file)`);
        } catch (error) {
          logger.error(error);
        }
      } else {
        const promise = previewApi.getPreview(music)
          .then(imageUrl => {
            logger.debug(`addImages: ${++i}/${musicToAdd.length} ${music.imageUrl} (from lastfm)`);

            if (validate.string(imageUrl)) {
              music.imageUrl = imageUrl;
            }
          })
          .catch(logger.error);

        promises.push(promise);
      }

      delete music.picture;
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
        const readableDuration = moment.utc(metadata.duration * 1000).format('mm:ss');
        res.push({ path, ...metadata, readableDuration });
      } catch (error) {
        logger.error(path, error);
      }
      logger.debug(`retrieveMetadata: ${++i}/${musicPaths.length}`);
    }

    return res;
  }
}
