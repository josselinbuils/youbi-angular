import { Injectable } from '@angular/core';

import { Music } from '../../../shared';

const ipc = window.require('ipc-promise');

@Injectable()
export class MusicManagerService {
  private musicListPromise: Promise<Music[]>;

  async getMusicList(): Promise<Music[]> {
    if (this.musicListPromise === undefined) {
      this.musicListPromise = ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    }
    return this.musicListPromise;
  }
}
