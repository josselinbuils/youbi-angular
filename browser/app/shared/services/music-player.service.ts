import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { PlayerState } from '../../../../shared/constants';
import { Music } from '../../../../shared/interfaces';

import { Logger } from './logger';

const ipc = window.require('ipc-promise');

const STATE_UPDATE_INTERVAL = 60000;

const logger = Logger.create('MusicPlayerService');

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
    logger.debug('getActiveMusic()');
    return this.activeMusic;
  }

  getCurrentTime(): number {
    logger.debug('getCurrentTime()');
    return this.time;
  }

  /**
   * Gets and updates player state.
   */
  async getState(): Promise<PlayerState> {
    logger.debug('getState()');
    const state = await ipc.send('player', 'getState');
    logger.debug('getState:', state);
    this.setState(state);
    return state;
  }

  async ngOnInit(): Promise<void> {
    logger.debug('ngOnInit()');
    await this.getState();
    setInterval(async () => this.getState(), STATE_UPDATE_INTERVAL);
  }

  async next(): Promise<void> {
    logger.debug('next()');

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
    logger.debug('pause()');

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

  async play(musics?: Music[], index?: number): Promise<void> {
    logger.debug('play()');

    if (musics !== undefined) {
      this.setPlaylist(musics);
    } else if (this.playlist === undefined) {
      throw new Error('No music to play');
    } else if (this.activeMusic !== undefined && index === undefined) {
      index = this.playlist.indexOf(this.activeMusic);
    }

    if (index === undefined) {
      index = 0;
    }

    await this.playMusic(this.playlist[index]);
  }

  async prev(): Promise<void> {
    logger.debug('prev()');

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
    logger.debug('setActiveMusic()');

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
    logger.debug(`seek(): ${timeSeconds}s`);

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
    logger.debug('setActiveMusic()');
    this.activeMusic = music;
    this.activeMusicSubject.next(this.activeMusic);
  }

  setPlaylist(musics: Music[]): void {
    logger.debug('setPlaylist()');
    this.playlist = musics;
    this.setActiveMusic(musics[0]);
  }

  async stop(): Promise<void> {
    logger.debug('stop()');

    this.stopTimer();
    this.time = 0;
    this.timeSubject.next(this.time);

    if (await this.getState() !== PlayerState.Stopped) {
      this.setState(await ipc.send('player', 'stop'));
    }
  }

  private async playMusic(music: Music): Promise<void> {
    logger.debug('playMusic()');

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
    } else {
      await this.stop();
    }
  }

  private setState(state: PlayerState): void {
    if (this.stateSubject.getValue() !== state) {
      logger.debug('setState():', state);
      this.state = state;
      this.stateSubject.next(state);
    }
  }

  private startTimer(): void {
    logger.debug('startTimer()');

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
    logger.debug('stopTimer()');
    window.clearInterval(this.timerId);
  }
}
