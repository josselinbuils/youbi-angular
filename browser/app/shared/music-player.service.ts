import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { Music, PlayerState } from '../../../shared';

const ipc = window.require('ipc-promise');

const STATE_UPDATE_INTERVAL = 60000;

@Injectable()
export class MusicPlayerService implements OnInit {

  private activeMusicSubject: Subject<Music> = new Subject<Music>();
  private activeMusic: Music;
  private playlist: Music[];
  private state: PlayerState;
  private stateSubject: BehaviorSubject<PlayerState> = new BehaviorSubject<PlayerState>(PlayerState.Stopped);
  private time: number;
  private timerId: number;
  private timeSubject: Subject<number> = new Subject<number>();

  getActiveMusic(): Music {
    return this.activeMusic;
  }

  ngOnInit(): void {
    setInterval(async () => this.updateState(), STATE_UPDATE_INTERVAL);
  }

  async next(): Promise<void> {
    let newIndex = this.playlist.indexOf(this.activeMusic) + 1;

    if (newIndex >= this.playlist.length) {
      newIndex = 0;
    }

    const music = this.playlist[newIndex];

    if (await this.getState() === PlayerState.Playing) {
      await this.playMusic(music);
    } else {
      this.setActiveMusic(music);
    }
  }

  onActiveMusicChange(): Observable<Music> {
    return this.activeMusicSubject;
  }

  onStateChange(): Observable<PlayerState> {
    return this.stateSubject;
  }

  onProgress(): Observable<number> {
    return this.timeSubject;
  }

  async pause(): Promise<void> {
    if (await this.getState() === PlayerState.Playing) {
      this.setState(await ipc.send('player', 'pause'));

      if (this.state === PlayerState.Paused) {
        this.stopTimer();
      } else {
        await this.stop();
      }
    } else {
      await this.stop();
    }
  }

  async play(musics?: Music[], index: number = 0): Promise<void> {
    if (musics !== undefined) {
      this.setPlaylist(musics);
    } else if (this.playlist === undefined) {
      throw new Error('No music to play');
    }
    await this.playMusic(this.playlist[index]);
  }

  async prev(): Promise<void> {
    let newIndex: number = this.playlist.indexOf(this.activeMusic) - 1;

    if (newIndex < 0) {
      newIndex = this.playlist.length - 1;
    }

    const music = this.playlist[newIndex];

    if (await this.getState() === PlayerState.Playing) {
      await this.playMusic(music);
    } else {
      this.setActiveMusic(music);
    }
  }

  async resume(): Promise<void> {
    if (await this.getState() === PlayerState.Paused) {
      this.setState(await ipc.send('player', 'resume'));

      if (this.state === PlayerState.Playing) {
        this.startTimer();
      } else {
        await this.stop();
      }
    } else {
      await this.stop();
    }
  }

  async seek(timeSeconds: number): Promise<void> {
    if (await this.getState() === PlayerState.Playing) {
      this.setState(await ipc.send('player', { name: 'seek', args: [timeSeconds] }));

      if (this.state === PlayerState.Playing) {
        this.time = timeSeconds;
        this.timeSubject.next(this.time);
      } else {
        await this.stop();
      }
    } else {
      await this.stop();
    }
  }

  setActiveMusic(music: Music): void {
    this.activeMusic = music;
    this.activeMusicSubject.next(this.activeMusic);
  }

  setPlaylist(musics: Music[]): void {
    this.playlist = musics;
    this.setActiveMusic(musics[0]);
  }

  async stop(): Promise<void> {
    this.stopTimer();
    this.time = 0;
    this.timeSubject.next(this.time);

    if (await this.getState() !== PlayerState.Stopped) {
      this.setState(await ipc.send('player', 'stop'));
    }
  }

  private async getState(): Promise<PlayerState> {
    return ipc.send('player', 'getState');
  }

  private async playMusic(music: Music): Promise<void> {

    if (await this.getState() === PlayerState.Playing) {
      await this.stop();
    }

    if (this.activeMusic !== music) {
      this.setActiveMusic(music);
    }

    this.time = 0;
    this.setState(await ipc.send('player', { name: 'play', args: [this.activeMusic.path] }));

    if (this.state === PlayerState.Playing) {
      this.startTimer();
    }
  }

  private setState(state: PlayerState): void {
    if (this.stateSubject.getValue() !== state) {
      console.log('State:', state);
      this.state = state;
      this.stateSubject.next(state);
    }
  }

  private startTimer(): void {
    this.timerId = window.setInterval(async () => {
      this.time++;

      // Should be done in the node player, find a way!
      if (this.time >= (this.activeMusic.duration - 1)) {
        if (this.playlist.indexOf(this.activeMusic) < (this.playlist.length - 1)) {
          await this.next();
        } else {
          await this.stop();
          await this.next();
        }
      } else {
        this.timeSubject.next(this.time);
      }

    }, 1000);
  }

  private stopTimer(): void {
    window.clearInterval(this.timerId);
  }

  private async updateState(): Promise<void> {
    this.setState(await this.getState());
  }
}
