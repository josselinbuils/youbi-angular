import { Injectable } from '@angular/core';

import { Music } from './music';

const ipc = window.require('ipc-promise');

@Injectable()
export class MusicListService {
  private musicList?: Music[];

  async getList(): Promise<Music[]> {
    if (this.musicList === undefined) {
      this.musicList = await ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    }
    return this.musicList;
  }
}
