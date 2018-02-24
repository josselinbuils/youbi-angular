import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { Music, MusicMap } from '../../../shared';

const ipc = window.require('ipc-promise');

@Injectable()
export class MusicManagerService {
  private activeMusic: Music;
  private activeMusicSubject: Subject<Music> = new Subject<Music>();
  private musicMapPromise: Promise<MusicMap>;

  onActiveMusicChange(): Observable<Music> {
    return this.activeMusicSubject;
  }

  async getMusicMap(): Promise<MusicMap> {
    if (this.musicMapPromise === undefined) {
      this.musicMapPromise = ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    }
    return this.musicMapPromise;
  }

  setActiveMusic(music: Music): void {
    this.activeMusic = music;
    this.activeMusicSubject.next(music);
  }
}
