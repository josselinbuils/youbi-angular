import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { Music } from '../../../shared';

const ipc = window.require('ipc-promise');

@Injectable()
export class MusicManagerService {
  private activeMusicSubject: Subject<Music> = new Subject<Music>();
  private musicListPromise: Promise<Music[]>;

  onActiveMusicChange(): Observable<Music> {
    return this.activeMusicSubject;
  }

  async getMusicList(): Promise<Music[]> {
    if (this.musicListPromise === undefined) {
      this.musicListPromise = ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    }
    return this.musicListPromise;
  }

  setActiveMusic(music: Music): void {
    this.activeMusicSubject.next(music);
  }
}
