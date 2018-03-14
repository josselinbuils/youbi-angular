import { Injectable } from '@angular/core';

import { Music } from '../../../../shared/interfaces';

import { Logger } from './logger';
import { NodeExecutorService } from './node-executor.service';

const logger = Logger.create('MusicManagerService');

@Injectable()
export class MusicManagerService {

  private coverCache: { [coverKey: string]: string } = {};
  private musicListPromise: Promise<Music[]>;

  constructor(private nodeExecutorService: NodeExecutorService) {}

  async getCoverDataURL(hash: string): Promise<string | undefined> {
    logger.debug('getCoverDataURL()');

    if (this.coverCache[hash] !== undefined) {
      return this.coverCache[hash];
    } else {
      const coverURL = await this.nodeExecutorService.exec('browser', 'getCoverDataURL', [hash]);
      this.coverCache[hash] = coverURL;
      return coverURL;
    }
  }

  async getMusicList(): Promise<Music[]> {
    logger.debug('getMusicList()');

    if (this.musicListPromise === undefined) {
      this.musicListPromise = this.nodeExecutorService.exec('browser', 'getMusicList', ['\\\\DISKSTATION\\music']);
    }
    return this.musicListPromise;
  }

  async retrieveCovers(musics: Music[]): Promise<void> {
    logger.debug('retrieveCovers()');

    for (const music of musics) {
      const { coverKey } = music;

      if (music.coverURL === undefined && coverKey !== undefined) {
        if (this.coverCache[coverKey] === undefined) {
          this.coverCache[coverKey] = await this.nodeExecutorService.exec('browser', 'getCoverDataURL', [music.coverKey]);
        }
        music.coverURL = this.coverCache[coverKey];
      }
    }
  }
}
