import { Injectable } from '@angular/core';

import { Music } from '../../../../shared/interfaces';

import { Logger } from './logger';
import { NodeExecutorService } from './node-executor.service';

const logger = Logger.create('MusicManagerService');

@Injectable()
export class MusicManagerService {

  private musicListPromise: Promise<Music[]>;

  constructor(private nodeExecutorService: NodeExecutorService) {}

  async getMusicList(): Promise<Music[]> {
    logger.debug('getMusicList()');

    if (this.musicListPromise === undefined) {
      this.musicListPromise = this.nodeExecutorService.exec('browser', 'getMusicList', ['\\\\DISKSTATION\\music']);
    }
    return this.musicListPromise;
  }
}
