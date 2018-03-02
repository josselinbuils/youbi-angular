import { Injectable } from '@angular/core';

import { Music } from '../../../shared';

import { Logger } from './logger.service';

const ipc = window.require('ipc-promise');

const logger = Logger.create('MusicManagerService');

@Injectable()
export class MusicManagerService {
  private musicListPromise: Promise<Music[]>;

  async getMusicList(): Promise<Music[]> {
    logger.debug('getMusicList()');

    if (this.musicListPromise === undefined) {
      this.musicListPromise = ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    }
    return this.musicListPromise;
  }
}
