import { Injectable } from '@angular/core';

import { MusicMap } from '../../../shared/music-map';

const ipc = window.require('ipc-promise');

@Injectable()
export class MusicManagerService {
  private musicMap: MusicMap;

  async getMusicMap(): Promise<MusicMap> {
    if (this.musicMap === undefined) {
      this.musicMap = await ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    }
    return this.musicMap;
  }
}
