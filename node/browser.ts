import { createHash } from 'crypto';
import * as ElectronStore from 'electron-store';
import { lstatSync, pathExistsSync, readdir } from 'fs-extra';
import * as musicMetadata from 'music-metadata';
import { join } from 'path';

import { Music } from '../shared/music';
import { MusicMap } from '../shared/music-map';
import { validate } from '../shared/utils';

import { LastfmApi } from './lastfm-api';
import { Logger } from './logger';

const UNKNOWN = 'Unknown';

const api = LastfmApi.create();
const logger = Logger.create('Browser');
const store = new ElectronStore();

export class Browser {

  static create(): Browser {
    return new Browser();
  }

  async getMusicList(folderPath: string): Promise<MusicMap> {
    logger.info('Retrieve music list');

    if (!pathExistsSync(folderPath)) {
      throw new Error('Invalid path');
    }

    let musicMap: MusicMap;

    console.time('musicList');

    if (store.has('musicList')) {
      logger.debug('From cache');
      musicMap = store.get('musicList').musicMap;
    } else {
      logger.debug('From file system');

      logger.info(`Lists musics from ${folderPath}`);
      console.time('listFiles');
      const musicPaths = (await this.listMusics(folderPath)).slice(0, 100);
      console.timeEnd('listFiles');

      console.time('metadata');
      const musics = await this.retrieveMetadata(musicPaths);
      console.timeEnd('metadata');

      musicMap = this.getMap(musics);

      console.time('lastfm');
      musicMap = await this.addImages(musicMap);
      console.timeEnd('lastfm');

      const md5 = createHash('md5').update(musicPaths.join('')).digest('hex');
      store.set('musicList', { md5, musicMap });

      logger.info('Music list updated');
    }

    console.timeEnd('musicList');

    return musicMap;
  }

  private constructor() {}

  private getMap(musics: Music[]): MusicMap {
    const map = {};

    musics.forEach(music => {
      const artist = validate.string(music.artist) ? music.artist : UNKNOWN;
      const album = validate.string(music.album) ? music.album : UNKNOWN;

      if (map[artist] === undefined) {
        map[artist] = {};
      }

      if (map[album] === undefined) {
        map[artist][album] = [];
      }

      map[artist][album].push(music);
    });

    return map;
  }

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

  private async addImages(musicMap: MusicMap): Promise<MusicMap> {
    const promises = [];

    for (const artist in musicMap) {
      if (musicMap.hasOwnProperty(artist) && artist !== UNKNOWN) {
        for (const album in musicMap[artist]) {
          if (musicMap[artist].hasOwnProperty(album) && album !== UNKNOWN) {
            const promise = api.getAlbumPreview(album, artist)
              .then(imageUrl => {
                if (validate.string(imageUrl)) {
                  musicMap[artist][album].forEach(music => music.imageUrl = imageUrl);
                }
              });

            promises.push(promise);
          }
        }
      }
    }

    await Promise.all(promises);
    return musicMap;
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
      logger.debug(`${++i}/${musicPaths.length}`);
    }

    return res;
  }
}
